/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: COMBAT PRESENTATION DRIVER (TIER 3)
 * Document Identifier: VSRP-001-COMBAT-RENDERER
 * Governing Protocol:  VSRP-001 / ARCH-SPEC-COMBAT-AESTHETICS-003
 * Authority:           Tier 3 Presentation Engine & Tactical Viewport Driver
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
 *   [SEC-02] Combat Affinity & Element Resolution Utilities
 *   [SEC-03] Action Theater & Telemetry Renderers
 *   [SEC-04] Enemy Formation Wing Renderers
 *   [SEC-05] Party Formation Wing Renderers
 *   [SEC-06] Subdeck Renderers (Attack, Skills, Pouch, Guard)
 *   [SEC-07] Action & Command Hub Renderers
 *   [SEC-08] Public VSRP-001 Tier-3 Interface Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} CombatActionToken
 * @property {string} type Action token type.
 * @property {SkillNode} [skill] Associated skill node object.
 * @property {number} [targetIndex] Target slot index in party or enemy array.
 * @property {boolean} [isAlly] Flag indicating target is an ally.
 * @property {string} [itemId] Item identifier key.
 * @property {string} [tab] Command hub tab key.
 * @property {string} [nodeId] Aether skill node identifier.
 */

/**
 * @typedef {Object} AilmentEntry
 * @property {string} id Ailment identifier token.
 */

/**
 * @typedef {Object} Battler
 * @property {string} [id] Unique battler identifier.
 * @property {string} [name] Display name.
 * @property {number} [hp] Current health points.
 * @property {number} [maxHp] Maximum health points.
 * @property {number} [mp] Current magic points.
 * @property {number} [maxMp] Maximum magic points.
 * @property {number} [atk] Attack power rating.
 * @property {number} [def] Defense rating.
 * @property {number} [agi] Agility rating.
 * @property {boolean} [alive] Alive status flag.
 * @property {string} [row] Placement row ('FRONT' | 'BACK' | 'BOTH').
 * @property {string} [phenotype] Character phenotype class.
 * @property {Object} [equipment] Equipped weapons and armor.
 * @property {string[]} [unlockedNodes] Unlocked progression nodes.
 * @property {string[]} [unlocked] Alternate unlocked nodes array.
 * @property {AilmentEntry[]} [ailments] Active status ailments.
 * @property {string[]} [weaknesses] Elemental weaknesses.
 * @property {string[]} [resistances] Elemental resistances.
 * @property {string[]} [immunities] Elemental immunities.
 * @property {boolean} [isBoss] Boss classification flag.
 * @property {boolean} [phaseTwoActive] Boss enraged/phase two flag.
 * @property {string} [key] Bestiary or entity key.
 * @property {string} [sprite] Fallback text or emoji sprite.
 * @property {number} [level] Character level.
 */

/**
 * @typedef {Object} SkillNode
 * @property {string} id Unique skill node identifier.
 * @property {string} label Display label.
 * @property {string} [name] Alternate name string.
 * @property {number} [mpCost] MP resource cost.
 * @property {string} [element] Elemental affinity token.
 * @property {string} [description] Skill description text.
 * @property {string} [subType] Skill behavioral subtype ('strike', 'bolt', 'heal', etc.).
 * @property {number} [multiplier] Damage scaling multiplier.
 * @property {number} [mult] Alternate scaling multiplier.
 * @property {number} [power] Base power rating.
 * @property {number} [accuracy] Hit rate accuracy percentage.
 * @property {string} [targetType] Target scope ('ally' | 'enemy').
 */

/**
 * @typedef {Object} TurnQueueEntry
 * @property {Battler} entity Battler entity currently queued.
 */

/**
 * @typedef {Object} CombatRewards
 * @property {number} [gold] Awarded gold.
 * @property {number} [exp] Awarded experience points.
 */

/**
 * @typedef {Object} CombatState
 * @property {string} [phase] Current combat phase identifier.
 * @property {SkillNode} [pendingSkill] Skill staged for execution.
 * @property {string} [pendingItem] Item staged for execution.
 * @property {string} [selectedTab] Currently selected command hub tab.
 * @property {Battler[]} [party] Squad party member array.
 * @property {Battler[]} [enemies] Hostile combatant array.
 * @property {TurnQueueEntry[]} [turnQueue] Active CTB initiative turn queue.
 * @property {number} [activeTurnIndex] Index of currently acting entity in turn queue.
 * @property {Object.<string, number>} [inventory] Item inventory counts keyed by ID.
 * @property {CombatRewards} [rewards] Battle reward spoils.
 * @property {number} [lastGainedGold] Finalized gold reward.
 * @property {number} [lastGainedExp] Finalized EXP reward.
 * @property {Array<Object>} [forecastQueue] CTB threat timeline forecast.
 */

/**
 * @typedef {Object} CombatDiagnostics
 * @property {string} driverId Driver internal identifier.
 * @property {boolean} mounted Mount state status flag.
 * @property {boolean} hasHostContext Whether a host context is bound.
 */

/**
 * @typedef {Object} CombatContext
 * @property {Object} [eventBus] Host event bus reference.
 */

