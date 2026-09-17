/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: EVENT BUS & SDCP-001 CAPABILITY ARBITER
 * Document Identifier: VSRP-001-EVENT-BUS
 * Governing Protocol:  VSRP-001 / SDCP-001
 * Authority:           Host SSOT
 * Timestamp:           2026-09-07T10:23:32Z
 * Index Anchor:        PRS-001
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Domain Type Contracts & JSDoc Schemas
 *   [SEC-02] Synchronous Event Broker & Subscriber State
 *   [SEC-03] SDCP-001 Semantic Capability Registry & Verification
 *   [SEC-04] Faraday-Protected Snapshot Evaluation & Settlement
 *   [SEC-05] Global Environment & CommonJS Export
 * ============================================================================
 */

const EmberlightEventBus = (() => {
	//#region [SEC-01] Domain Type Contracts & JSDoc Schemas
	/**
	 * @callback EventCallback
	 * @param {any} [payload] - Event payload data.
	 * @returns {void}
	 */

	/**
	 * @callback UnsubscribeHandle
	 * @returns {void}
	 */

	/**
	 * @typedef {Object} CapabilityAttestation
	 * @property {boolean} authorized - Authorization assertion flag.
	 * @property {string} [reason] - Failure reason string if unauthorized.
	 */

	/**
	 * @callback CapabilityEvaluate
	 * @param {any} payload - Action or event payload.
	 * @param {Record<string, any>} readOnlySnapshot - Faraday-protected session snapshot.
	 * @returns {CapabilityAttestation} Capability evaluation attestation.
	 */

	/**
	 * @typedef {Object} CapabilityProvider
	 * @property {CapabilityEvaluate} evaluate - Evaluation function contract.
	 */

	/**
	 * @callback CapabilitySettlement
	 * @param {string} token - Capability token.
	 * @param {any} payload - Action payload.
	 * @param {CapabilityAttestation} attestation - Evaluation attestation.
	 * @returns {CapabilityExecutionResult} Settlement result envelope.
	 */

	/**
	 * @typedef {Object} CapabilityExecutionResult
	 * @property {boolean} success - Execution success flag.
	 * @property {string} [reason] - Failure reason token.
	 * @property {CapabilityAttestation} [attestation] - Evaluated attestation.
	 */
	//#endregion

	//#region [SEC-02] Synchronous Event Broker & Subscriber State
	/** @type {Record<string, EventCallback[]>} */
	const subscribers = {};
	/** @type {Map<string, CapabilityProvider>} */
	const capabilities = new Map();
	let capabilitiesSealed = false;
	/** @type {Array<{ event: string, payload: any }>} */
	const dispatchQueue = [];
	let isDispatching = false;

	const EventBus = {
		subscribers,

		/**
		 * Subscribes a callback function to an event channel.
		 * [State Mutating]
		 * @template {string & keyof EmberlightEventMap} T
		 * @param {T} event - Target event name token.
		 * @param {(payload: EmberlightEventMap[T]) => void} callback - Event handler function.
		 * @returns {UnsubscribeHandle} Unsubscribe cleanup handle.
		 */
		subscribe(event, callback) {
			const channel = String(event);
			if (!subscribers[channel]) subscribers[channel] = [];
			subscribers[channel].push(callback);
			return () => {
				EventBus.unsubscribe(channel, callback);
			};
		},

		/**
		 * Unsubscribes a callback function from an event channel.
		 * [State Mutating]
		 * @param {string} event - Target event name token.
		 * @param {EventCallback} callback - Event handler function.
		 * @returns {void}
		 */
		unsubscribe(event, callback) {
			if (!subscribers[event]) return;
			subscribers[event] = subscribers[event].filter((cb) => cb !== callback);
			if (subscribers[event].length === 0) {
				delete subscribers[event];
			}
		},

		/**
		 * Clears all subscribers for a given event or clears entire subscriber registry.
		 * [State Mutating]
		 * @param {string} [event] - Optional specific event channel.
		 * @returns {void}
		 */
		clear(event) {
			if (event) {
				delete subscribers[event];
			} else {
				Object.keys(subscribers).forEach((k) => {
					delete subscribers[k];
				});
			}
		},

		/**
		 * Returns active listener count for a specific event or total count across all channels.
		 * [Pure Query]
		 * @param {string} [event] - Optional specific event channel.
		 * @returns {number} Active listener count.
		 */
		getListenerCount(event) {
			if (event) {
				return subscribers[event]?.length || 0;
			}
			return Object.values(subscribers).reduce(
				(total, arr) => total + (arr?.length || 0),
				0,
			);
		},

		/**
		 * Publishes an event payload to all registered subscribers.
		 * Supports re-entrant dispatch queuing and error boundary protection.
		 * [State Mutating / Execution Dispatch]
		 * @template {string & keyof EmberlightEventMap} T
		 * @param {T} event - Target event name token.
		 * @param {EmberlightEventMap[T]} [payload] - Event payload matching topic schema.
		 * @returns {void}
		 */
		publish(event, payload) {
			if (!event || typeof event !== "string") return;
			dispatchQueue.push({ event, payload });
			if (isDispatching) return;

			isDispatching = true;
			try {
				while (dispatchQueue.length > 0) {
					const next = dispatchQueue.shift();
					if (!next) continue;
					const ev = next.event;
					const data = next.payload;
					if (!subscribers[ev]) continue;

					const callbacks = subscribers[ev].slice();
					for (const element of callbacks) {
						try {
							element(data);
						} catch (err) {
							console.error(
								`[EventBus] Error executing subscriber for "${ev}":`,
								err,
							);
						}
					}
				}
			} finally {
				isDispatching = false;
			}
		},

		/**
		 * Formats a typed PMIP-001 event envelope.
		 * [Pure Query / Factory]
		 * @param {string} topic - Topic namespace token.
		 * @param {string} source - Originating driver/tenant id.
		 * @param {any} payload - Encapsulated payload DTO.
		 * @param {number} [tick=0] - Current simulation step tick.
		 * @returns {Object} Canonical PMIP-001 event envelope.
		 */
		createEnvelope(topic, source, payload, tick = 0) {
			return Object.freeze({
				topic: String(topic),
				source: String(source),
				tick: Number(tick) || 0,
				timestamp: Date.now(),
				payload: payload !== undefined ? payload : null,
			});
		},
		//#endregion

		//#region [SEC-03] SDCP-001 Semantic Capability Registry & Verification
		/**
		 * Registers a semantic capability provider definition.
		 * [State Mutating]
		 * @param {string} token - Capability identifier token.
		 * @param {CapabilityProvider} providerDef - Provider definition object.
		 * @returns {void}
		 */
		registerCapability(token, providerDef) {
			if (capabilitiesSealed) {
				throw new Error(
					`[SDCP-001] Registration Error: Capability bus is sealed. Cannot register "${token}".`,
				);
			}
			if (capabilities.has(token)) {
				throw new Error(
					`[SDCP-001] Token Collision: "${token}" is already registered.`,
				);
			}
			if (!providerDef || typeof providerDef.evaluate !== "function") {
				throw new TypeError(
					`[SDCP-001] Provider for "${token}" must export an evaluate() function.`,
				);
			}
			capabilities.set(token, providerDef);
		},

		/**
		 * Permanently seals the capability registry against further registrations.
		 * [State Mutating]
		 * @returns {void}
		 */
		sealCapabilities() {
			capabilitiesSealed = true;
		},

		/**
		 * Checks if capability bus is sealed.
		 * [Pure Query]
		 * @returns {boolean} Sealing state flag.
		 */
		isSealed() {
			return capabilitiesSealed;
		},

		/**
		 * Checks if a capability token is registered.
		 * [Pure Query]
		 * @param {string} token - Capability identifier token.
		 * @returns {boolean} Presence assertion flag.
		 */
		hasCapability(token) {
			return capabilities.has(token);
		},

		/**
		 * Retrieves registered capability provider definition.
		 * [Pure Query]
		 * @param {string} token - Capability identifier token.
		 * @returns {CapabilityProvider|undefined} Provider definition or undefined.
		 */
		getCapability(token) {
			return capabilities.get(token);
		},

		/**
		 * Retrieves all registered capability tokens.
		 * [Pure Query]
		 * @returns {string[]} Array of capability tokens.
		 */
		getRegisteredTokens() {
			return Array.from(capabilities.keys());
		},
		//#endregion

		//#region [SEC-04] Faraday-Protected Snapshot Evaluation & Settlement
		/**
		 * Executes a registered capability through Faraday-protected evaluation and settlement.
		 * [State Mutating / Evaluation Gateway]
		 * @param {string} token - Capability identifier token.
		 * @param {any} payload - Action payload.
		 * @param {Record<string, any>} [contextSnapshot] - Optional explicit session snapshot.
		 * @param {CapabilitySettlement} [settleCallback] - Optional settlement callback.
		 * @returns {CapabilityExecutionResult} Execution result envelope.
		 */
		executeCapability(token, payload, contextSnapshot, settleCallback) {
			const provider = capabilities.get(token);
			if (!provider) {
				return { success: false, reason: `UNREGISTERED_CAPABILITY: ${token}` };
			}

			// 1. EVALUATION (Faraday-Protected Snapshot - Read Only)
			let sessionStore;
			if (typeof window !== "undefined" && window.EmberlightSessionStore) {
				sessionStore = window.EmberlightSessionStore;
			} else if (typeof globalThis !== "undefined" && (/** @type {any} */ (globalThis)).EmberlightSessionStore) {
				sessionStore = (/** @type {any} */ (globalThis)).EmberlightSessionStore;
			}

			/** @type {Record<string, any>} */
			const snapshot =
				contextSnapshot ||
				(sessionStore && typeof sessionStore.getSnapshot === "function"
					? sessionStore.getSnapshot()
					: {});

			const readOnlySnapshot = {
				party: (snapshot.party || []).map((/** @type {{ id: any; name: any; alive: any; mp: any; unlocked: any; unlockedNodes: any; }} */ c) => ({
					id: c.id,
					name: c.name,
					alive: c.alive,
					mp: c.mp,
					unlocked: Array.isArray(c.unlocked) ? [...c.unlocked] : [],
					unlockedNodes: Array.isArray(c.unlockedNodes)
						? [...c.unlockedNodes]
						: [],
				})),
				inventory: { ...snapshot.inventory },
				flags: { ...snapshot.flags },
			};

			const attestation = provider.evaluate(payload, readOnlySnapshot);
			if (!attestation?.authorized) {
				const failureReason = attestation?.reason || "NOT_AUTHORIZED";
				return { success: false, reason: failureReason };
			}

			// 2. SETTLEMENT (Delegated to Host Settlement Callback / Session Store)
			if (typeof settleCallback === "function") {
				return settleCallback(token, payload, attestation);
			}

			return { success: true, attestation };
		},
	};

	return EventBus;
	//#endregion
})();

//#region [SEC-05] Global Environment & CommonJS Export
if (typeof window !== "undefined") {
	window.EmberlightEventBus = EmberlightEventBus;
}
if (typeof module !== "undefined" && module.exports) {
	module.exports = EmberlightEventBus;
}
//#endregion
