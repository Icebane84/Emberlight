/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: EVENT BUS & SDCP-001 CAPABILITY ARBITER
 * Document Identifier: VSRP-001-EVENT-BUS
 * Governing Protocol:  VSRP-001 / SDCP-001
 * Authority:           Host SSOT
 * Timestamp:           2026-09-08T12:20:00Z
 * Index Anchor:        PRS-001
 * ============================================================================
 */

const EmberlightEventBus = (() => {
  'use strict';

  const subscribers = Object.create(null);
  const capabilities = new Map();
  let capabilitiesSealed = false;

  function assertEventToken(event) {
    if (typeof event !== 'string' || event.length === 0) {
      throw new TypeError('[EventBus] event must be a non-empty string.');
    }
  }

  const EventBus = {
    subscribe(event, callback) {
      assertEventToken(event);
      if (typeof callback !== 'function') {
        throw new TypeError(`[EventBus] subscriber for "${event}" must be a function.`);
      }
      if (!subscribers[event]) subscribers[event] = [];
      subscribers[event].push(callback);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        EventBus.unsubscribe(event, callback);
      };
    },

    unsubscribe(event, callback) {
      assertEventToken(event);
      if (!subscribers[event]) return;
      subscribers[event] = subscribers[event].filter((cb) => cb !== callback);
      if (subscribers[event].length === 0) delete subscribers[event];
    },

    clear(event) {
      if (event !== undefined) {
        assertEventToken(event);
        delete subscribers[event];
        return;
      }
      Object.keys(subscribers).forEach((key) => delete subscribers[key]);
    },

    publish(event, payload) {
      assertEventToken(event);
      const listeners = subscribers[event];
      if (!listeners || listeners.length === 0) return;

      // Snapshot the listener list so unsubscription during dispatch cannot
      // alter the current dispatch cycle. Listener failures intentionally
      // propagate to the host; swallowing them makes architectural failures
      // invisible to Sentinel and violates the host error-channel contract.
      listeners.slice().forEach((callback) => callback(payload));
    },

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

      if (typeof settleCallback === 'function') {
        return settleCallback(token, payload, attestation);
      }

      return { success: true, attestation };
    },
  };

  if (typeof window !== 'undefined') {
    window.EmberlightEventBus = EventBus;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = EventBus;
  }

  return EventBus;
})();