const EmberlightCombatRenderer = (() => {
	//#region [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
	let mounted = false;
	/** @type {function(CombatActionToken): void|null} */
	let actionHandler = null;
	/** @type {CombatContext|null} */
	let hostContext = null;

	let lastCombatState = null;
	let lastQ1Spatial = null;
	let lastQ2Clash = null;
	let lastQ3Oracle = null;
	let lastQ4Deck = null;

	let ephemeralHover = null;
	let ephemeralPreviewSkill = null;
	let lastHoveredKey = '';
	let rafRedrawScheduled = false;
	let renderedEnemyBounds = [];
	let q1EventsBound = false;
	let q2EventsBound = false;
	let focusFireTargetId = null;
	let suppressContextMenuUntil = 0;

	/**
	 * Safely retrieves a DOM element by ID if available.
	 * @param {string} id DOM element identifier.
	 * @returns {HTMLElement|null} Element instance or null.
	 */
	function getElement(id) {
		return typeof document === 'undefined' ? null : document.getElementById(id);
	}

	let actionSequenceCounter = 0;

	/**
	 * Resolves default target index based on hover, focus-fire, or front-row living unit.
	 * @param {boolean} [isAlly=false] Target side.
	 * @returns {number} Resolved slot index.
	 */
	function resolveContextualTargetIndex(isAlly = false) {
		if (isAlly) {
			if (ephemeralHover && ephemeralHover.type === 'HERO' && typeof ephemeralHover.index === 'number') {
				return ephemeralHover.index;
			}
			const party = lastCombatState?.party || [];
			const activeCharId = lastCombatState?.turnQueue?.[lastCombatState?.activeTurnIndex]?.entity?.id;
			const activeIdx = party.findIndex((p) => p.id === activeCharId && p.alive);
			if (activeIdx !== -1) return activeIdx;
			const firstLivingAlly = party.findIndex((p) => p.alive);
			return firstLivingAlly !== -1 ? firstLivingAlly : 0;
		}

		if (ephemeralHover && ephemeralHover.type === 'ENEMY' && typeof ephemeralHover.index === 'number') {
			const foe = (lastCombatState?.enemies || [])[ephemeralHover.index];
			if (foe && foe.alive) return ephemeralHover.index;
		}
		if (focusFireTargetId) {
			const ffIdx = (lastCombatState?.enemies || []).findIndex((e) => e.id === focusFireTargetId && e.alive);
			if (ffIdx !== -1) return ffIdx;
		}
		const enemies = lastCombatState?.enemies || [];
		const firstLivingEnemy = enemies.findIndex((e) => e.alive);
		return firstLivingEnemy !== -1 ? firstLivingEnemy : 0;
	}

	/**
	 * Emits an authoritative action token to the simulation driver via Dual Dispatch.
	 * @param {CombatActionToken} action Action token payload.
	 * @returns {void}
	 */
	function emit(action) {
		if (!action) return;
		const actObj = typeof action === 'string' ? { type: action } : { ...action };
		if (!actObj.intentId) {
			actionSequenceCounter++;
			actObj.intentId = `intent_${Date.now()}_${actionSequenceCounter}`;
		}
		if (typeof actObj.targetIndex !== 'number' && (actObj.type === 'ATTACK' || actObj.type === 'SKILL' || actObj.type === 'ITEM')) {
			actObj.targetIndex = resolveContextualTargetIndex(Boolean(actObj.isAlly));
		}
		if (hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('combat:intent_action', actObj);
		}
		if (typeof actionHandler === 'function') {
			actionHandler(actObj);
		}
	}

	/**
	 * Computes pixel-accurate normalized coordinates across CSS bounding box and internal canvas resolution.
	 * @param {HTMLCanvasElement} canvas Canvas element reference.
	 * @param {MouseEvent|PointerEvent|TouchEvent} event Mouse or pointer event.
	 * @returns {{ x: number, y: number, normX: number, normY: number }}
	 */
	function getNormalizedCanvasCoords(canvas, event) {
		if (!canvas || !event) return { x: 0, y: 0, normX: 0, normY: 0 };
		const rect = canvas.getBoundingClientRect();
		const scaleX = canvas.width / Math.max(1, rect.width);
		const scaleY = canvas.height / Math.max(1, rect.height);
		const touch = 'touches' in event && event.touches ? event.touches[0] : null;
		let clientX = 0;
		let clientY = 0;
		if ('clientX' in event && typeof event.clientX === 'number') {
			clientX = event.clientX;
		} else if (touch) {
			clientX = touch.clientX;
		}
		if ('clientY' in event && typeof event.clientY === 'number') {
			clientY = event.clientY;
		} else if (touch) {
			clientY = touch.clientY;
		}
		return {
			x: (clientX - rect.left) * scaleX,
			y: (clientY - rect.top) * scaleY,
			normX: Math.max(0, Math.min(1, (clientX - rect.left) / Math.max(1, rect.width))),
			normY: Math.max(0, Math.min(1, (clientY - rect.top) / Math.max(1, rect.height))),
		};
	}

	/**
	 * Schedules a coalesced canvas redraw via requestAnimationFrame with dirty-state suppression.
	 * @returns {void}
	 */
	function scheduleSynchronizedRedraw() {
		if (rafRedrawScheduled) return;
		rafRedrawScheduled = true;
		if (typeof requestAnimationFrame !== 'undefined') {
			requestAnimationFrame(() => {
				rafRedrawScheduled = false;
				if (lastCombatState) {
					if (lastQ1Spatial) renderQ1SpatialCanvas(lastQ1Spatial, lastCombatState);
					if (lastQ2Clash) renderQ2ClashCanvas(lastQ2Clash, lastCombatState);
					if (lastQ3Oracle) renderQ3ThreatOracleDeck(lastQ3Oracle, lastCombatState);
					if (lastQ4Deck) renderQ4HeroChassisGrid(lastQ4Deck, lastCombatState);
					syncDOMHighlighting();
				}
			});
		} else {
			rafRedrawScheduled = false;
		}
	}

	/**
	 * Sets the ephemeral hover target across all 4 quadrants without mutating simulation state.
	 * @param {{ id: string, type: string, index: number }|null} hoverTarget Hover payload or null.
	 * @returns {void}
	 */
	function setEphemeralHover(hoverTarget) {
		const newKey = hoverTarget ? `${hoverTarget.type}_${hoverTarget.id}_${hoverTarget.index}` : '';
		if (newKey === lastHoveredKey) return;
		lastHoveredKey = newKey;
		ephemeralHover = hoverTarget;
		if (hoverTarget && hostContext?.eventBus?.publish) {
			hostContext.eventBus.publish('combat:sfx', { sfx: 'MENU_HOVER' });
		}
		scheduleSynchronizedRedraw();
	}

	/**
	 * Sets the ephemeral preview skill for real-time trajectory and CTB forecasting.
	 * @param {SkillNode|null} skill Skill node preview object or null.
	 * @returns {void}
	 */
	function setEphemeralPreviewSkill(skill) {
		ephemeralPreviewSkill = skill;
		scheduleSynchronizedRedraw();
	}

	let activeRadialConfig = null;
	let radialOrigin = { x: 0, y: 0 };
	let activeFlickDirection = null;

	/**
	 * Closes the contextual radial menu and unbinds gesture listeners.
	 * @returns {void}
	 */
	function closeContextualRadial() {
		const radial = getElement('combat-hero-radial');
		if (radial) {
			radial.classList.add('hidden');
			radial.innerHTML = '';
		}
		activeRadialConfig = null;
		activeFlickDirection = null;
		if (typeof window !== 'undefined') {
			window.removeEventListener('pointermove', handleRadialPointerMove);
			window.removeEventListener('pointerup', handleRadialPointerUp);
			window.removeEventListener('keydown', handleRadialKeyDown);
		}
		setEphemeralPreviewSkill(null);
	}

	/**
	 * Computes cardinal direction from delta vector.
	 * @param {number} dx
	 * @param {number} dy
	 * @returns {'NORTH'|'EAST'|'SOUTH'|'WEST'}
	 */
	function getRadialFlickDirection(dx, dy) {
		const angle = (Math.atan2(dy, dx) * 180) / Math.PI;
		if (angle >= -135 && angle <= -45) return 'NORTH';
		if (angle > -45 && angle < 45) return 'EAST';
		if (angle >= 45 && angle <= 135) return 'SOUTH';
		return 'WEST';
	}

	/**
	 * Resets active flick state and restores default telemetry.
	 * @param {HTMLElement} radial
	 */
	function resetRadialFlickState(radial) {
		if (activeFlickDirection === null) return;
		activeFlickDirection = null;
		radial.querySelectorAll('.radial-leaf-btn').forEach((btn) => {
			btn.classList.remove('active-flick');
		});
		setEphemeralPreviewSkill(null);
		const activeChar = lastCombatState?.turnQueue?.[lastCombatState?.activeTurnIndex]?.entity || lastCombatState?.party?.[0];
		const defaultEnemy = (lastCombatState?.enemies || []).find((e) => e.alive) || lastCombatState?.enemies?.[0];
		if (activeChar && defaultEnemy && lastCombatState) {
			renderTelemetryStats(activeChar, defaultEnemy, lastCombatState);
		}
	}

	/**
	 * Handles pointer movements during an active radial gesture.
	 * @param {PointerEvent} ev
	 */
	function handleRadialPointerMove(ev) {
		if (!activeRadialConfig) return;
		const dx = ev.clientX - radialOrigin.x;
		const dy = ev.clientY - radialOrigin.y;
		const dist = Math.hypot(dx, dy);

		const radial = getElement('combat-hero-radial');
		if (!radial) return;

		if (dist >= 20) {
			const dir = getRadialFlickDirection(dx, dy);
			if (activeFlickDirection !== dir) {
				activeFlickDirection = dir;
				radial.querySelectorAll('.radial-leaf-btn').forEach((btn) => {
					btn.classList.toggle('active-flick', btn.classList.contains(dir.toLowerCase()));
				});
				const leafConfig = activeRadialConfig[dir.toLowerCase()];
				if (leafConfig && typeof leafConfig.onHover === 'function') {
					leafConfig.onHover();
				}
			}
		} else {
			resetRadialFlickState(radial);
		}
	}

	/**
	 * Handles pointer release to commit flick actions or keep click modal open.
	 * @param {PointerEvent} ev
	 */
	function handleRadialPointerUp(ev) {
		if (!activeRadialConfig) return;
		suppressContextMenuUntil = Date.now() + 300;
		const dx = ev.clientX - radialOrigin.x;
		const dy = ev.clientY - radialOrigin.y;
		const dist = Math.hypot(dx, dy);

		if (dist >= 20 && activeFlickDirection) {
			const leafConfig = activeRadialConfig[activeFlickDirection.toLowerCase()];
			if (leafConfig && typeof leafConfig.onCommit === 'function') {
				const meta = {
					cardinal: activeFlickDirection,
					vectorAngle: Math.atan2(dy, dx),
					powerScale: Math.min(1.5, Math.max(1.0, dist / 50)),
				};
				leafConfig.onCommit(meta);
			}
			closeContextualRadial();
		}
	}

	/**
	 * Handles keyboard hotkeys when radial is active.
	 * @param {KeyboardEvent} ev
	 */
	function handleRadialKeyDown(ev) {
		if (!activeRadialConfig) return;
		if (ev.key === 'Escape') {
			closeContextualRadial();
			return;
		}
		const keyMap = { '1': 'north', '2': 'east', '3': 'south', '4': 'west' };
		const dirKey = keyMap[ev.key];
		if (dirKey && activeRadialConfig[dirKey]) {
			ev.preventDefault();
			const leafConfig = activeRadialConfig[dirKey];
			if (leafConfig && typeof leafConfig.onCommit === 'function') {
				leafConfig.onCommit();
			}
			closeContextualRadial();
		}
	}

	/**
	 * Opens a contextual 4-leaf radial at the designated screen coordinates.
	 * @param {number} clientX Screen X coordinate.
	 * @param {number} clientY Screen Y coordinate.
	 * @param {Object} config Quadrant radial descriptor configuration.
	 */
	function openContextualRadial(clientX, clientY, config) {
		const radial = getElement('combat-hero-radial');
		if (!radial) return;

		activeRadialConfig = config;
		radialOrigin = { x: clientX, y: clientY };
		activeFlickDirection = null;

		const radW = 172;
		const radH = 172;
		const pad = 10;
		const winW = typeof window !== 'undefined' ? window.innerWidth : 800;
		const winH = typeof window !== 'undefined' ? window.innerHeight : 600;
		const posX = Math.max(pad, Math.min(winW - radW - pad, clientX - radW / 2));
		const posY = Math.max(pad, Math.min(winH - radH - pad, clientY - radH / 2));

		radial.style.left = `${posX}px`;
		radial.style.top = `${posY}px`;
		radial.style.transform = 'none';

		radial.innerHTML = `
			<div class="radial-center-dial">${config.centerIcon || '⚡'}</div>
			<button type="button" class="radial-leaf-btn north" id="radial-leaf-n">
				<span>${config.north.icon} ${config.north.label}</span>
				<span class="leaf-key">[1]</span>
			</button>
			<button type="button" class="radial-leaf-btn east" id="radial-leaf-e">
				<span>${config.east.icon} ${config.east.label}</span>
				<span class="leaf-key">[2]</span>
			</button>
			<button type="button" class="radial-leaf-btn south" id="radial-leaf-s">
				<span>${config.south.icon} ${config.south.label}</span>
				<span class="leaf-key">[3]</span>
			</button>
			<button type="button" class="radial-leaf-btn west" id="radial-leaf-w">
				<span>${config.west.icon} ${config.west.label}</span>
				<span class="leaf-key">[4]</span>
			</button>
		`;

		radial.classList.remove('hidden');

		['north', 'east', 'south', 'west'].forEach((dir) => {
			const btn = radial.querySelector(`.radial-leaf-btn.${dir}`);
			const leafConfig = config[dir];
			if (btn && leafConfig) {
				btn.addEventListener('click', (e) => {
					e.stopPropagation();
					suppressContextMenuUntil = Date.now() + 300;
					if (typeof leafConfig.onCommit === 'function') {
						leafConfig.onCommit();
					}
					closeContextualRadial();
				});
				btn.addEventListener('mouseenter', () => {
					if (typeof leafConfig.onHover === 'function') {
						leafConfig.onHover();
					}
				});
			}
		});

		if (typeof window !== 'undefined') {
			window.addEventListener('pointermove', handleRadialPointerMove);
			window.addEventListener('pointerup', handleRadialPointerUp);
			window.addEventListener('keydown', handleRadialKeyDown);
		}
	}

	/**
	 * Synchronizes CSS highlight classes across DOM turn slots, hero cards, and target buttons.
	 * @returns {void}
	 */
	function syncDOMHighlighting() {
		if (typeof document === 'undefined') return;
		const hId = ephemeralHover?.id || null;
		const isFlare = Boolean(ephemeralHover);

		// Q3 CTB Slots
		document.querySelectorAll('#combat-ctb-ribbon-bar .turn-slot').forEach((slot) => {
			const slotId = /** @type {HTMLElement} */ (slot).dataset.entityId;
			if (hId && slotId === hId) {
				slot.classList.add('hovered-slot');
				slot.classList.add('the-flare-q3');
			} else {
				slot.classList.remove('hovered-slot');
				slot.classList.remove('the-flare-q3');
			}
		});

		// Q3 Intent Beacons
		document.querySelectorAll('.intent-beacon-item').forEach((beacon) => {
			const htmlBeacon = /** @type {HTMLElement} */ (beacon);
			const foeId = htmlBeacon.dataset.enemyId;
			const heroId = htmlBeacon.dataset.heroId;
			if (hId && (foeId === hId || heroId === hId)) {
				beacon.classList.add('hovered');
			} else {
				beacon.classList.remove('hovered');
			}
		});

		// Q4 Hero Pedestals & Legacy Chassis Cards
		document.querySelectorAll('.hero-pedestal-stage, .hero-chassis-card').forEach((el) => {
			const cardId = el.id ? el.id.replace('hero-chassis-', '') : '';
			if (hId && cardId === hId) {
				el.classList.add('hovered');
			} else {
				el.classList.remove('hovered');
			}
			if (isFlare && el.classList.contains('active-turn')) {
				el.classList.add('the-flare-active');
			} else {
				el.classList.remove('the-flare-active');
			}
		});

		// Subdeck Target Selection Buttons
		document.querySelectorAll('.target-select-btn').forEach((btn) => {
			const btnFoeId = /** @type {HTMLElement} */ (btn).dataset.enemyId;
			if (hId && btnFoeId === hId) {
				btn.classList.add('hovered');
			} else {
				btn.classList.remove('hovered');
			}
		});
	}
	//#endregion

	//#region [SEC-02] Combat Affinity & Element Resolution Utilities
	/**
	 * Resolves elemental damage affinities and multipliers against target resistances.
	 * @param {string} attackElement Attack element token.
	 * @param {Battler} target Target battler object.
	 * @returns {{label: string, multiplier: number}} Affinity evaluation result.
	 */
	function resolveAffinity(attackElement, target) {
		if (!target || !attackElement || attackElement === 'NONE') return { label: 'NEUTRAL', multiplier: 1.0 };
		const elem = String(attackElement).toUpperCase();
		const weaknesses = (target.weaknesses || []).map((w) => String(w).toUpperCase());
		const resistances = (target.resistances || []).map((r) => String(r).toUpperCase());
		const immunities = (target.immunities || []).map((i) => String(i).toUpperCase());

		if (immunities.includes(elem)) return { label: 'IMMUNE', multiplier: 0.0 };
		if (weaknesses.includes(elem)) return { label: 'WEAK', multiplier: 1.5 };
		if (resistances.includes(elem)) return { label: 'RESIST', multiplier: 0.5 };
		return { label: 'NEUTRAL', multiplier: 1.0 };
	}

	/**
	 * Resolves the primary elemental type associated with an active skill.
	 * @param {SkillNode|null} skill Skill node object.
	 * @returns {string} Element name string.
	 */
	function getActiveSkillElement(skill) {
		if (!skill) return 'PHYSICAL';
		if (skill.element) return skill.element;
		return skill.subType === 'strike' ? 'PHYSICAL' : 'FIRE';
	}

	/**
	 * Renders HTML markup for an elemental affinity tag badge.
	 * @param {{label: string, multiplier: number}} affinity Affinity evaluation object.
	 * @returns {string} HTML markup string.
	 */
	function renderAffinityTag(affinity) {
		if (affinity.label === 'WEAK') {
			return '<span class="pip weak" style="color:var(--ember); font-weight:bold;">⚡ WEAK</span>';
		}
		if (affinity.label === 'RESIST') {
			return '<span class="pip resist" style="color:var(--text-dim);">🛡️ RESIST</span>';
		}
		return '';
	}
	//#endregion

	//#region [SEC-03] Action Theater & Telemetry Renderers
	/**
	 * Updates the visual clash header based on engagement phase and pending actions.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderClashHeader(state) {
		const clashIconEl = getElement('theater-clash-icon');
		const clashLabelEl = getElement('theater-clash-label');
		if (!clashIconEl || !clashLabelEl) return;

		if (state?.pendingSkill) {
			clashIconEl.textContent = '✨';
			clashLabelEl.textContent = (state.pendingSkill.label || state.pendingSkill.name || 'SKILL').toUpperCase();
		} else if (state?.phase === 'TARGETING_ENEMY') {
			clashIconEl.textContent = '⚔️';
			clashLabelEl.textContent = 'STRIKE TARGET';
		} else if (state?.phase === 'ENEMY_ACTION') {
			clashIconEl.textContent = '💥';
			clashLabelEl.textContent = 'ENEMY STRIKE';
		} else {
			clashIconEl.textContent = '⚔️';
			clashLabelEl.textContent = 'TACTICAL ENGAGEMENT';
		}
	}

	/**
	 * Generates affinity markup for telemetry HUD display.
	 * @param {{label: string, multiplier: number}} affinity Evaluated affinity object.
	 * @param {string} element Element name.
	 * @returns {string} HTML markup string.
	 */
	function getTelemetryAffinityMarkup(affinity, element) {
		if (affinity.label === 'WEAK') {
			return '<b style="color:var(--ember)">AFFINITY: ⚡ WEAKNESS (1.5x)</b>';
		}
		if (affinity.label === 'RESIST') {
			return '<b style="color:var(--text-dim)">AFFINITY: 🛡️ RESISTED (0.5x)</b>';
		}
		return `AFFINITY: ${element} (1.0x)`;
	}

	/**
	 * Renders telemetry stats for active skill casting.
	 * @param {Battler} activeChar Active battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {SkillNode} skill Active skill node.
	 * @param {HTMLElement} telemetryDmg Damage range element.
	 * @param {HTMLElement|null} telemetryHit Hit rate element.
	 * @param {HTMLElement|null} telemetryAffinity Affinity tag element.
	 * @returns {void}
	 */
	function renderSkillTelemetry(activeChar, targetEnemy, skill, telemetryDmg, telemetryHit, telemetryAffinity) {
		const element = getActiveSkillElement(skill);
		const powerMult = skill.multiplier || skill.mult || 1.4;
		const rawBase = Math.max(1, (activeChar.atk || 10) * powerMult * 1.5 - (targetEnemy.def || 5));
		const affinity = resolveAffinity(element, targetEnemy);
		const finalDmg = Math.max(1, Math.round(rawBase * affinity.multiplier));
		const estMin = Math.max(1, Math.round(finalDmg * 0.85));
		const estMax = Math.max(1, Math.round(finalDmg * 1.15));
		const hitRate = skill.accuracy || 95;

		if (telemetryAffinity) {
			telemetryAffinity.innerHTML = getTelemetryAffinityMarkup(affinity, element);
		}
		telemetryDmg.textContent = `EST DMG: ${estMin} ~ ${estMax}`;
		if (telemetryHit) telemetryHit.textContent = `HIT: ${hitRate}%`;
	}

	/**
	 * Renders basic attack telemetry stats.
	 * @param {Battler} activeChar Active battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {HTMLElement} telemetryDmg Damage range element.
	 * @param {HTMLElement|null} telemetryHit Hit rate element.
	 * @param {HTMLElement|null} telemetryAffinity Affinity tag element.
	 * @returns {void}
	 */
	function renderBasicTelemetry(activeChar, targetEnemy, telemetryDmg, telemetryHit, telemetryAffinity) {
		const rawBase = Math.max(1, (activeChar.atk || 10) * 2 - (targetEnemy.def || 5));
		const estMin = Math.max(1, rawBase - 2);
		const estMax = Math.max(1, rawBase + 3);
		if (telemetryAffinity) telemetryAffinity.innerHTML = 'AFFINITY: PHYSICAL (1.0x)';
		telemetryDmg.textContent = `EST DMG: ${estMin} ~ ${estMax}`;
		if (telemetryHit) telemetryHit.textContent = 'HIT: 95%';
	}

	/**
	 * Calculates and renders estimated damage, hit rates, and affinities in the telemetry HUD.
	 * @param {Battler} activeChar Active character battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderTelemetryStats(activeChar, targetEnemy, state) {
		const telemetryDmg = getElement('telemetry-dmg-range');
		const telemetryHit = getElement('telemetry-hit-rate');
		const telemetryAffinity = getElement('telemetry-affinity-tag');
		if (!telemetryDmg || !activeChar || !targetEnemy) return;

		if (state?.pendingSkill) {
			renderSkillTelemetry(activeChar, targetEnemy, state.pendingSkill, telemetryDmg, telemetryHit, telemetryAffinity);
		} else {
			renderBasicTelemetry(activeChar, targetEnemy, telemetryDmg, telemetryHit, telemetryAffinity);
		}
	}

	/**
	 * Renders the complete action theater view and telemetry panel.
	 * @param {Battler} activeChar Active character battler.
	 * @param {Battler} targetEnemy Target enemy battler.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderActionTheater(activeChar, targetEnemy, state) {
		renderClashHeader(state);
		renderTelemetryStats(activeChar, targetEnemy, state);
	}
	//#endregion

	//#region [SEC-04] Enemy Formation Wing Renderers
	/**
	 * Resolves visual asset or icon URLs for an enemy battler.
	 * @param {Battler} enemy Enemy battler object.
	 * @param {boolean} isBossEnraged Boss enraged state flag.
	 * @param {number} heatPulse Heat pulse pulsation factor.
	 * @returns {string|null} Asset data URL or null.
	 */
	function resolveEnemyBattlerUrl(enemy, isBossEnraged, heatPulse) {
		if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
			const url = EmberlightBattlerBaker.get(enemy.key);
			if (url) return url;
		}
		const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
		const icons = win.EmberlightIcons || win.EmberlightPartyIcons;
		if (icons && typeof icons.get === 'function') {
			if (enemy.isBoss && typeof icons.getBossIcon === 'function') {
				return icons.getBossIcon(isBossEnraged, heatPulse);
			}
			return icons.get(enemy.key);
		}
		return null;
	}

	/**
	 * Resolves and renders an affinity badge for an enemy against active skills.
	 * @param {string} activeElement Active skill element.
	 * @param {Battler} enemy Enemy battler object.
	 * @returns {string} HTML markup string.
	 */
	function resolveEnemyAffinityBadge(activeElement, enemy) {
		if (!enemy.alive) return '';
		const affinity = resolveAffinity(activeElement, enemy);
		if (affinity.label === 'WEAK') {
			return '<div class="affinity-badge weak">⚡ WEAK 1.5x</div>';
		}
		if (affinity.label === 'RESIST') {
			return '<div class="affinity-badge resist">🛡️ RESIST 0.5x</div>';
		}
		return '';
	}

	/**
	 * Resolves boss attributes and enraged status.
	 * @param {Battler} e Battler entity.
	 * @returns {{isBossUnit: boolean, isBossEnraged: boolean, heatPulse: number, bossCls: string, bossBattlerClass: string}} Boss details.
	 */
	function resolveBossDetails(e) {
		const isBossUnit = Boolean(e.isBoss || (e.key && String(e.key).toUpperCase().includes('BOSS')) || (e.key && String(e.key).toUpperCase().includes('MALAKOR')));
		const isBossEnraged = Boolean(e.isBoss && e.phaseTwoActive);
		const heatPulse = isBossEnraged ? (1.0 + Math.sin(Date.now() * 0.008) * 0.25) : 1.0;
		const bossCls = isBossUnit ? 'boss-card boss-battler' : '';
		const bossBattlerClass = isBossUnit ? 'boss-battler' : '';
		return { isBossUnit, isBossEnraged, heatPulse, bossCls, bossBattlerClass };
	}

	/**
	 * Formats ailment classes and HTML tag markup for a battler.
	 * @param {Battler} e Battler entity.
	 * @returns {{ailmentList: string, ailmentClasses: string, ailmentTags: string}} Formatted ailment strings.
	 */
	function formatAilments(e) {
		const ailments = e.ailments || [];
		const ailmentList = ailments.map((a) => a.id).join(',');
		const ailmentClasses = ailments.map((a) => `has-ailment-${a.id.toLowerCase()}`).join(' ');
		const ailmentTags = ailments.map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`).join(' ');
		return { ailmentList, ailmentClasses, ailmentTags };
	}

	/**
	 * Renders the HTML card for an individual enemy unit slot.
	 * @param {{e: Battler, idx: number}} item Enemy entry and array index.
	 * @param {string} activeElement Active skill element.
	 * @returns {string} HTML markup string.
	 */
	function renderEnemyCard({ e, idx }, activeElement) {
		const { isBossEnraged, heatPulse, bossCls, bossBattlerClass } = resolveBossDetails(e);
		const hpPct = e.maxHp > 0 ? Math.max(0, Math.min(100, (e.hp / e.maxHp) * 100)) : 0;
		const isExhausted = e.alive && (e.hp / e.maxHp) <= 0.30;
		const { ailmentList, ailmentClasses, ailmentTags } = formatAilments(e);

		const battlerUrl = resolveEnemyBattlerUrl(e, isBossEnraged, heatPulse);
		let spriteHtml = `<div class="sprite">${e.sprite || '👾'}</div>`;
		if (battlerUrl) {
			spriteHtml = `<img src="${battlerUrl}" class="battler-sprite enemy-battler ${bossBattlerClass}" alt="${e.name}" />`;
		}

		const affinityBadgeHtml = resolveEnemyAffinityBadge(activeElement, e);
		const rowClass = (e.row === 'FRONT' || e.row === 'BOTH' || !e.row) ? 'row-front' : 'row-back';
		const rowTag = e.row === 'BACK' ? '<div class="backline-tag">BACKLINE (+15% EVA)</div>' : '<div class="frontline-tag">FRONTLINE</div>';
		const stanceClass = isExhausted ? 'exhausted' : '';
		const exhaustedBadge = isExhausted ? '<div class="exhausted-badge">⚠️ TIRED (≤30%)</div>' : '';

		return `
      <div class="enemy formation-slot ${rowClass} ${stanceClass} ${e.alive ? '' : 'dead'} ${bossCls} ${ailmentClasses}" data-idx="${idx}" data-ailments="${ailmentList}" tabindex="0" style="position:relative; width:100%;">
        ${affinityBadgeHtml}
        ${spriteHtml}
        <div style="font-size:7.5px; font-weight:bold; margin-top:2px;">${e.name || 'Enemy'} ${isBossEnraged ? '<span style="color:var(--danger)">[ENRAGED]</span>' : ''}</div>
        ${rowTag}
        ${exhaustedBadge}
        <div class="bar-row" style="margin-top:2px; width:90%;">
          <span class="bar-track"><span class="bar-fill hp" style="width:${hpPct}%"></span></span>
        </div>
        <div class="hp-label" style="font-size:6px;">${e.hp}/${e.maxHp} HP ${ailmentTags}</div>
      </div>
    `;
	}

	/**
	 * Renders the complete enemy formation wing container and attaches interaction listeners.
	 * @param {HTMLElement|null} container Enemy wing container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler} activeChar Active character battler.
	 * @returns {void}
	 */
	function renderEnemyWing(container, state, activeChar) {
		if (!container) return;
		container.className = 'formation-grid enemy-wing';

		const enemies = state.enemies || [];
		const frontEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'FRONT' || e.row === 'BOTH' || !e.row);
		const backEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'BACK');
		const activeElement = getActiveSkillElement(state.pendingSkill);

		container.innerHTML = `
      <div class="formation-row">
        <div class="formation-row-header">🏹 HOSTILE BACK</div>
        ${backEnemies.map((item) => renderEnemyCard(item, activeElement)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:12px;">Back Clear</div>'}
      </div>
      <div class="formation-row">
        <div class="formation-row-header">⚔️ HOSTILE FRONT</div>
        ${frontEnemies.map((item) => renderEnemyCard(item, activeElement)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:12px;">Front Clear</div>'}
      </div>
    `;

		container.querySelectorAll('.enemy.formation-slot').forEach((el) => {
			/** @type {HTMLElement} */
			const htmlEl = /** @type {HTMLElement} */ (el);
			const idx = Number.parseInt(htmlEl.dataset.idx || '0', 10);
			const target = enemies[idx];

			htmlEl.addEventListener('mouseenter', () => {
				if (target?.alive) {
					renderActionTheater(activeChar, target, state);
				}
			});
			htmlEl.addEventListener('focus', () => {
				if (target?.alive) {
					renderActionTheater(activeChar, target, state);
				}
			});
			htmlEl.addEventListener('mouseleave', () => {
				const defaultEnemy = enemies.find((e) => e.alive);
				renderActionTheater(activeChar, defaultEnemy, state);
			});

			if (target?.alive) {
				htmlEl.classList.add('targetable');
				htmlEl.addEventListener('click', () => {
					if (state.pendingSkill) {
						emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: false });
					} else {
						emit({ type: 'ATTACK', targetIndex: idx });
					}
				});
			}
		});
	}
	//#endregion

	//#region [SEC-05] Party Formation Wing Renderers
	/**
	 * Resolves the visual battler URL for a party member.
	 * @param {Battler} c Party character object.
	 * @returns {string|null} Asset URL or null.
	 */
	function resolvePartyBattlerUrl(c) {
		if (typeof EmberlightBattlerBaker !== 'undefined' && typeof EmberlightBattlerBaker.get === 'function') {
			return EmberlightBattlerBaker.get({
				phenotype: c.phenotype,
				weapon: c.equipment?.weapon,
				armor: c.equipment?.armor,
			});
		}
		return null;
	}

	/**
	 * Renders the HTML card for an individual party member slot.
	 * @param {{c: Battler, idx: number}} item Party character entry and array index.
	 * @param {Battler|null} currentTurnEntity Currently active turn entity.
	 * @returns {string} HTML markup string.
	 */
	function renderPartyCard({ c, idx }, currentTurnEntity) {
		const isTurn = currentTurnEntity?.id === c.id;
		const curHp = c.hp !== undefined ? c.hp : (c.maxHp || 30);
		const maxHp = c.maxHp || 30;
		const curMp = c.mp !== undefined ? c.mp : (c.maxMp || 10);
		const maxMp = c.maxMp !== undefined ? c.maxMp : 10;
		const hpPct = maxHp > 0 ? Math.max(0, Math.min(100, Math.round((curHp / maxHp) * 100))) : 0;
		const mpPct = maxMp > 0 ? Math.max(0, Math.min(100, Math.round((curMp / maxMp) * 100))) : 0;
		const isExhausted = c.alive && (curHp / maxHp) <= 0.30;
		const ailmentList = (c.ailments || []).map((a) => a.id).join(',');
		const ailmentClasses = (c.ailments || []).map((a) => `has-ailment-${a.id.toLowerCase()}`).join(' ');
		const ailmentTags = (c.ailments || []).map((a) => `<span style="color:var(--danger)">[${a.id}]</span>`).join(' ');

		const rowClass = (c.row === 'FRONT' || c.row === 'BOTH' || !c.row) ? 'row-front' : 'row-back';
		const rowTag = c.row === 'BACK' ? '<div class="backline-tag">ARCANIST BACK</div>' : '<div class="frontline-tag">VANGUARD FRONT</div>';
		const stanceClass = isExhausted ? 'exhausted' : '';
		const exhaustedBadge = isExhausted ? '<div class="exhausted-badge">⚠️ TIRED (≤30%)</div>' : '';

		const battlerUrl = resolvePartyBattlerUrl(c);
		const spriteHtml = battlerUrl
			? `<img src="${battlerUrl}" class="battler-sprite party-battler" alt="${c.name}" />`
			: `<div class="sprite">${c.sprite || '🛡️'}</div>`;

		const mpLabel = ` • ${curMp}/${maxMp} MP`;

		return `
      <div class="character formation-slot ${rowClass} ${stanceClass} ${isTurn ? 'active-turn' : ''} ${c.alive ? '' : 'fainted'} ${ailmentClasses}" data-idx="${idx}" data-ailments="${ailmentList}" tabindex="0" style="position:relative; width:100%;">
        ${spriteHtml}
        <div style="font-size:7.5px; font-weight:bold; margin-top:2px;">${c.name || 'Hero'} <span class="char-class" style="color:var(--text-dim); font-size:6px;">Lv${c.level || 1}</span></div>
        ${rowTag}
        ${exhaustedBadge}
        <div class="bar-row" style="margin-top:2px; width:90%;">
          <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
        </div>
        <div class="bar-row" style="margin-top:1px; width:90%;">
          <span class="bar-track"><span class="hud-bar-fill mp" style="width:${mpPct}%"></span></span>
        </div>
        <div class="hp-label" style="font-size:6px; color:var(--text-dim); margin-top:1px;">${curHp}/${maxHp} HP${mpLabel} ${ailmentTags}</div>
      </div>
    `;
	}

	/**
	 * Renders the complete party formation wing container and attaches ally targeting listeners.
	 * @param {HTMLElement|null} container Party wing container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderPartyWing(container, state) {
		if (!container) return;
		container.className = 'formation-grid party-wing';

		const party = state.party || [];
		const currentTurnEntity = state.turnQueue?.[state.activeTurnIndex]?.entity || party[0];
		const frontParty = party.map((c, idx) => ({ c, idx })).filter(({ c }) => c.row === 'FRONT' || c.row === 'BOTH' || !c.row);
		const backParty = party.map((c, idx) => ({ c, idx })).filter(({ c }) => c.row === 'BACK');

		container.innerHTML = `
      <div class="formation-row">
        <div class="formation-row-header">🛡️ VANGUARD FRONT</div>
        ${frontParty.map((item) => renderPartyCard(item, currentTurnEntity)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:8px;">Empty</div>'}
      </div>
      <div class="formation-row">
        <div class="formation-row-header">✨ ARCANIST BACK</div>
        ${backParty.map((item) => renderPartyCard(item, currentTurnEntity)).join('') || '<div style="font-size:6px; color:var(--text-dim); text-align:center; padding:8px;">Empty</div>'}
      </div>
    `;

		if (state.phase === 'TARGETING_ALLY' || state.pendingSkill?.targetType === 'ally' || state.pendingItem) {
			container.querySelectorAll('.character.formation-slot').forEach((el) => {
				/** @type {HTMLElement} */
				const htmlEl = /** @type {HTMLElement} */ (el);
				const idx = Number.parseInt(htmlEl.dataset.idx || '0', 10);
				const ally = party[idx];
				if (ally && (ally.alive || state.pendingItem === 'PHOENIX_EMBER')) {
					htmlEl.classList.add('targetable-ally');
					htmlEl.addEventListener('click', () => {
						if (state.pendingItem) {
							emit({ type: 'ITEM', itemId: state.pendingItem, targetIndex: idx });
						} else if (state.pendingSkill) {
							emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: true });
						} else {
							emit({ type: 'TARGET_ALLY', targetIndex: idx });
						}
					});
				}
			});
		}
	}
	//#endregion

	//#region [SEC-06] Subdeck Renderers (Attack, Skills, Pouch, Guard)
	/**
	 * Renders the Live Target Telemetry Ribbon in Q4 command subdeck (abolishing redundant button lists).
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler|null} [activeChar=null] Active character battler object.
	 * @returns {void}
	 */
	function renderSubdeckAttack(subDeck, state, activeChar = null) {
		if (!subDeck) return;
		const enemies = (state.enemies || []).filter((e) => e.alive);
		if (enemies.length === 0) {
			subDeck.innerHTML = '<div class="subdeck-empty">All hostile targets eliminated.</div>';
			return;
		}

		const activeSkill = state.pendingSkill || ephemeralPreviewSkill;
		const activeElement = getActiveSkillElement(activeSkill);
		const targetIdx = resolveContextualTargetIndex(false);
		const targetEnemy = (state.enemies || [])[targetIdx];

		if (targetEnemy && targetEnemy.alive) {
			const affinity = resolveAffinity(activeElement, targetEnemy);
			const affTag = renderAffinityTag(affinity);
			const atkPower = activeSkill?.power || 1.0;
			const heroAtk = activeChar?.atk || 12;
			const estDmg = Math.max(1, Math.round((heroAtk * atkPower * affinity) - ((targetEnemy.def || 0) * 0.4)));
			const hitChance = Math.min(100, Math.max(60, 95 + ((activeChar?.agi || 10) - (targetEnemy.agi || 8)) * 2));
			const delayCost = activeSkill?.delayCost || (activeSkill ? 1100 : 1000);
			const estDelay = Math.round(delayCost / Math.max(1, activeChar?.agi || 10));

			const cancelBtnHtml = state.pendingSkill
				? '<button type="button" class="cmd-btn" id="subdeck-cancel-skill-btn" style="font-size:6px; padding:2px 8px; margin-left:8px; border-color:var(--crimson-core); color:var(--crimson-light);">[ESC] CANCEL</button>'
				: '';

			subDeck.innerHTML = `
				<div class="telemetry-ribbon-card">
					<div class="telemetry-ribbon-header">
						<span class="telemetry-target-title">🎯 TARGET: <strong>${targetEnemy.name}</strong> ${affTag}</span>
						${activeSkill ? `<div class="telemetry-skill-badge">✨ ${activeSkill.name}</div>` : ''}
						${activeSkill?.cost ? `<div class="telemetry-cost-badge">⚡ ${activeSkill.cost} MP</div>` : ''}
						${cancelBtnHtml}
					</div>
					<div class="telemetry-ribbon-metrics">
						<div class="telemetry-metric-item">
							<span class="metric-label">EST. DAMAGE</span>
							<span class="metric-val highlight">${estDmg}</span>
						</div>
						<div class="telemetry-metric-item">
							<span class="metric-label">ACCURACY</span>
							<span class="metric-val">${hitChance}%</span>
						</div>
						<div class="telemetry-metric-item">
							<span class="metric-label">DELAY COST</span>
							<span class="metric-val">+${estDelay}t</span>
						</div>
						<div class="telemetry-metric-item">
							<span class="metric-label">AFFINITY</span>
							<span class="metric-val ${affinity > 1.0 ? 'weak' : affinity < 1.0 ? 'resist' : ''}">${affinity > 1.0 ? 'WEAK (1.5x)' : affinity < 1.0 ? 'RESIST (0.5x)' : 'NEUTRAL (1.0x)'}</span>
						</div>
					</div>
					<div class="telemetry-prompt-text">
						<span>⚡ <strong>LMB in Q1/Q2</strong> to Execute • <strong>RMB on Target</strong> for Radial Flick Wheel</span>
					</div>
				</div>
			`;

			const cancelBtn = subDeck.querySelector('#subdeck-cancel-skill-btn');
			if (cancelBtn) {
				cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_SKILL' }));
			}
		} else {
			subDeck.innerHTML = `
				<div class="telemetry-ribbon-card">
					<div class="telemetry-ribbon-header">
						<span class="telemetry-target-title">⚔️ SQUAD TACTICAL STATUS</span>
						<div class="telemetry-ready-badge">READY FOR ENGAGEMENT</div>
					</div>
					<div class="telemetry-prompt-text" style="text-align:left; padding:4px 0;">
						<span>Select an action tab above, or <strong>hover / click</strong> an enemy in Q1/Q2 to lock on.</span>
					</div>
				</div>
			`;
		}
	}

	/**
	 * Collects available active skill nodes for a hero from manifest skill trees or unlocked nodes.
	 * @param {Battler|null} activeChar Active character object.
	 * @returns {SkillNode[]} Array of skill node objects.
	 */
	function collectHeroSkills(activeChar) {
		const manifest = (typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {}) || {};
		const unlockedIds = activeChar?.unlockedNodes || activeChar?.unlocked || [];
		/** @type {SkillNode[]} */
		const activeSkills = [];

		if (manifest.AetherNodes) {
			unlockedIds.forEach((nodeId) => {
				const node = manifest.AetherNodes[nodeId];
				if (node?.type === 'active' && !activeSkills.some((s) => s.id === node.id)) {
					activeSkills.push(node);
				}
			});
		}

		if (activeSkills.length === 0 && manifest.SkillTrees && activeChar?.phenotype) {
			const tree = manifest.SkillTrees[activeChar.phenotype] || {};
			Object.values(tree).forEach((branch) => {
				if (Array.isArray(branch)) {
					branch.forEach((node) => {
						if (node.type === 'active' && unlockedIds.includes(node.id) && !activeSkills.some((s) => s.id === node.id)) {
							activeSkills.push(node);
						}
					});
				}
			});
		}

		if (activeSkills.length === 0) {
			if (activeChar?.phenotype === 'MAGE') {
				activeSkills.push({ id: 'mag_des_1', label: 'Flame Surge', mpCost: 5, element: 'FIRE', description: 'Unleash searing firebolt with burn chance.', subType: 'bolt', power: 12 });
			} else if (activeChar?.phenotype === 'HEALER') {
				activeSkills.push({ id: 'hea_lum_1', label: 'Soothing Light', mpCost: 4, element: 'HOLY', description: 'Restores 25 HP to target ally.', targetType: 'ally', subType: 'heal', power: 25 });
			} else {
				activeSkills.push({ id: 'war_vor_1', label: 'Cleave Strike', mpCost: 4, element: 'PHYSICAL', description: 'Heavy melee slash deal 1.5x damage.', subType: 'strike', mult: 1.5 });
			}
		}
		return activeSkills;
	}

	/**
	 * Renders the skill deck subview or ally target selection when casting supportive spells.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler} activeChar Active character object.
	 * @returns {void}
	 */
	function renderSubdeckSkills(subDeck, state, activeChar) {
		if (!subDeck) return;
		if (state.phase === 'TARGETING_ALLY' && state.pendingSkill) {
			subDeck.innerHTML = `
        <div class="subdeck-target-selector">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="subdeck-title">SELECT ALLY TARGET:</span>
            <button type="button" class="cmd-btn" id="subdeck-cancel-ally-skill-btn" style="font-size:6px; padding:2px 8px;">[ESC] CANCEL</button>
          </div>
          <div class="target-selector-grid">
            ${(state.party || []).map((hero, idx) => {
				const hpPct = hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * 100) : 0;
				return `
                <button type="button" class="target-select-btn" data-ally-idx="${idx}" ${hero.alive ? '' : 'disabled'}>
                  <div class="target-name">[${idx + 1}] ${hero.name} (Lv${hero.level || 1})</div>
                  <div class="target-hp-bar">
                    <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                    <span class="target-hp-num">${hero.hp}/${hero.maxHp} HP</span>
                  </div>
                </button>
              `;
			}).join('')}
          </div>
        </div>
      `;

			const cancelBtn = subDeck.querySelector('#subdeck-cancel-ally-skill-btn');
			if (cancelBtn) {
				cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_SKILL' }));
			}

			subDeck.querySelectorAll('[data-ally-idx]').forEach((btn) => {
				/** @type {HTMLElement} */
				const htmlBtn = /** @type {HTMLElement} */ (btn);
				const idx = Number.parseInt(htmlBtn.dataset.allyIdx || '0', 10);
				htmlBtn.addEventListener('click', () => {
					emit({ type: 'SKILL', skill: state.pendingSkill, targetIndex: idx, isAlly: true });
				});
			});
			return;
		}

		const activeSkills = collectHeroSkills(activeChar);

		subDeck.innerHTML = `
      <div class="skills-deck-grid">
        ${activeSkills.map((node) => {
			const canAfford = (activeChar?.mp || 0) >= (node.mpCost || 0);
			const iconUrl = typeof EmberlightSkillIcons !== 'undefined' ? EmberlightSkillIcons.get(node.id) : null;
			const elemBadge = node.element ? `<span class="skill-elem-tag ${node.element.toLowerCase()}">${node.element}</span>` : '';

			return `
            <div class="skill-deck-card ${canAfford ? '' : 'disabled'}" data-skill-id="${node.id}">
              <div class="skill-card-top">
                ${iconUrl ? `<img src="${iconUrl}" class="skill-card-icon" alt="${node.label}" />` : ''}
                <div class="skill-card-info">
                  <div class="skill-card-name">${node.label} ${elemBadge}</div>
                  <div class="skill-card-cost">${node.mpCost || 0} MP</div>
                </div>
              </div>
              <div class="skill-card-desc">${node.description || 'Channel tactical arcane energy.'}</div>
            </div>
          `;
		}).join('')}
      </div>
    `;

		subDeck.querySelectorAll('.skill-deck-card:not(.disabled)').forEach((card) => {
			/** @type {HTMLElement} */
			const htmlCard = /** @type {HTMLElement} */ (card);
			const skillId = htmlCard.dataset.skillId;
			const skillNode = activeSkills.find((s) => s.id === skillId);
			if (skillNode) {
				htmlCard.addEventListener('mouseenter', () => {
					const delay = (skillNode.delayCost || 1100) / Math.max(1, activeChar?.agi || 10);
					if (typeof EmberlightThreatOracle !== 'undefined' && typeof EmberlightThreatOracle.forecastActionTimeline === 'function') {
						const forecast = EmberlightThreatOracle.forecastActionTimeline(state.party || [], state.enemies || [], activeChar?.id, delay, 12);
						EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
							party: state.party || [],
							enemies: state.enemies || [],
							forecastQueue: forecast,
							bossIntent: (state.enemies || []).find((e) => e.isBoss && e.alive) || null,
						}, emit);
					}
					setEphemeralPreviewSkill(skillNode);
				});
				htmlCard.addEventListener('mouseleave', () => {
					if (typeof EmberlightThreatOracle !== 'undefined') {
						EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
							party: state.party || [],
							enemies: state.enemies || [],
							forecastQueue: state.forecastQueue || null,
							bossIntent: (state.enemies || []).find((e) => e.isBoss && e.alive) || null,
						}, emit);
					}
					setEphemeralPreviewSkill(null);
				});
				htmlCard.addEventListener('click', () => {
					emit({ type: 'SELECT_SKILL', skill: skillNode });
				});
			}
		});
	}

	/**
	 * Renders the item pouch subdeck or pouch target selector.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @param {CombatState} state Active combat state snapshot.
	 * @returns {void}
	 */
	function renderSubdeckPouch(subDeck, state) {
		if (!subDeck) return;
		if (state.pendingItem) {
			subDeck.innerHTML = `
        <div class="subdeck-target-selector">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:6px;">
            <span class="subdeck-title">USE ${state.pendingItem} ON ALLY:</span>
            <button type="button" class="cmd-btn" id="subdeck-cancel-item-btn" style="font-size:6px; padding:2px 8px;">[ESC] CANCEL</button>
          </div>
          <div class="target-selector-grid">
            ${(state.party || []).map((hero, idx) => {
				const isPhoenix = state.pendingItem === 'PHOENIX_EMBER';
				const canUse = isPhoenix ? !hero.alive : hero.alive;
				const hpPct = hero.maxHp > 0 ? Math.round((hero.hp / hero.maxHp) * 100) : 0;
				return `
                <button type="button" class="target-select-btn" data-item-target-idx="${idx}" ${canUse ? '' : 'disabled'}>
                  <div class="target-name">[${idx + 1}] ${hero.name} ${hero.alive ? '' : '(COLLAPSED)'}</div>
                  <div class="target-hp-bar">
                    <span class="bar-track"><span class="hud-bar-fill hp" style="width:${hpPct}%"></span></span>
                    <span class="target-hp-num">${hero.hp}/${hero.maxHp} HP</span>
                  </div>
                </button>
              `;
			}).join('')}
          </div>
        </div>
      `;

			const cancelBtn = subDeck.querySelector('#subdeck-cancel-item-btn');
			if (cancelBtn) {
				cancelBtn.addEventListener('click', () => emit({ type: 'CANCEL_ITEM' }));
			}

			subDeck.querySelectorAll('[data-item-target-idx]:not([disabled])').forEach((btn) => {
				/** @type {HTMLElement} */
				const htmlBtn = /** @type {HTMLElement} */ (btn);
				const idx = Number.parseInt(htmlBtn.dataset.itemTargetIdx || '0', 10);
				htmlBtn.addEventListener('click', () => {
					emit({ type: 'ITEM', itemId: state.pendingItem, targetIndex: idx });
				});
			});
			return;
		}

		const inv = state.inventory || {};
		const items = [
			{ id: 'POTION', name: 'Health Potion', effect: 'Restores 30 HP to an ally', count: inv.POTION || 0 },
			{ id: 'ETHER', name: 'Ether Flask', effect: 'Restores 15 MP to an ally', count: inv.ETHER || 0 },
			{ id: 'PHOENIX_EMBER', name: 'Phoenix Ember', effect: 'Revives fallen ally (50% HP)', count: inv.PHOENIX_EMBER || 0 },
		];

		subDeck.innerHTML = `
      <div class="pouch-deck-grid">
        ${items.map((item) => {
			const hasItem = item.count > 0;
			const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
			const icons = win.EmberlightIcons || win.EmberlightPartyIcons;
			const iconUrl = icons && typeof icons.get === 'function' ? icons.get(item.id) : null;
			return `
            <div class="pouch-deck-card ${hasItem ? '' : 'disabled'}" data-pouch-item-id="${item.id}">
              <div class="pouch-card-top">
                ${iconUrl ? `<img src="${iconUrl}" class="pouch-card-icon" alt="${item.name}" />` : ''}
                <div class="pouch-card-info">
                  <div class="pouch-card-name">${item.name}</div>
                  <div class="pouch-card-count">x${item.count}</div>
                </div>
              </div>
              <div class="pouch-card-desc">${item.effect}</div>
            </div>
          `;
		}).join('')}
      </div>
    `;

		subDeck.querySelectorAll('.pouch-deck-card:not(.disabled)').forEach((card) => {
			/** @type {HTMLElement} */
			const htmlCard = /** @type {HTMLElement} */ (card);
			const itemId = htmlCard.dataset.pouchItemId;
			htmlCard.addEventListener('click', () => {
				emit({ type: 'SELECT_ITEM', itemId });
			});
		});
	}

	/**
	 * Renders the guard action confirmation subdeck pane.
	 * @param {HTMLElement|null} subDeck Subdeck container element.
	 * @returns {void}
	 */
	function renderSubdeckGuard(subDeck) {
		if (!subDeck) return;
		subDeck.innerHTML = `
      <div class="guard-confirm-pane">
        <div class="guard-icon">🛡️</div>
        <div class="guard-desc">
          <b>Tactical Defensive Stance:</b><br/>
          Reduces all incoming damage by <b>50%</b> until next turn.<br/>
          Restores <b>2 MP</b> through tactical focus.
        </div>
        <button type="button" class="cmd-btn action guard-act-btn" id="confirm-guard-btn">CONFIRM GUARD STANCE</button>
      </div>
    `;
		const gBtn = subDeck.querySelector('#confirm-guard-btn');
		if (gBtn) {
			/** @type {HTMLElement} */
			const htmlBtn = /** @type {HTMLElement} */ (gBtn);
			htmlBtn.addEventListener('click', () => emit({ type: 'GUARD' }));
		}
	}
	//#endregion

	//#region [SEC-07] Action & Command Hub Renderers
	/**
	 * Renders the battle victory spoils panel.
	 * @param {HTMLElement} subDeck Subdeck container element.
	 * @param {HTMLElement|null} title Title element.
	 * @param {HTMLElement|null} tag Tag element.
	 * @param {HTMLElement} ribbon Primary ribbon container.
	 * @param {CombatState} state Active state snapshot.
	 * @returns {void}
	 */
	function renderVictoryView(subDeck, title, tag, ribbon, state) {
		if (title) title.textContent = '🏆 BATTLE VICTORY — SPOILS SECURED';
		if (tag) tag.textContent = 'Victory!';
		ribbon.innerHTML = '';
		const gainedGold = state.lastGainedGold !== undefined ? state.lastGainedGold : (state.rewards?.gold || 0);
		const gainedExp = state.lastGainedExp !== undefined ? state.lastGainedExp : (state.rewards?.exp || 0);
		const survivors = (state.party || []).filter((c) => c.alive).length;

		subDeck.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; text-align:center; background:rgba(12,18,32,0.92); border:1px solid var(--ember); border-radius:4px; box-shadow:0 0 16px rgba(255,157,77,0.3);">
        <div style="font-size:13px; font-weight:bold; color:var(--ember); margin-bottom:4px; text-shadow:0 0 10px var(--shadow-ember);">⚔️ VICTORY ACHIEVED ⚔️</div>
        <div style="font-size:7.5px; color:var(--ok); margin-bottom:6px;">All hostile threats vanquished. Spoils credited to squad inventory.</div>
        <div style="display:flex; gap:12px; font-size:7px; color:var(--text); margin-bottom:10px; background:rgba(0,0,0,0.5); padding:4px 10px; border-radius:3px; border:1px solid var(--border-dim);">
          <span>💰 Gold: <b style="color:var(--ember)">+${gainedGold}G</b></span>
          <span>⭐ EXP: <b style="color:#38bdf8">+${gainedExp}</b></span>
          <span>🛡️ Squad: <b style="color:var(--ok)">${survivors}/${(state.party || []).length} Standing</b></span>
        </div>
        <button type="button" class="cmd-btn action" id="victory-continue-btn" style="padding:6px 20px; font-size:8px; cursor:pointer;">▶ CONTINUE EXPEDITION [SPACE]</button>
      </div>
    `;
		const contBtn = subDeck.querySelector('#victory-continue-btn');
		if (contBtn) {
			/** @type {HTMLElement} */
			const htmlContBtn = /** @type {HTMLElement} */ (contBtn);
			htmlContBtn.addEventListener('click', (e) => {
				e.preventDefault();
				emit({ type: 'CONFIRM' });
			});
		}
	}

	/**
	 * Renders the expedition defeat panel.
	 * @param {HTMLElement} subDeck Subdeck container element.
	 * @param {HTMLElement|null} title Title element.
	 * @param {HTMLElement|null} tag Tag element.
	 * @param {HTMLElement} ribbon Primary ribbon container.
	 * @param {CombatState} state Active state snapshot.
	 * @returns {void}
	 */
	function renderDefeatView(subDeck, title, tag, ribbon, _state) {
		if (title) title.textContent = '💀 EXPEDITION DEFEAT';
		if (tag) tag.textContent = 'Defeat';
		ribbon.innerHTML = '';
		subDeck.innerHTML = `
      <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:12px; text-align:center; background:rgba(20,8,12,0.92); border:1px solid var(--danger); border-radius:4px; box-shadow:0 0 16px rgba(239,68,68,0.3);">
        <div style="font-size:13px; font-weight:bold; color:var(--danger); margin-bottom:4px;">💀 PARTY HAS FALLEN 💀</div>
        <div style="font-size:7.5px; color:var(--text-dim); margin-bottom:10px;">The squad collapsed in combat.</div>
        <button type="button" class="cmd-btn" id="defeat-continue-btn" style="padding:6px 20px; font-size:8px; border-color:var(--danger); color:var(--danger); cursor:pointer;">▲ ADVANCE TO HARBOR [SPACE]</button>
      </div>
    `;
		const contBtn = subDeck.querySelector('#defeat-continue-btn');
		if (contBtn) {
			/** @type {HTMLElement} */
			const htmlContBtn = /** @type {HTMLElement} */ (contBtn);
			htmlContBtn.addEventListener('click', (e) => {
				e.preventDefault();
				emit({ type: 'CONFIRM' });
			});
		}
	}

	/**
	 * Renders active command hub tabs and subdeck view.
	 * @param {CombatState} state Active state snapshot.
	 * @param {Battler|null} activeChar Active character battler.
	 * @param {HTMLElement} ribbon Ribbon container.
	 * @param {HTMLElement} subDeck Subdeck container.
	 * @param {HTMLElement|null} fleeBtn Flee button element.
	 * @param {string} selectedTab Selected tab identifier.
	 * @returns {void}
	 */
	function renderActiveCommandHub(state, activeChar, ribbon, subDeck, fleeBtn, selectedTab) {
		function previewDelay(delayCost) {
			if (!activeChar || typeof EmberlightThreatOracle === 'undefined') return;
			const forecast = typeof EmberlightThreatOracle.forecastActionTimeline === 'function'
				? EmberlightThreatOracle.forecastActionTimeline(state.party || [], state.enemies || [], activeChar.id, delayCost, 12)
				: EmberlightThreatOracle.calculateTimeline(state.party || [], state.enemies || [], 12);
			EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
				party: state.party,
				enemies: state.enemies,
				forecastQueue: forecast,
				bossIntent: state.enemies?.find((e) => e.isBoss && e.alive) || null,
			}, emit);
		}

		function restoreDelay() {
			if (typeof EmberlightThreatOracle === 'undefined') return;
			EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
				party: state.party,
				enemies: state.enemies,
				forecastQueue: state.forecastQueue || null,
				bossIntent: state.enemies?.find((e) => e.isBoss && e.alive) || null,
			}, emit);
		}

		const tabs = [
			{ id: 'ATTACK', label: '⚔️ ATTACK [1]', cls: 'action', delayCost: 1000 / Math.max(1, activeChar?.agi || 10) },
			{ id: 'SKILLS', label: '✨ SKILLS [2]', cls: 'skill', delayCost: 1100 / Math.max(1, activeChar?.agi || 10) },
			{ id: 'GUARD', label: '🛡️ GUARD [3]', cls: '', delayCost: 500 / Math.max(1, activeChar?.agi || 10) },
			{ id: 'POUCH', label: '🧪 POUCH [4]', cls: 'run', delayCost: 800 / Math.max(1, activeChar?.agi || 10) },
		];

		ribbon.innerHTML = tabs.map((tab) => `
      <button type="button" class="cmd-btn ${tab.cls} ${selectedTab === tab.id ? 'active-tab' : ''}" data-tab-id="${tab.id}">
        ${tab.label}
      </button>
    `).join('');

		ribbon.querySelectorAll('[data-tab-id]').forEach((btn) => {
			/** @type {HTMLElement} */
			const htmlBtn = /** @type {HTMLElement} */ (btn);
			const tabId = htmlBtn.dataset.tabId;
			const tabDef = tabs.find((t) => t.id === tabId);
			htmlBtn.addEventListener('mouseenter', () => { if (tabDef) previewDelay(tabDef.delayCost); });
			htmlBtn.addEventListener('mouseleave', () => restoreDelay());
			htmlBtn.addEventListener('click', () => {
				emit({ type: 'SELECT_TAB', tab: tabId });
			});
		});

		subDeck.innerHTML = '';
		if (selectedTab === 'ATTACK' || state.phase === 'TARGETING_ENEMY') {
			renderSubdeckAttack(subDeck, state, activeChar);
		} else if (selectedTab === 'SKILLS') {
			renderSubdeckSkills(subDeck, state, activeChar);
		} else if (selectedTab === 'POUCH') {
			renderSubdeckPouch(subDeck, state);
		} else if (selectedTab === 'GUARD') {
			renderSubdeckGuard(subDeck);
		}

		if (fleeBtn) {
			/** @type {HTMLElement} */
			const htmlFleeBtn = /** @type {HTMLElement} */ (fleeBtn);
			htmlFleeBtn.addEventListener('click', () => emit({ type: 'FLEE' }));
		}
	}

	/**
	 * Renders the primary action ribbon, command hub, victory/defeat panels, and tab event handlers.
	 * @param {CombatState} state Active combat state snapshot.
	 * @param {Battler|null} activeChar Active character battler object.
	 * @returns {void}
	 */
	function renderCommandHub(state, activeChar) {
		const ribbon = getElement('command-primary-ribbon');
		const subDeck = getElement('command-sub-deck');
		const title = getElement('command-deck-title');
		const tag = getElement('command-deck-tag');
		const fleeBtn = getElement('combat-flee-btn');
		if (!ribbon || !subDeck) return;

		const selectedTab = state.selectedTab || 'ATTACK';
		if (title) title.textContent = `🎯 ${activeChar ? (activeChar.name || 'HERO').toUpperCase() : 'PARTY'} COMMAND HUB`;
		if (tag) tag.textContent = `Active: ${selectedTab}`;

		if (state.phase === 'VICTORY') {
			renderVictoryView(subDeck, title, tag, ribbon, state);
			return;
		}

		if (state.phase === 'DEFEAT') {
			renderDefeatView(subDeck, title, tag, ribbon, state);
			return;
		}

		renderActiveCommandHub(state, activeChar, ribbon, subDeck, fleeBtn, selectedTab);
	}
	//#endregion

	//#region [SEC-08] Public VSRP-001 Tier-3 Interface Gateway
	/**
	 * Renders Quadrant 1: Spatial 8x6 battle room canvas with unit tokens & displacement vectors.
	 * @param {Object} q1Spatial Spatial projection slice.
	 * @param {CombatState} state Active combat state.
	 * @returns {void}
	 */
	function renderQ1SpatialCanvas(q1Spatial, _state) {
		lastQ1Spatial = q1Spatial;
		const canvas = /** @type {HTMLCanvasElement|null} */ (getElement('combat-spatial-canvas'));
		if (!canvas || typeof canvas.getContext !== 'function') return;
		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		const rect = canvas.parentElement?.getBoundingClientRect?.() || { width: 480, height: 260 };
		const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const w = Math.max(480, Math.floor(rect.width || 480));
		const h = Math.max(260, Math.floor(rect.height || 260));
		const expectedCanvasW = Math.floor(w * dpr);
		const expectedCanvasH = Math.floor(h * dpr);
		if (canvas.width !== expectedCanvasW || canvas.height !== expectedCanvasH) {
			canvas.width = expectedCanvasW;
			canvas.height = expectedCanvasH;
			if (typeof ctx.setTransform === 'function') {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.scale(dpr, dpr);
			}
		}

		if (typeof ctx.clearRect === 'function') {
			ctx.clearRect(0, 0, w, h);
		}

		// Deep dark space background
		ctx.fillStyle = '#050714';
		if (ctx.fillRect) ctx.fillRect(0, 0, w, h);

		const cols = 8;
		const rows = 6;
		const cellW = w / cols;
		const cellH = h / rows;

		// 1. Semi-transparent Tactical Sector Bands
		if (ctx.fillRect) {
			// Ally Rear (Col 0 - 1)
			ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
			ctx.fillRect(0, 0, cellW * 1.5, h);
			// Vanguard Front (Col 1.5 - 3)
			ctx.fillStyle = 'rgba(245, 158, 11, 0.06)';
			ctx.fillRect(cellW * 1.5, 0, cellW * 1.5, h);
			// Clash Zone (Col 3 - 5)
			ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
			ctx.fillRect(cellW * 3.0, 0, cellW * 2.0, h);
			// Hostile Front (Col 5 - 6.5)
			ctx.fillStyle = 'rgba(239, 68, 68, 0.06)';
			ctx.fillRect(cellW * 5.0, 0, cellW * 1.5, h);
			// Hostile Rear (Col 6.5 - 8)
			ctx.fillStyle = 'rgba(168, 85, 247, 0.05)';
			ctx.fillRect(cellW * 6.5, 0, cellW * 1.5, h);
		}

		// 2. High-Contrast Dark-Cyan Grid Lines
		if (ctx.beginPath && ctx.stroke) {
			ctx.save();
			ctx.strokeStyle = 'rgba(56, 189, 248, 0.12)';
			ctx.lineWidth = 1;
			for (let c = 0; c <= cols; c++) {
				ctx.beginPath();
				ctx.moveTo(c * cellW, 0);
				ctx.lineTo(c * cellW, h);
				ctx.stroke();
			}
			for (let r = 0; r <= rows; r++) {
				ctx.beginPath();
				ctx.moveTo(0, r * cellH);
				ctx.lineTo(w, r * cellH);
				ctx.stroke();
			}
			ctx.restore();
		}

		// 3. Tactical Zone Wireframe Headers & Sector Brackets
		if (ctx.fillText && ctx.strokeRect) {
			ctx.save();
			ctx.font = 'bold 9px monospace';

			// Ally Rear
			ctx.fillStyle = '#38bdf8';
			ctx.fillText('◖ ALLY REAR ◗', cellW * 0.2, 14);

			// Vanguard Front
			ctx.fillStyle = '#fbbf24';
			ctx.fillText('◈ VANGUARD FRONT ◈', cellW * 1.7, 14);

			// Clash Zone
			ctx.fillStyle = '#94a3b8';
			ctx.fillText('⚔ CLASH ZONE ⚔', cellW * 3.6, 14);

			// Hostile Front
			ctx.fillStyle = '#f87171';
			ctx.fillText('◈ HOSTILE FRONT ◈', cellW * 5.2, 14);

			// Hostile Rear
			ctx.fillStyle = '#c084fc';
			ctx.fillText('◖ HOSTILE REAR ◗', cellW * 6.7, 14);
			ctx.restore();
		}

		// 4. Hazard Walls with Tactical Cross-Hatching
		(q1Spatial?.hazardTiles || []).forEach((haz) => {
			const hx = haz.x * cellW;
			const hy = haz.y * cellH;
			if (ctx.fillRect && ctx.strokeRect) {
				ctx.save();
				ctx.fillStyle = 'rgba(239, 68, 68, 0.25)';
				ctx.fillRect(hx, hy, cellW, cellH);
				ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
				ctx.lineWidth = 1.5;
				ctx.strokeRect(hx + 1, hy + 1, cellW - 2, cellH - 2);

				// Diagonal hazard hashes
				if (ctx.beginPath && ctx.stroke) {
					ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
					ctx.lineWidth = 1;
					ctx.beginPath();
					ctx.moveTo(hx, hy);
					ctx.lineTo(hx + cellW, hy + cellH);
					ctx.moveTo(hx + cellW, hy);
					ctx.lineTo(hx, hy + cellH);
					ctx.stroke();
				}
				ctx.restore();
			}
			if (ctx.fillText) {
				ctx.fillStyle = '#fca5a5';
				ctx.font = 'bold 9.5px monospace';
				ctx.fillText('▲ WALL', hx + 4, hy + cellH / 2 + 3.5);
			}
		});

		// 5. Hostile Threat Vectors (Laser Lines Linking Enemies to Targeted Heroes)
		const threatVectors = q1Spatial?.threatVectors || [];
		threatVectors.forEach((vec) => {
			const enemyNode = (q1Spatial?.enemies || []).find((e) => e.id === vec.enemyId);
			const heroNode = (q1Spatial?.allies || []).find((h) => h.id === vec.targetHeroId) || (q1Spatial?.allies || [])[vec.heroIndex];
			if (enemyNode && heroNode && enemyNode.alive && heroNode.alive) {
				const fromCx = enemyNode.gridX * cellW + cellW / 2;
				const fromCy = enemyNode.gridY * cellH + cellH / 2;
				const toCx = heroNode.gridX * cellW + cellW / 2;
				const toCy = heroNode.gridY * cellH + cellH / 2;
				const isHovered = ephemeralHover && (ephemeralHover.id === enemyNode.id || ephemeralHover.id === heroNode.id);

				ctx.save();
				let strokeColor = 'rgba(239, 68, 68, 0.7)';
				let strokeW = 1.8;
				let blurVal = 6;
				if (isHovered) {
					strokeColor = '#ff9d4d';
					strokeW = 3.0;
					blurVal = 14;
				} else if (vec.isCharged) {
					strokeColor = '#ef4444';
					strokeW = 2.4;
					blurVal = 10;
				}

				ctx.shadowColor = strokeColor;
				ctx.shadowBlur = blurVal;
				ctx.strokeStyle = strokeColor;
				ctx.lineWidth = strokeW;

				ctx.beginPath();
				ctx.moveTo(fromCx, fromCy);
				ctx.lineTo(toCx, toCy);
				ctx.stroke();

				// Laser Arrowhead
				const angle = Math.atan2(toCy - fromCy, toCx - fromCx);
				const arrowLen = 8;
				ctx.beginPath();
				ctx.moveTo(toCx - Math.cos(angle - 0.45) * arrowLen, toCy - Math.sin(angle - 0.45) * arrowLen);
				ctx.lineTo(toCx, toCy);
				ctx.lineTo(toCx - Math.cos(angle + 0.45) * arrowLen, toCy - Math.sin(angle + 0.45) * arrowLen);
				ctx.fillStyle = strokeColor;
				ctx.fill();
				ctx.restore();
			}
		});

		// 6. Displacement Trajectory Vectors & Physics Wall-Slam Predictor
		const activeDisplacementVectors = [];
		if (ephemeralPreviewSkill?.displacement) {
			const disp = ephemeralPreviewSkill.displacement;
			(q1Spatial?.enemies || []).forEach((node) => {
				if (node.alive) {
					const toX = disp.type === 'KNOCKBACK' ? Math.min(7, node.gridX + (disp.tiles || 1)) : Math.max(5, node.gridX - (disp.tiles || 1));
					activeDisplacementVectors.push({
						fromX: node.gridX,
						fromY: node.gridY,
						toX,
						toY: node.gridY,
						type: disp.type,
						isWallImpact: toX >= 7,
					});
				}
			});
		} else {
			activeDisplacementVectors.push(...(q1Spatial?.activeVectors || []));
		}

		activeDisplacementVectors.forEach((vec) => {
			const fromCx = vec.fromX * cellW + cellW / 2;
			const fromCy = vec.fromY * cellH + cellH / 2;
			const toCx = vec.toX * cellW + cellW / 2;
			const toCy = vec.toY * cellH + cellH / 2;

			if (ctx.beginPath && ctx.stroke) {
				ctx.save();
				ctx.strokeStyle = '#38bdf8';
				ctx.lineWidth = 2.4;
				ctx.shadowColor = '#38bdf8';
				ctx.shadowBlur = 8;
				ctx.beginPath();
				ctx.moveTo(fromCx, fromCy);
				ctx.lineTo(toCx, toCy);
				ctx.stroke();

				// Arrowhead
				const angle = Math.atan2(toCy - fromCy, toCx - fromCx);
				ctx.beginPath();
				ctx.moveTo(toCx - Math.cos(angle - 0.5) * 8, toCy - Math.sin(angle - 0.5) * 8);
				ctx.lineTo(toCx, toCy);
				ctx.lineTo(toCx - Math.cos(angle + 0.5) * 8, toCy - Math.sin(angle + 0.5) * 8);
				ctx.fillStyle = '#38bdf8';
				ctx.fill();
				ctx.restore();
			}

			if (vec.isWallImpact && ctx.fillText) {
				ctx.save();
				ctx.fillStyle = '#fbbf24';
				ctx.shadowColor = '#fbbf24';
				ctx.shadowBlur = 10;
				ctx.font = 'bold 11px monospace';
				ctx.fillText('💥 WALL SLAM (+30% DMG)', toCx - 60, toCy - 16);
				ctx.restore();
			}
		});

		// 7. Party Crystal / Class Tokens
		(q1Spatial?.allies || q1Spatial?.partyFormation || []).forEach((ally) => {
			const cx = ally.gridX * cellW + cellW / 2;
			const cy = ally.gridY * cellH + cellH / 2;
			const size = 16;
			const isHovered = ephemeralHover && ephemeralHover.id === ally.id;

			// Active turn beacon ring
			if (ally.alive && ally.isCurrentTurn && ctx.arc && ctx.stroke) {
				ctx.save();
				const pulse = 1.0 + Math.sin(Date.now() * 0.007) * 0.18;
				ctx.beginPath();
				ctx.arc(cx, cy, (size + 6) * pulse, 0, Math.PI * 2);
				ctx.strokeStyle = '#fbbf24';
				ctx.lineWidth = 2.0;
				ctx.shadowColor = 'rgba(251, 191, 36, 0.9)';
				ctx.shadowBlur = 12;
				ctx.stroke();
				ctx.restore();
			}

			// Diamond Token Body
			ctx.save();
			ctx.beginPath();
			ctx.moveTo(cx, cy - size);
			ctx.lineTo(cx + size, cy);
			ctx.lineTo(cx, cy + size);
			ctx.lineTo(cx - size, cy);
			ctx.closePath();

			let allyFill = '#0f172a';
			let allyStroke = '#38bdf8';
			if (!ally.alive) {
				allyFill = '#1e293b';
				allyStroke = '#64748b';
			} else if (ally.isCurrentTurn) {
				allyFill = '#78350f';
				allyStroke = '#fbbf24';
			}

			ctx.fillStyle = allyFill;
			ctx.fill();
			ctx.strokeStyle = isHovered ? '#ff9d4d' : allyStroke;
			ctx.lineWidth = isHovered || ally.isCurrentTurn ? 2.5 : 1.6;
			if (isHovered) {
				ctx.shadowColor = '#ff9d4d';
				ctx.shadowBlur = 14;
			}
			ctx.stroke();
			ctx.restore();

			// Glyph / Phenotype Icon
			if (ctx.fillText) {
				ctx.save();
				ctx.fillStyle = ally.alive ? '#ffffff' : '#64748b';
				ctx.font = 'bold 9.5px monospace';
				if (ctx.textAlign) ctx.textAlign = 'center';
				const glyph = ally.phenotype === 'MAGE' ? '✨' : ally.phenotype === 'HEALER' ? '🌿' : ally.phenotype === 'WARRIOR' ? '🛡️' : '⚔️';
				ctx.fillText(glyph, cx, cy + 3.5);
				ctx.restore();
			}
		});

		// 8. Enemy Crystal / Hostile Hex Tokens
		(q1Spatial?.enemies || q1Spatial?.enemyFormation || []).forEach((enemy) => {
			const cx = enemy.gridX * cellW + cellW / 2;
			const cy = enemy.gridY * cellH + cellH / 2;
			const size = enemy.isBoss ? 19 : 15;
			const isHovered = ephemeralHover && ephemeralHover.id === enemy.id;

			// Hexagonal Token Body
			ctx.save();
			ctx.beginPath();
			for (let a = 0; a < 6; a++) {
				const angle = (Math.PI / 3) * a - Math.PI / 6;
				const hx = cx + size * Math.cos(angle);
				const hy = cy + size * Math.sin(angle);
				if (a === 0) ctx.moveTo(hx, hy);
				else ctx.lineTo(hx, hy);
			}
			ctx.closePath();

			let enemyFill = enemy.isBoss ? '#450a0a' : '#1e1b4b';
			let enemyStroke = enemy.isBoss ? '#ef4444' : '#a855f7';
			if (!enemy.alive) {
				enemyFill = '#0f172a';
				enemyStroke = '#475569';
			}

			ctx.fillStyle = enemyFill;
			ctx.fill();
			ctx.strokeStyle = isHovered ? '#ff9d4d' : enemyStroke;
			ctx.lineWidth = isHovered || enemy.isBoss ? 2.5 : 1.6;
			if (isHovered) {
				ctx.shadowColor = '#ff9d4d';
				ctx.shadowBlur = 14;
			}
			ctx.stroke();
			ctx.restore();

			// Glyph / Hostile Text
			if (ctx.fillText) {
				ctx.save();
				ctx.fillStyle = enemy.alive ? (enemy.isBoss ? '#fca5a5' : '#e9d5ff') : '#64748b';
				ctx.font = 'bold 9px monospace';
				if (ctx.textAlign) ctx.textAlign = 'center';
				const glyph = enemy.isBoss ? '👑' : (enemy.key && enemy.key.includes('SPIDER') ? '🕷️' : enemy.key && enemy.key.includes('ARCHER') ? '🏹' : '💀');
				ctx.fillText(glyph, cx, cy + 3.5);
				ctx.restore();
			}
		});

		// 8. Bind Pointer Events on Q1 Canvas Idempotently
		if (!q1EventsBound) {
			q1EventsBound = true;
			canvas.addEventListener('pointermove', (ev) => {
				const coords = getNormalizedCanvasCoords(canvas, ev);
				const gx = Math.floor(coords.normX * cols);
				const gy = Math.floor(coords.normY * rows);
				const enemies = (lastQ1Spatial?.enemies || []);
				const allies = (lastQ1Spatial?.allies || []);

				const hitEnemyIdx = enemies.findIndex((e) => e.gridX === gx && e.gridY === gy && e.alive);
				if (hitEnemyIdx !== -1) {
					const foe = enemies[hitEnemyIdx];
					setEphemeralHover({ id: foe.id, type: 'ENEMY', index: hitEnemyIdx });
					return;
				}

				const hitAllyIdx = allies.findIndex((a) => a.gridX === gx && a.gridY === gy && a.alive);
				if (hitAllyIdx !== -1) {
					const ally = allies[hitAllyIdx];
					setEphemeralHover({ id: ally.id, type: 'HERO', index: hitAllyIdx });
					return;
				}

				setEphemeralHover(null);
			});

			canvas.addEventListener('pointerleave', () => {
				setEphemeralHover(null);
			});

			canvas.addEventListener('click', (ev) => {
				const coords = getNormalizedCanvasCoords(canvas, ev);
				const gx = Math.floor(coords.normX * cols);
				const gy = Math.floor(coords.normY * rows);
				const enemies = (lastQ1Spatial?.enemies || []);
				const allies = (lastQ1Spatial?.allies || []);

				const hitEnemyIdx = enemies.findIndex((e) => e.gridX === gx && e.gridY === gy && e.alive);
				if (hitEnemyIdx !== -1) {
					const foe = enemies[hitEnemyIdx];
					emit({ type: 'SELECT_TARGET', targetIndex: hitEnemyIdx, isAlly: false, targetId: foe.id });
					return;
				}

				const hitAllyIdx = allies.findIndex((a) => a.gridX === gx && a.gridY === gy && a.alive);
				if (hitAllyIdx !== -1) {
					const ally = allies[hitAllyIdx];
					emit({ type: 'SELECT_TARGET', targetIndex: hitAllyIdx, isAlly: true, targetId: ally.id });
				}
			});

			const openQ1Radial = (clientX, clientY, gx, gy) => {
				openContextualRadial(clientX, clientY, {
					centerIcon: '🛰️',
					north: {
						icon: '▲',
						label: 'ADVANCE',
						onCommit: () => emit({ type: 'SET_ROW', row: 'FRONT' }),
						onHover: () => {},
					},
					east: {
						icon: '💥',
						label: 'TRIGGER',
						onCommit: () => emit({ type: 'FIELD_ACTION', action: 'TRIGGER_HAZARD', tileX: gx, tileY: gy }),
						onHover: () => {},
					},
					south: {
						icon: '▼',
						label: 'COVER',
						onCommit: () => emit({ type: 'SET_ROW', row: 'BACK' }),
						onHover: () => {},
					},
					west: {
						icon: '🧱',
						label: 'BARRIER',
						onCommit: () => emit({ type: 'FIELD_ACTION', action: 'PLACE_BARRICADE', tileX: gx, tileY: gy }),
						onHover: () => {},
					},
				});
			};

			canvas.addEventListener('contextmenu', (ev) => {
				ev?.preventDefault?.();
				const coords = getNormalizedCanvasCoords(canvas, ev);
				const gx = Math.floor(coords.normX * cols);
				const gy = Math.floor(coords.normY * rows);
				openQ1Radial(ev.clientX, ev.clientY, gx, gy);
			});

			canvas.addEventListener('pointerdown', (ev) => {
				if (ev.button === 2) {
					ev.preventDefault();
					const coords = getNormalizedCanvasCoords(canvas, ev);
					const gx = Math.floor(coords.normX * cols);
					const gy = Math.floor(coords.normY * rows);
					openQ1Radial(ev.clientX, ev.clientY, gx, gy);
				}
			});
		}
	}

	const battlerImageMap = new Map();

	/**
	 * Returns or caches an HTMLImageElement for a given asset data URL.
	 * @param {string} url Data URL string.
	 * @returns {HTMLImageElement|null}
	 */
	function getCachedBattlerImage(url) {
		if (!url) return null;
		if (battlerImageMap.has(url)) {
			return battlerImageMap.get(url);
		}
		if (typeof Image !== 'undefined') {
			const img = new Image();
			img.src = url;
			battlerImageMap.set(url, img);
			return img;
		}
		return null;
	}

	/**
	 * Renders Quadrant 2: 3D Eye-Level Arena Battlers on Canvas (AOP-COMBAT-STATION-002).
	 * @param {Object} q2Clash Clash theater projection slice.
	 * @param {CombatState} state Active combat state.
	 * @returns {void}
	 */
	function renderQ2ClashCanvas(q2Clash, state) {
		lastQ2Clash = q2Clash;
		const canvas = /** @type {HTMLCanvasElement|null} */ (getElement('combat-backdrop-canvas'));
		if (!canvas) return;
		const ctx = canvas.getContext ? canvas.getContext('2d') : null;
		if (!ctx) return;

		const enemies = state.enemies || [];
		if (enemies.length === 0) return;

		const rect = canvas.parentElement?.getBoundingClientRect?.() || { width: 600, height: 300 };
		const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;
		const W = Math.max(600, Math.floor(rect.width || 600));
		const H = Math.max(300, Math.floor(rect.height || 300));
		const expectedCanvasW = Math.floor(W * dpr);
		const expectedCanvasH = Math.floor(H * dpr);
		if (canvas.width !== expectedCanvasW || canvas.height !== expectedCanvasH) {
			canvas.width = expectedCanvasW;
			canvas.height = expectedCanvasH;
			if (typeof ctx.setTransform === 'function') {
				ctx.setTransform(1, 0, 0, 1, 0, 0);
				ctx.scale(dpr, dpr);
			}
		}

		renderedEnemyBounds = [];

		const frontEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'FRONT' || e.row === 'BOTH' || !e.row);
		const backEnemies = enemies.map((e, idx) => ({ e, idx })).filter(({ e }) => e.row === 'BACK');

		const drawEnemyBattler = (enemy, idx, zScale, yPosBase, count, slotIdx) => {
			const spacing = W / (count + 1);
			const x = spacing * (slotIdx + 1);
			const y = yPosBase;
			const isBoss = Boolean(enemy.isBoss || (enemy.key && String(enemy.key).toUpperCase().includes('BOSS')));
			const effectiveScale = (isBoss ? zScale * 1.35 : zScale);
			const spriteSize = 96 * effectiveScale;
			const isHovered = ephemeralHover && ephemeralHover.id === enemy.id;

			// Register pixel-accurate bounding box for normalized hit-testing
			if (enemy.alive) {
				renderedEnemyBounds.push({
					x: x - spriteSize / 2,
					y: y - spriteSize / 2,
					w: spriteSize,
					h: spriteSize,
					enemy,
					index: idx,
				});
			}

			// 1. Contact Shadow on floor
			if (ctx.beginPath && ctx.ellipse && ctx.fill) {
				ctx.save();
				ctx.beginPath();
				ctx.ellipse(x, y + spriteSize / 2 - 2, spriteSize * 0.45, spriteSize * 0.14, 0, 0, Math.PI * 2);
				ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
				ctx.fill();
				ctx.restore();
			}

			// 2. Boss Aura / Enrage Glow
			if (isBoss && enemy.alive && ctx.beginPath && ctx.arc && ctx.fill) {
				ctx.save();
				const pulse = 1.0 + Math.sin(Date.now() * 0.006) * 0.15;
				ctx.beginPath();
				ctx.arc(x, y, (spriteSize / 2 + 10) * pulse, 0, Math.PI * 2);
				ctx.fillStyle = enemy.phaseTwoActive ? 'rgba(239, 68, 68, 0.25)' : 'rgba(168, 85, 247, 0.2)';
				ctx.fill();
				ctx.restore();
			}

			// 3. Battler Sprite (Baked Sprite)
			const { isBossEnraged, heatPulse } = resolveBossDetails(enemy);
			const url = resolveEnemyBattlerUrl(enemy, isBossEnraged, heatPulse);
			const img = url ? getCachedBattlerImage(url) : null;

			ctx.save();
			if (!enemy.alive) {
				ctx.globalAlpha = 0.35;
				if (ctx.filter) ctx.filter = 'grayscale(100%)';
			}

			if (img?.complete && img.naturalWidth > 0 && ctx.drawImage) {
				ctx.drawImage(img, x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
			} else if (ctx.fillText) {
				let placeholderFill = '#64748b';
				if (enemy.alive) {
					placeholderFill = isBoss ? '#ef4444' : '#a855f7';
				}
				ctx.fillStyle = placeholderFill;
				if (ctx.fillRect) ctx.fillRect(x - spriteSize / 2, y - spriteSize / 2, spriteSize, spriteSize);
				ctx.fillStyle = '#ffffff';
				ctx.font = `bold ${Math.round(18 * effectiveScale)}px sans-serif`;
				if (ctx.textAlign) ctx.textAlign = 'center';
				ctx.fillText(enemy.sprite || '👾', x, y + 6);
			}
			ctx.restore();

			// 4. High-Tech Amber HUD Targeting Bracket [ ] on Hover/Selection or Focus Fire
			const isFocusTarget = enemy.id === focusFireTargetId;
			if ((isHovered || isFocusTarget) && enemy.alive && ctx.beginPath && ctx.stroke) {
				ctx.save();
				ctx.strokeStyle = isFocusTarget ? '#f59e0b' : '#ff9d4d';
				ctx.lineWidth = isFocusTarget ? 3.5 : 2.5;
				ctx.shadowColor = isFocusTarget ? 'rgba(245, 158, 11, 0.95)' : 'rgba(255, 157, 77, 0.85)';
				ctx.shadowBlur = isFocusTarget ? 14 : 8;
				const pad = isFocusTarget ? 8 : 6;
				const bx = x - spriteSize / 2 - pad;
				const by = y - spriteSize / 2 - pad;
				const bw = spriteSize + pad * 2;
				const bh = spriteSize + pad * 2;
				const corner = 12;

				// Top-Left
				ctx.beginPath();
				ctx.moveTo(bx, by + corner);
				ctx.lineTo(bx, by);
				ctx.lineTo(bx + corner, by);
				ctx.stroke();

				// Top-Right
				ctx.beginPath();
				ctx.moveTo(bx + bw - corner, by);
				ctx.lineTo(bx + bw, by);
				ctx.lineTo(bx + bw, by + corner);
				ctx.stroke();

				// Bottom-Left
				ctx.beginPath();
				ctx.moveTo(bx, by + bh - corner);
				ctx.lineTo(bx, by + bh);
				ctx.lineTo(bx + corner, by + bh);
				ctx.stroke();

				// Bottom-Right
				ctx.beginPath();
				ctx.moveTo(bx + bw - corner, by + bh);
				ctx.lineTo(bx + bw, by + bh);
				ctx.lineTo(bx + bw, by + bh - corner);
				ctx.stroke();

				if (isFocusTarget && ctx.fillText) {
					ctx.fillStyle = '#f59e0b';
					ctx.font = 'bold 10px monospace';
					if (ctx.textAlign) ctx.textAlign = 'center';
					ctx.fillText('🎯 FOCUS PRIORITY', x, by - 8);
				}

				ctx.restore();
			}

			// 5. Floating HUD: HP Gauge & Nameplate
			if (enemy.alive && ctx.fillRect && ctx.fillText) {
				ctx.save();
				const barW = Math.max(56, Math.round(spriteSize * 0.9));
				const barH = 5;
				const barY = y - spriteSize / 2 - 14;
				const curHp = enemy.hp !== undefined ? enemy.hp : (enemy.maxHp || 1);
				const maxHp = enemy.maxHp || 1;
				const hpPct = Math.max(0, Math.min(100, (curHp / maxHp) * 100));

				// Bar Background
				ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
				ctx.fillRect(x - barW / 2 - 1, barY - 1, barW + 2, barH + 2);

				// Bar Fill
				let hpBarFill = '#10b981';
				if (hpPct <= 30) {
					hpBarFill = '#ef4444';
				} else if (isBoss) {
					hpBarFill = '#f59e0b';
				}
				ctx.fillStyle = hpBarFill;
				ctx.fillRect(x - barW / 2, barY, Math.round(barW * (hpPct / 100)), barH);

				// Name Text with Hover Illumination and Dark Backing Plate
				let foeNameColor = '#f8fafc';
				if (isHovered) {
					foeNameColor = '#ff9d4d';
				} else if (isBoss) {
					foeNameColor = '#fca5a5';
				}
				ctx.fillStyle = foeNameColor;
				const fontSize = Math.max(10, Math.round(11 * Math.max(1.0, effectiveScale)));
				ctx.font = `bold ${fontSize}px monospace`;
				if (ctx.textAlign) ctx.textAlign = 'center';
				ctx.fillText(enemy.name || 'Foe', x, barY - 5);
				ctx.restore();
			}
		};

		// Draw Back Row First (Depth Sort)
		backEnemies.forEach(({ e, idx }, slotIdx) => {
			drawEnemyBattler(e, idx, 0.75, H * 0.48, backEnemies.length, slotIdx);
		});

		// Draw Front Row Second
		frontEnemies.forEach(({ e, idx }, slotIdx) => {
			drawEnemyBattler(e, idx, 1.05, H * 0.64, frontEnemies.length, slotIdx);
		});

		// 6. Bind Pointer Events on Q2 Backdrop Canvas Idempotently
		if (!q2EventsBound) {
			q2EventsBound = true;

			const findEnemyHitAtCoords = (coords) => {
				let closest = null;
				let minD = Infinity;
				for (const b of renderedEnemyBounds) {
					if (!b.enemy?.alive) continue;
					const cx = b.x + b.w / 2;
					const cy = b.y + b.h / 2;
					const d = Math.hypot(coords.x - cx, coords.y - cy);
					const radius = Math.max(40, b.w / 2 + 10);
					if (d <= radius && d < minD) {
						minD = d;
						closest = b;
					}
				}
				return closest;
			};

			canvas.addEventListener('pointermove', (ev) => {
				const coords = getNormalizedCanvasCoords(canvas, ev);
				const hit = findEnemyHitAtCoords(coords);
				if (hit) {
					setEphemeralHover({ id: hit.enemy.id, type: 'ENEMY', index: hit.index });
				} else {
					setEphemeralHover(null);
				}
			});

			canvas.addEventListener('pointerleave', () => {
				setEphemeralHover(null);
			});

			canvas.addEventListener('click', (ev) => {
				const coords = getNormalizedCanvasCoords(canvas, ev);
				const hit = findEnemyHitAtCoords(coords);
				if (hit) {
					emit({ type: 'SELECT_TARGET', targetIndex: hit.index, isAlly: false, targetId: hit.enemy.id });
				}
			});

			const openQ2Radial = (clientX, clientY, hit) => {
				openContextualRadial(clientX, clientY, {
					centerIcon: '🎯',
					north: {
						icon: '⚔️',
						label: 'EXECUTE',
						onCommit: () => emit({ type: 'ATTACK', targetIndex: hit.index }),
						onHover: () => setEphemeralHover({ id: hit.enemy.id, type: 'ENEMY', index: hit.index }),
					},
					east: {
						icon: '🔄',
						label: 'DISPLACE',
						onCommit: () => {
							const activeChar = state.turnQueue?.[state.activeTurnIndex]?.entity || state.party?.[0];
							const skills = collectHeroSkills(activeChar);
							const dispSkill = skills.find((s) => s.displacement || s.subType === 'strike') || skills[0];
							if (dispSkill) {
								emit({ type: 'SKILL', skill: dispSkill, targetIndex: hit.index, isAlly: false });
							} else {
								emit({ type: 'ATTACK', targetIndex: hit.index });
							}
						},
						onHover: () => setEphemeralHover({ id: hit.enemy.id, type: 'ENEMY', index: hit.index }),
					},
					south: {
						icon: '🎯',
						label: 'FOCUS',
						onCommit: () => {
							focusFireTargetId = (focusFireTargetId === hit.enemy.id ? null : hit.enemy.id);
							scheduleSynchronizedRedraw();
						},
						onHover: () => setEphemeralHover({ id: hit.enemy.id, type: 'ENEMY', index: hit.index }),
					},
					west: {
						icon: '🔍',
						label: 'INSPECT',
						onCommit: () => setEphemeralHover({ id: hit.enemy.id, type: 'ENEMY', index: hit.index }),
						onHover: () => setEphemeralHover({ id: hit.enemy.id, type: 'ENEMY', index: hit.index }),
					},
				});
			};

			canvas.addEventListener('contextmenu', (ev) => {
				ev?.preventDefault?.();
				ev?.stopPropagation?.();
				if (Date.now() < suppressContextMenuUntil) return;
				const coords = getNormalizedCanvasCoords(canvas, ev);
				const hit = findEnemyHitAtCoords(coords);
				if (hit) {
					openQ2Radial(ev.clientX, ev.clientY, hit);
				}
			});

			canvas.addEventListener('pointerdown', (ev) => {
				if (ev.button === 2) {
					ev.preventDefault();
					ev.stopPropagation();
					if (Date.now() < suppressContextMenuUntil) return;
					const coords = getNormalizedCanvasCoords(canvas, ev);
					const hit = findEnemyHitAtCoords(coords);
					if (hit) {
						openQ2Radial(ev.clientX, ev.clientY, hit);
					}
				}
			});
		}
	}

	/**
	 * Renders Quadrant 3: Threat Oracle 3-tier console (CTB, Intent Vectors, Elemental Affinity).
	 * @param {Object} q3Oracle Oracle projection slice.
	 * @param {CombatState} state Active combat state.
	 * @returns {void}
	 */
	function renderQ3ThreatOracleDeck(q3Oracle, _state) {
		lastQ3Oracle = q3Oracle;
		const intentFeedEl = getElement('oracle-intent-feed');
		if (intentFeedEl && q3Oracle?.threatVectors) {
			if (q3Oracle.threatVectors.length === 0) {
				intentFeedEl.innerHTML = '<div style="color:var(--text-dim); font-size:6.5px">No hostile threats detected.</div>';
			} else {
				intentFeedEl.innerHTML = q3Oracle.threatVectors.map((vec) => `
					<div class="intent-beacon-item ${vec.isCharged ? 'charged' : ''}" data-enemy-id="${vec.enemyId}" data-hero-id="${vec.targetHeroId || ''}">
						<span class="intent-target-lead">🎯 <strong>${vec.enemyName}</strong> ➔ <span style="color:#38bdf8">${vec.targetHeroName}</span></span>
						<span class="intent-badge ${vec.isCharged ? 'charged' : ''}">${vec.isCharged ? '⚡ CHARGED' : '⚔️ STRIKE'}</span>
					</div>
				`).join('');

				intentFeedEl.querySelectorAll('.intent-beacon-item').forEach((beacon) => {
					/** @type {HTMLElement} */
					const htmlBeacon = /** @type {HTMLElement} */ (beacon);
					const enemyId = htmlBeacon.dataset.enemyId;
					htmlBeacon.addEventListener('mouseenter', () => {
						if (enemyId) setEphemeralHover({ id: enemyId, type: 'ENEMY', index: 0 });
					});
					htmlBeacon.addEventListener('mouseleave', () => setEphemeralHover(null));
				});
			}
		}

		const affinityContainer = getElement('oracle-affinity-badges');
		if (affinityContainer && q3Oracle?.enemies) {
			const livingFoes = (q3Oracle.enemies || []).filter((e) => e.alive);
			if (livingFoes.length > 0) {
				const activeFoe = livingFoes[0];
				const badges = [];
				(activeFoe.weaknesses || []).forEach((w) => {
					badges.push(`<span class="affinity-badge weak">WEAK: ${w} (1.5x)</span>`);
				});
				(activeFoe.resistances || []).forEach((r) => {
					badges.push(`<span class="affinity-badge resist">RESIST: ${r} (0.5x)</span>`);
				});
				(activeFoe.immunities || []).forEach((i) => {
					badges.push(`<span class="affinity-badge immune">IMMUNE: ${i} (0.0x)</span>`);
				});
				affinityContainer.innerHTML = badges.join('') || '<span style="font-size:6px; color:var(--text-dim)">ELEMENTAL MATRIX: NEUTRAL</span>';
			}
		}
	}

	/**
	 * Renders Quadrant 4: Physical Hero Battler Pedestal Stage & Arched Vitals (AOP-COMBAT-STATION-002).
	 * @param {Object} q4Deck Deck projection slice.
	 * @param {CombatState} state Active combat state.
	 * @returns {void}
	 */
	function renderQ4HeroChassisGrid(q4Deck, state) {
		lastQ4Deck = q4Deck;
		const chassisGrid = getElement('combat-hero-chassis-grid');
		if (!chassisGrid || !q4Deck?.partyVitals) return;

		chassisGrid.innerHTML = '';
		const isFlareActive = Boolean(ephemeralHover);

		q4Deck.partyVitals.forEach((hero, idx) => {
			const stage = document.createElement('div');
			const isHovered = ephemeralHover && ephemeralHover.id === hero.id;
			const isFlareHero = isFlareActive && hero.isCurrentTurn;
			stage.className = `hero-pedestal-stage ${hero.isCurrentTurn ? 'active-turn' : ''} ${isHovered ? 'hovered' : ''} ${isFlareHero ? 'the-flare-active' : ''} ${!hero.alive ? 'fainted' : ''}`;
			stage.id = `hero-chassis-${hero.id || idx}`;

			const curHp = hero.hp !== undefined ? hero.hp : (hero.maxHp || 1);
			const maxHp = hero.maxHp || 1;
			const curMp = hero.mp !== undefined ? hero.mp : (hero.maxMp || 1);
			const maxMp = hero.maxMp || 1;
			const hpPct = Math.max(0, Math.min(100, (curHp / maxHp) * 100));
			const mpPct = Math.max(0, Math.min(100, (curMp / maxMp) * 100));
			const isCritical = hero.alive && hpPct <= 30;

			// Dual Arc Stroke Calculations (GPU Composited)
			// HP Arc: Radius 42, length ~125
			const hpOffset = Math.max(0, Math.min(125, 125 * (1 - hpPct / 100)));
			// MP Arc: Radius 34, length ~100
			const mpOffset = Math.max(0, Math.min(100, 100 * (1 - mpPct / 100)));

			// Hero Battler Sprite Resolution
			const avatarUrl = resolvePartyBattlerUrl(hero) ||
				(typeof EmberlightPartyIcons !== 'undefined' && typeof EmberlightPartyIcons.get === 'function' ? EmberlightPartyIcons.get(hero.phenotype) : null) ||
				(typeof EmberlightIcons !== 'undefined' && typeof EmberlightIcons.get === 'function' ? EmberlightIcons.get(hero.phenotype) : null);

			stage.innerHTML = `
				<div class="hero-arched-vitals-container">
					<svg class="hero-arched-vitals-svg" viewBox="0 0 100 60" aria-hidden="true">
						<!-- Background Tracks -->
						<path class="vital-arc-track" d="M 12 55 A 42 42 0 0 1 88 55" />
						<path class="vital-arc-track mp" d="M 20 55 A 34 34 0 0 1 80 55" />
						<!-- Active HP Arc -->
						<path class="vital-arc-hp ${isCritical ? 'critical' : ''}" d="M 12 55 A 42 42 0 0 1 88 55" style="stroke-dashoffset: ${hpOffset}px;" />
						<!-- Active MP Arc -->
						<path class="vital-arc-mp" d="M 20 55 A 34 34 0 0 1 80 55" style="stroke-dashoffset: ${mpOffset}px;" />
					</svg>
					<div class="hero-battler-avatar-wrap">
						${avatarUrl ? `<img src="${avatarUrl}" alt="${hero.name}" class="hero-battler-avatar" />` : `<div style="font-size: 28px;">🧙‍♂️</div>`}
					</div>
					<div class="hero-pedestal-base"></div>
				</div>
				<div class="hero-pedestal-meta">
					<div class="hero-pedestal-header">
						<span>${hero.name}</span>
						<span class="hero-pedestal-row-tag ${hero.row || 'FRONT'}">${hero.row || 'FRONT'}</span>
					</div>
					<div class="hero-pedestal-vals">
						<span class="val-hp ${isCritical ? 'low' : ''}">HP ${curHp}/${maxHp}</span>
						<span class="val-mp">MP ${curMp}/${maxMp}</span>
					</div>
				</div>
			`;

			stage.addEventListener('mouseenter', () => {
				setEphemeralHover({ id: hero.id, type: 'HERO', index: idx });
			});
			stage.addEventListener('mouseleave', () => {
				setEphemeralHover(null);
			});

			stage.addEventListener('click', () => {
				emit({ type: 'SELECT_TARGET', targetIndex: idx, isAlly: true, targetId: hero.id });
			});

			if (hero.isCurrentTurn) {
				const openQ4Radial = (clientX, clientY) => {
					const activeChar = state.turnQueue?.[state.activeTurnIndex]?.entity || state.party?.[idx];
					const defaultEnemy = (state.enemies || []).find((e) => e.alive) || state.enemies?.[0];
					const skills = collectHeroSkills(activeChar);

					openContextualRadial(clientX, clientY, {
						centerIcon: '⚔️',
						north: {
							icon: '⚔️',
							label: 'STRIKE',
							onCommit: (meta) => {
								emit({ type: 'ATTACK', ...(meta || {}) });
							},
							onHover: () => {
								if (activeChar && defaultEnemy) {
									renderBasicTelemetry(activeChar, defaultEnemy, getElement('telemetry-dmg-range'), getElement('telemetry-hit-rate'), getElement('telemetry-affinity-tag'));
								}
							},
						},
						east: {
							icon: '✨',
							label: 'SKILLS',
							onCommit: (meta) => {
								if (skills.length > 0) {
									emit({ type: 'SKILL', skill: skills[0], ...(meta || {}) });
								} else {
									emit({ type: 'SELECT_TAB', tab: 'SKILLS', ...(meta || {}) });
								}
							},
							onHover: () => {
								if (skills.length > 0 && activeChar && defaultEnemy) {
									setEphemeralPreviewSkill(skills[0]);
									renderSkillTelemetry(activeChar, defaultEnemy, skills[0], getElement('telemetry-dmg-range'), getElement('telemetry-hit-rate'), getElement('telemetry-affinity-tag'));
								}
							},
						},
						south: {
							icon: '🛡️',
							label: 'GUARD',
							onCommit: (meta) => {
								emit({ type: 'GUARD', ...(meta || {}) });
							},
							onHover: () => {
								const tDmg = getElement('telemetry-dmg-range');
								const tHit = getElement('telemetry-hit-rate');
								const tAff = getElement('telemetry-affinity-tag');
								if (tDmg) tDmg.textContent = 'STANCE: DEFENSIVE (-50% DMG)';
								if (tHit) tHit.textContent = 'RECOVERY: +2 MP';
								if (tAff) tAff.textContent = 'GUARD BUFF';
							},
						},
						west: {
							icon: '🎒',
							label: 'POUCH',
							onCommit: (meta) => {
								emit({ type: 'SELECT_TAB', tab: 'POUCH', ...(meta || {}) });
							},
							onHover: () => {},
						},
					});
				};

				stage.addEventListener('contextmenu', (ev) => {
					ev?.preventDefault?.();
					ev?.stopPropagation?.();
					if (Date.now() < suppressContextMenuUntil) return;
					const rect = stage.getBoundingClientRect();
					openQ4Radial(ev.clientX || (rect.left + rect.width / 2), ev.clientY || (rect.top + rect.height / 2));
				});

				stage.addEventListener('pointerdown', (ev) => {
					if (ev.button === 2) {
						ev.preventDefault();
						ev.stopPropagation();
						if (Date.now() < suppressContextMenuUntil) return;
						openQ4Radial(ev.clientX, ev.clientY);
					}
				});
			}

			if (chassisGrid.appendChild) chassisGrid.appendChild(stage);
		});
	}

	return {
		/**
		 * Configures the combat presentation driver.
		 * @param {Object} [config={}] Configuration parameters dictionary.
		 * @returns {Readonly<Object>} Acceptance descriptor.
		 */
		configure(config = {}) {
			return Object.freeze({
				accepted: true,
				driverId: 'combat_renderer',
				requestedConfig: { ...config },
			});
		},

		/**
		 * Sets the ephemeral hover target across all 4 quadrants without mutating simulation state.
		 * @param {{ id: string, type: string, index: number }|null} hoverTarget Hover payload or null.
		 * @returns {void}
		 */
		setEphemeralHover(hoverTarget) {
			setEphemeralHover(hoverTarget);
		},

		/**
		 * Sets the ephemeral preview skill for real-time trajectory and CTB forecasting.
		 * @param {SkillNode|null} skill Skill node preview object or null.
		 * @returns {void}
		 */
		setEphemeralPreviewSkill(skill) {
			setEphemeralPreviewSkill(skill);
		},

		/**
		 * Dispatches an action token to the simulation engine.
		 * @param {CombatActionToken} action Action token payload.
		 * @returns {void}
		 */
		dispatchAction(action) {
			emit(action);
		},

		/**
		 * Initializes the combat presentation driver.
		 * @param {CombatContext} context Host context container.
		 * @returns {void}
		 */
		init(context) {
			mounted = true;
			hostContext = context;
		},

		/**
		 * Renders the combat viewport state to the DOM presentation layer.
		 * @param {CombatState} state Active combat state snapshot.
		 * @param {function(CombatActionToken): void} [dispatch] Action dispatch handler.
		 * @returns {void}
		 */
		render(state, dispatch) {
			if (!state) return;
			mounted = true;
			lastCombatState = state;
			lastQ2Clash = state.q2Clash || lastQ2Clash;
			if (typeof dispatch === 'function') {
				actionHandler = dispatch;
			}

			const activeChar = state.turnQueue?.[state.activeTurnIndex]?.entity || state.party?.[0];
			const defaultEnemy = (state.enemies || []).find((e) => e.alive) || state.enemies?.[0];

			const backdropCanvas = getElement('combat-backdrop-canvas');
			if (backdropCanvas && typeof EmberlightCombatBackdrop !== 'undefined' && typeof EmberlightCombatBackdrop.render === 'function') {
				if (typeof EmberlightCombatBackdrop.setOverlayRenderer === 'function') {
					EmberlightCombatBackdrop.setOverlayRenderer(() => {
						if (lastCombatState) {
							renderQ2ClashCanvas(lastQ2Clash, lastCombatState);
						}
					});
				}
				EmberlightCombatBackdrop.render('combat-backdrop-canvas');
				renderQ2ClashCanvas(lastQ2Clash, state);
			}

			if (typeof EmberlightThreatOracle !== 'undefined' && typeof EmberlightThreatOracle.render === 'function') {
				EmberlightThreatOracle.render('combat-ctb-ribbon-bar', {
					party: state.party || [],
					enemies: state.enemies || [],
					forecastQueue: state.forecastQueue || null,
					bossIntent: (state.enemies || []).find((e) => e.isBoss && e.alive) || null,
					selectedAction: state.pendingSkill || { type: state.selectedTab || 'ATTACK' },
				}, emit);
			}

			renderEnemyWing(getElement('enemy-row'), state, activeChar);
			renderPartyWing(getElement('party-grid'), state);
			renderActionTheater(activeChar, defaultEnemy, state);
			renderCommandHub(state, activeChar);
			syncDOMHighlighting();
		},

		/**
		 * Renders the 4-Quadrant War Table projection DTO (AOP-COMBAT-STATION-002).
		 * @param {Object} projection Frozen 4-quadrant projection object.
		 * @param {function(CombatActionToken): void} [dispatch] Action dispatch handler.
		 * @returns {void}
		 */
		renderWarTable(projection, dispatch) {
			if (!projection) return;
			const state = projection.snapshot || projection;
			lastCombatState = state;
			if (projection.q1Spatial) lastQ1Spatial = projection.q1Spatial;
			if (projection.q2Clash) lastQ2Clash = projection.q2Clash;
			if (projection.q3Oracle) lastQ3Oracle = projection.q3Oracle;
			if (projection.q4Deck) lastQ4Deck = projection.q4Deck;

			this.render(state, dispatch);

			// Render Quadrant 1: Spatial Canvas (8x6 Grid, Token Nodes, Trajectory Vectors)
			if (projection.q1Spatial) {
				renderQ1SpatialCanvas(projection.q1Spatial, state);
			}

			// Render Quadrant 2: 3D Eye-Level Arena Battlers on Canvas
			if (projection.q2Clash) {
				renderQ2ClashCanvas(projection.q2Clash, state);
			}

			// Render Quadrant 3: Threat Oracle 3-Tier Console (CTB, Intent Feed, Affinity)
			if (projection.q3Oracle) {
				renderQ3ThreatOracleDeck(projection.q3Oracle, state);
			}

			// Render Quadrant 4: Hero Chassis Cards Grid & Radial Socket
			if (projection.q4Deck) {
				renderQ4HeroChassisGrid(projection.q4Deck, state);
			}

			syncDOMHighlighting();
		},

		/**
		 * Starts harmonic channeling visual effects.
		 * @param {SkillNode|null} node Skill node being channeled.
		 * @param {function(number): void} [onComplete] Completion callback.
		 * @returns {void}
		 */
		startHarmonicChanneling(node, onComplete) {
			emit({ type: 'CHANNELING_STARTED', nodeId: node?.id || null });
			if (typeof onComplete === 'function') {
				onComplete(100);
			}
		},

		/**
		 * Opens a contextual radial chassis menu at the given client coordinates.
		 * @param {number} clientX Screen X coordinate.
		 * @param {number} clientY Screen Y coordinate.
		 * @param {Object} config Contextual radial configuration dictionary.
		 * @returns {void}
		 */
		openRadial(clientX, clientY, config) {
			openContextualRadial(clientX, clientY, config);
		},

		/**
		 * Closes any active contextual radial menu.
		 * @returns {void}
		 */
		closeRadial() {
			closeContextualRadial();
		},

		/**
		 * Returns real-time diagnostic telemetry for the combat renderer.
		 * @returns {CombatDiagnostics} Diagnostic report object.
		 */
		getDiagnostics() {
			return {
				driverId: 'combat_renderer',
				mounted,
				hasHostContext: Boolean(hostContext),
			};
		},

		/**
		 * Purges runtime allocations and resets driver states.
		 * @returns {void}
		 */
		destroy() {
			closeContextualRadial();
			actionHandler = null;
			mounted = false;
			ephemeralHover = null;
			ephemeralPreviewSkill = null;
			focusFireTargetId = null;
			q1EventsBound = false;
			q2EventsBound = false;
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightCombatRenderer = EmberlightCombatRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightCombatRenderer;
}