/* =========================================================================
   EMBERLIGHT EVENT BUS & SDCP-001 CAPABILITY ARBITER
   -------------------------------------------------------------------------
   Document Identifier: VSRP-001-EVENT-BUS
   Protocol Version:    VSRP-001 / SDCP-001
   Classification:      Synchronous Event Broker & Semantic Capability Engine
   Index Anchor:        PRS-001
   ========================================================================= */

const EmberlightEventBus = (() => {
  'use strict';

  const subscribers = {};
  const capabilities = new Map();
  let capabilitiesSealed = false;

  const EventBus = {
    subscribers,

    subscribe(event, callback) {
      if (!subscribers[event]) subscribers[event] = [];
      subscribers[event].push(callback);
      return () => {
        EventBus.unsubscribe(event, callback);
      };
    },

    unsubscribe(event, callback) {
      if (!subscribers[event]) return;
      subscribers[event] = subscribers[event].filter((cb) => cb !== callback);
      if (subscribers[event].length === 0) {
        delete subscribers[event];
      }
    },

    clear(event) {
      if (event) {
        delete subscribers[event];
      } else {
        Object.keys(subscribers).forEach((k) => {
          delete subscribers[k];
        });
      }
    },

    publish(event, payload) {
      if (!subscribers[event]) return;
      subscribers[event].forEach((cb) => {
        try {
          cb(payload);
        } catch (err) {
          console.error(`[EventBus] Error executing subscriber for "${event}":`, err);
        }
      });
    },

    // --- SDCP-001 Semantic Capability Registry & Verification ---
    registerCapability(token, providerDef) {
      if (capabilitiesSealed) {
        throw new Error(`[SDCP-001] Registration Error: Capability bus is sealed. Cannot register "${token}".`);
      }
      if (capabilities.has(token)) {
        throw new Error(`[SDCP-001] Token Collision: "${token}" is already registered.`);
      }
      if (!providerDef || typeof providerDef.evaluate !== 'function') {
        throw new TypeError(`[SDCP-001] Provider for "${token}" must export an evaluate() function.`);
      }
      capabilities.set(token, providerDef);
    },

    sealCapabilities() {
      capabilitiesSealed = true;
    },

    isSealed() {
      return capabilitiesSealed;
    },

    hasCapability(token) {
      return capabilities.has(token);
    },

    getCapability(token) {
      return capabilities.get(token);
    },

    getRegisteredTokens() {
      return Array.from(capabilities.keys());
    },

    executeCapability(token, payload, contextSnapshot, settleCallback) {
      const provider = capabilities.get(token);
      if (!provider) {
        return { success: false, reason: `UNREGISTERED_CAPABILITY: ${token}` };
      }

      // 1. EVALUATION (Faraday-Protected Snapshot - Read Only)
      const snapshot = contextSnapshot || (typeof EmberlightSessionStore !== 'undefined'
        ? EmberlightSessionStore.getSnapshot()
        : {});

      const readOnlySnapshot = {
        party: (snapshot.party || []).map((c) => ({
          id: c.id,
          name: c.name,
          alive: c.alive,
          mp: c.mp,
          unlocked: Array.isArray(c.unlocked) ? [...c.unlocked] : [],
          unlockedNodes: Array.isArray(c.unlockedNodes) ? [...c.unlockedNodes] : [],
        })),
        inventory: { ...(snapshot.inventory || {}) },
        flags: { ...(snapshot.flags || {}) },
      };

      const attestation = provider.evaluate(payload, readOnlySnapshot);
      if (!attestation?.authorized) {
        const failureReason = attestation?.reason || 'NOT_AUTHORIZED';
        return { success: false, reason: failureReason };
      }

      // 2. SETTLEMENT (Delegated to Host Settlement Callback / Session Store)
      if (typeof settleCallback === 'function') {
        return settleCallback(token, payload, attestation);
      }

      return { success: true, attestation };
    },
  };

  return EventBus;
})();

if (typeof window !== 'undefined') {
  window.EmberlightEventBus = EmberlightEventBus;
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = EmberlightEventBus;
}
