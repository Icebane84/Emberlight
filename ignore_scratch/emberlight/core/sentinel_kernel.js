/* ==========================================================================
	 FILE: core/sentinel_kernel.js
	 ROLE: SDCP-001 Authority & Reference Monitor (Staging Membrane)
	 ========================================================================== */
window._SentinelInternal = window._SentinelInternal || {};

(() => {
	class SentinelKernel {
		#rootSecret = Symbol("SENTINEL_ROOT_SECRET");
		#registry = new Map();
		#eventBus;
		#currentEpoch = 1;

		static DOMAIN_MAP = {
			SPATIAL: ["world:", "spatial:", "journal:"],
			COMBAT: ["combat:"],
			LOGISTICS: ["settlement:", "logistics:"],
			SENSORY: ["sensory:", "audio:"],
		};

		static REQUIRED_PERMS = {
			"spatial:traverse": 0x0001,
			"spatial:mutate_terrain": 0x0002,
			"world:mutate_tile": 0x0002,
			"journal:chalk_mark": 0x0004,
			"combat:action": 0x1000,
			"logistics:tick": 0x10000,
		};

		constructor(eventBus) {
			this.#eventBus = eventBus;
		}

		registerTenant(tenantId, domain, permissionMask) {
			const token = Object.freeze({
				tenantId,
				domain,
				permissions: permissionMask,
				epoch: this.#currentEpoch,
				__seal: this.#rootSecret,
			});

			this.#registry.set(tenantId, { token, active: true });

			return Object.freeze({
				publish: (channel, payload) => {
					return this.dispatch(channel, payload, token);
				},
			});
		}

		revokeTenant(tenantId) {
			const record = this.#registry.get(tenantId);
			if (record) {
				record.active = false;
			}
		}

		dispatch(channel, payload, token) {
			if (!token || token.__seal !== this.#rootSecret) {
				throw new Error(
					`[SENTINEL_PANIC: FORGED_TOKEN_SIGNATURE] Invalid seal on channel: ${channel}`,
				);
			}

			const record = this.#registry.get(token.tenantId);
			if (!record || !record.active || record.token !== token) {
				throw new Error(
					`[SENTINEL_PANIC: REVOKED_CAPABILITY_INVOCATION] Tenant ${token.tenantId} is inactive or revoked`,
				);
			}

			const allowedPrefixes = SentinelKernel.DOMAIN_MAP[token.domain] || [];
			const isDomainMatch = allowedPrefixes.some((p) => channel.startsWith(p));
			if (!isDomainMatch) {
				throw new Error(
					`[SENTINEL_PANIC: DOMAIN_CHANNEL_MISMATCH] Tenant domain ${token.domain} cannot publish to ${channel}`,
				);
			}

			const required = SentinelKernel.REQUIRED_PERMS[channel] || 0x0000;
			if ((token.permissions & required) !== required) {
				throw new Error(
					`[SENTINEL_PANIC: INSUFFICIENT_PRIVILEGE] Tenant ${token.tenantId} lacks perm 0x${required.toString(16)} for ${channel}`,
				);
			}

			return this.#eventBus.publish(channel, payload);
		}

		validateRaw(token, channel, requiredPerm) {
			return this.dispatch(channel, {}, token);
		}
	}

	window._SentinelInternal.SentinelKernel = SentinelKernel;
})();

if (typeof window !== "undefined") {
	window.SentinelKernel = window._SentinelInternal.SentinelKernel;
}
delete window._SentinelInternal;
