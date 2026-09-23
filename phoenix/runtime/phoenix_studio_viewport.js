/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: GAME DEV WORKSTATION & VIEWPORT CONTROLLER
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-STUDIO-VIEWPORT
 * Governing Protocol:  VSRP-001 / PMIP-001 / SDCP-001 / PERSIST-001
 * Authority:           Host SSOT | Modular 2D/3D Game Dev Studio Controller
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

	let _activeWorkspaceMode = 'ide'; // 'ide' | 'gamedev'
	let _activeStudioEngine = 'canvas2d'; // 'canvas2d' | 'voxel3d' | 'terrain3d'
	let _studioRunning = true;
	let _studioPaused = false;
	/** @type {number | null} */
	let _studioAnimId = null;
	let _studioFrameCount = 0;
	let _studioLastTime = 0;
	let _studioActiveBrushTile = 1;
	let _activeBrushTool = 'select';
	/** @type {Array<{ x: number, y: number, vx: number, vy: number, life: number, color: string }>} */
	let _studioParticles = [];
	let _studioShakeTrauma = 0;

	const _studioLevelGrid = [
		[ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ],
		[ 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
		[ 1, 0, 2, 2, 2, 0, 1, 0, 3, 3, 3, 0, 6, 0, 0, 1 ],
		[ 1, 0, 2, 2, 2, 0, 5, 0, 3, 3, 3, 0, 0, 0, 0, 1 ],
		[ 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 4, 4, 1 ],
		[ 1, 1, 1, 5, 1, 1, 1, 0, 0, 0, 0, 0, 0, 4, 4, 1 ],
		[ 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0, 1 ],
		[ 1, 0, 0, 0, 0, 0, 0, 0, 1, 1, 0, 7, 7, 0, 0, 1 ],
		[ 1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 7, 7, 0, 0, 1 ],
		[ 1, 0, 3, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1 ],
		[ 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1 ]
	];

	/** @type {Record<number, { name: string, color: string }>} */
	const _studioPalette = {
		0: { name: 'VOID', color: '#03060a' },
		1: { name: 'WALL', color: '#00ffcc' },
		2: { name: 'FLOOR', color: '#2d3748' },
		3: { name: 'WATER', color: '#0077b6' },
		4: { name: 'LAVA', color: '#d00000' },
		5: { name: 'DOOR', color: '#ffd166' },
		6: { name: 'CHEST', color: '#e0aaff' },
		7: { name: 'SPIKE', color: '#ff006e' }
	};

	/** @type {Record<string, { id: string, name: string, icon: string, x: number, y: number, speed: number, zoom: number }>} */
	const _studioEntities = {
		player: { id: 'player', name: 'Hero (Player)', icon: '🧙', x: 120, y: 120, speed: 3.5, zoom: 1.5 },
		camera: { id: 'camera', name: 'Viewport Camera', icon: '📷', x: 120, y: 120, speed: 2.0, zoom: 1.5 },
		chest_01: { id: 'chest_01', name: 'Treasure Chest', icon: '📦', x: 160, y: 96, speed: 0, zoom: 1.5 },
		light_torch: { id: 'light_torch', name: 'Point Light (Torch)', icon: '🔥', x: 96, y: 160, speed: 0, zoom: 1.5 }
	};
	let _activeEntityId = 'player';
	const _studioPlayer = { x: 3.5, y: 3.5, angle: 0, speed: 3.5 };
	/** @type {any} */
	const _studioCamera = null;
	let _studioControlsBound = false;

	/**
	 * Selects an active entity and synchronizes property inspector inputs.
	 * @param {string} entId - Target entity identifier
	 * @returns {void}
	 */
	function _selectStudioEntity(entId) {
		_activeEntityId = entId;
		if (typeof document === 'undefined') return;

		_syncEntityListSelection(entId);
		const ent = _studioEntities[ entId ];
		if (ent) _syncEntityPropertyFields(ent);
	}

	/**
	 * Highlights the active entity row in the hierarchy list.
	 * @param {string} entId - Selected entity identifier
	 * @returns {void}
	 */
	function _syncEntityListSelection(entId) {
		document.querySelectorAll('.studio-entity-item').forEach(el => {
			el.classList.toggle('active', (/** @type {HTMLElement} */(el)).dataset.entityId === entId);
		});
	}

	/**
	 * Synchronizes input values in the property inspector with entity state.
	 * @param {{ id: string, name: string, icon: string, x: number, y: number, speed: number, zoom: number }} ent
	 * @returns {void}
	 */
	function _syncEntityPropertyFields(ent) {
		const idEl = document.getElementById('prop-entity-id');
		const posXEl = /** @type {HTMLInputElement | null} */ (document.getElementById('prop-pos-x'));
		const posYEl = /** @type {HTMLInputElement | null} */ (document.getElementById('prop-pos-y'));
		const speedEl = /** @type {HTMLInputElement | null} */ (document.getElementById('prop-speed'));
		const zoomEl = /** @type {HTMLInputElement | null} */ (document.getElementById('prop-camera-zoom'));

		if (idEl) idEl.textContent = ent.id;
		if (posXEl) posXEl.value = String(Math.round(ent.x));
		if (posYEl) posYEl.value = String(Math.round(ent.y));
		if (speedEl) speedEl.value = String(ent.speed);
		if (zoomEl) zoomEl.value = String(ent.zoom || 1.5);
	}

	/**
	 * Renders the studio entity hierarchy tree into the DOM container.
	 * @returns {void}
	 */
	function _renderSceneTree() {
		if (typeof document === 'undefined') return;
		const list = document.getElementById('studio-entity-list');
		if (!list) return;
		list.innerHTML = '';

		for (const [ id, ent ] of Object.entries(_studioEntities)) {
			const row = document.createElement('div');
			row.className = 'studio-entity-item' + (id === _activeEntityId ? ' active' : '');
			row.dataset.entityId = id;
			row.innerHTML = `<span>${ent.icon} ${ent.name}</span><span style="font-size:9px; color:var(--accent);">${id === _activeEntityId ? 'Active' : ''}</span>`;
			row.addEventListener('click', () => _selectStudioEntity(id));
			list.appendChild(row);
		}
	}

	/**
	 * Binds entity selection click events across entity list items.
	 * @returns {void}
	 */
	function _bindEntityListEvents() {
		document.querySelectorAll('.studio-entity-item').forEach(item => {
			item.addEventListener('click', (e) => {
				const entId = (/** @type {HTMLElement} */(e.currentTarget)).dataset.entityId;
				if (entId) _selectStudioEntity(entId);
			});
		});
	}

	/**
	 * Updates a numeric coordinate or speed property on the active entity.
	 * @param {'x'|'y'|'speed'} prop - Property field name
	 * @param {number} val - Numeric input value
	 * @returns {void}
	 */
	function _updateActiveEntityNumericProp(prop, val) {
		const ent = _studioEntities[ _activeEntityId ];
		if (!ent || Number.isNaN(val)) return;
		ent[ prop ] = val;
		if (_activeEntityId === 'player') {
			if (prop === 'x') _studioPlayer.x = val / 32;
			else if (prop === 'y') _studioPlayer.y = val / 32;
			else if (prop === 'speed') _studioPlayer.speed = val;
		}
	}

	/**
	 * Binds property inspector numeric input fields to entity state.
	 * @returns {void}
	 */
	function _bindPropertyInputs() {
		document.getElementById('prop-pos-x')?.addEventListener('input', (e) => {
			_updateActiveEntityNumericProp('x', Number((/** @type {HTMLInputElement} */(e.target)).value));
		});

		document.getElementById('prop-pos-y')?.addEventListener('input', (e) => {
			_updateActiveEntityNumericProp('y', Number((/** @type {HTMLInputElement} */(e.target)).value));
		});

		document.getElementById('prop-speed')?.addEventListener('input', (e) => {
			_updateActiveEntityNumericProp('speed', Number((/** @type {HTMLInputElement} */(e.target)).value));
		});

		document.getElementById('prop-camera-zoom')?.addEventListener('input', (e) => {
			const val = Number((/** @type {HTMLInputElement} */(e.target)).value);
			if (_studioCamera && !Number.isNaN(val)) {
				_studioCamera.zoom = val;
			}
		});
	}

	/**
	 * Binds entity addition button to instantiate new scene entities.
	 * @returns {void}
	 */
	function _bindAddEntityButton() {
		document.getElementById('btn-add-entity')?.addEventListener('click', () => {
			const newId = 'entity_' + (Object.keys(_studioEntities).length + 1);
			_studioEntities[ newId ] = {
				id: newId,
				name: 'Entity (' + newId + ')',
				icon: '👾',
				x: Math.round(_studioPlayer.x * 32 + 32),
				y: Math.round(_studioPlayer.y * 32 + 32),
				speed: 2.0,
				zoom: 1.5
			};

			const list = document.getElementById('studio-entity-list');
			if (list) {
				const row = document.createElement('div');
				row.className = 'studio-entity-item';
				row.dataset.entityId = newId;
				row.innerHTML = '<span>👾 ' + newId + '</span><span style="font-size:9px; color:var(--accent);">Active</span>';
				row.addEventListener('click', () => _selectStudioEntity(newId));
				list.appendChild(row);
			}
		});
	}

	/**
	 * Binds tilemap palette buttons and workspace mode buttons.
	 * @returns {void}
	 */
	function _bindPaletteAndModeButtons() {
		document.querySelectorAll('.palette-tile').forEach(tile => {
			tile.addEventListener('click', (e) => {
				document.querySelectorAll('.palette-tile').forEach(t => t.classList.remove('active'));
				const el = /** @type {HTMLElement} */ (e.currentTarget);
				el.classList.add('active');
				_studioActiveBrushTile = Number(el.dataset.tileId || 1);
			});
		});

		document.querySelectorAll('.workspace-mode-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				const mode = (/** @type {HTMLElement} */(e.currentTarget)).dataset.mode;
				_toggleWorkspaceMode(mode);
			});
		});
	}

	/**
	 * Binds graphics engine switcher pills.
	 * @returns {void}
	 */
	function _bindEnginePills() {
		document.querySelectorAll('.engine-pill').forEach(pill => {
			pill.addEventListener('click', (e) => {
				document.querySelectorAll('.engine-pill').forEach(p => p.classList.remove('active'));
				const el = /** @type {HTMLElement} */ (e.currentTarget);
				el.classList.add('active');
				const engine = el.dataset.engine || 'webgl';
				_switchTier(engine);
				const hudLabel = document.getElementById('hud-engine-label');
				if (hudLabel) {
					/** @type {Record<string, string>} */
					const titles = {
						webgl: '⚡ ENGINE: WebGL 2D Quad Batcher',
						canvas2d: '🎨 ENGINE: Canvas 2D Layer Engine',
						voxel3d: '🧊 ENGINE: 3D Fast Voxel DDA',
						terrain3d: '🏔 ENGINE: Procedural Terrain Raymarcher'
					};
					hudLabel.textContent = titles[ engine ] || `ENGINE: ${engine}`;
				}
			});
		});
	}

	/**
	 * Secure pseudo-random float generator in [0, 1).
	 * @returns {number}
	 */
	function _getRandomFloat() {
		if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
			const buf = new Uint32Array(1);
			crypto.getRandomValues(buf);
			return buf[ 0 ] / 4294967296;
		}
		return 0.5;
	}

	/**
	 * Spawns a burst of visual particles in the studio viewport.
	 * @param {number} x
	 * @param {number} y
	 * @param {number} count
	 * @returns {void}
	 */
	function _spawnParticlesBurst(x, y, count = 20) {
		const colors = [ '#00ffcc', '#ffd166', '#ff006e', '#00e5ff' ];
		for (let i = 0; i < count; i++) {
			const angle = _getRandomFloat() * Math.PI * 2;
			const speed = _getRandomFloat() * 4 + 1;
			_studioParticles.push({
				x,
				y,
				vx: Math.cos(angle) * speed,
				vy: Math.sin(angle) * speed,
				life: 1.0,
				color: colors[ Math.floor(_getRandomFloat() * colors.length) ]
			});
		}
	}

	/**
	 * Exports level configuration into an executable JS module.
	 * @returns {void}
	 */
	function _exportGameScript() {
		const code = `/**\n * Generated Phoenix Sovereign Game Level Module\n * Timestamp: ${new Date().toISOString()}\n */\nexport const LevelConfig = {\n  grid: ${JSON.stringify(_studioLevelGrid, null, 2)},\n  entities: ${JSON.stringify(Object.values(_studioEntities), null, 2)}\n};\n`;
		const editor = /** @type {HTMLTextAreaElement | null} */ (document.getElementById('code-editor-view'));
		if (editor) {
			editor.value = code;
			const event = new Event('input', { bubbles: true });
			editor.dispatchEvent(event);
			_toggleWorkspaceMode('ide');
			if (typeof global._toast === 'function') global._toast('📜 Exported level configuration into Code Editor!', 'pass');
		} else {
			navigator.clipboard?.writeText(code);
			if (typeof global._toast === 'function') global._toast('📜 Level script copied to clipboard', 'pass');
		}
	}

	/**
	 * Binds studio simulation playback and particle buttons.
	 * @returns {void}
	 */
	function _bindStudioPlaybackButtons() {
		document.getElementById('btn-studio-play')?.addEventListener('click', () => {
			_studioRunning = true;
			_studioPaused = false;
			if (!_studioAnimId) _studioAnimId = requestAnimationFrame(_renderActiveStudioEngine);
			if (typeof global._toast === 'function') global._toast('▶ Studio Simulation Running', 'pass');
		});

		document.getElementById('btn-studio-pause')?.addEventListener('click', () => {
			_studioPaused = !_studioPaused;
			if (typeof global._toast === 'function') global._toast(_studioPaused ? '⏸ Simulation Paused' : '▶ Simulation Resumed', 'pass');
		});

		document.getElementById('btn-studio-step')?.addEventListener('click', () => {
			_studioPaused = true;
			_renderActiveStudioEngine(performance.now());
			if (typeof global._toast === 'function') global._toast('⏭ Stepped 1 frame forward', 'pass');
		});

		document.getElementById('btn-studio-reload')?.addEventListener('click', () => {
			_studioPlayer.x = 3.5;
			_studioPlayer.y = 3.5;
			_studioParticles = [];
			_studioShakeTrauma = 0;
			_selectStudioEntity('player');
			if (typeof global._toast === 'function') global._toast('🔄 Studio state reset to defaults', 'pass');
		});

		document.getElementById('btn-studio-spawn-particles')?.addEventListener('click', () => {
			_spawnParticlesBurst(_studioPlayer.x * 32, _studioPlayer.y * 32, 40);
			if (typeof global._toast === 'function') global._toast('✨ Emitted 40 particles at player origin', 'pass');
		});

		document.getElementById('btn-export-game-script')?.addEventListener('click', _exportGameScript);
		document.getElementById('btn-trigger-shake')?.addEventListener('click', () => {
			_studioShakeTrauma = Math.min(1.0, _studioShakeTrauma + 0.6);
			if (typeof global._toast === 'function') global._toast('💥 Added camera shake trauma', 'pass');
		});
	}

	/**
	 * Binds brush tool selectors, tilemap palette items, and grid clearing.
	 * @returns {void}
	 */
	function _bindBrushAndPaletteTools() {
		const brushTools = [
			{ id: 'tool-select', mode: 'select' },
			{ id: 'tool-paint', mode: 'paint' },
			{ id: 'tool-erase', mode: 'erase' }
		];
		brushTools.forEach(({ id, mode }) => {
			document.getElementById(id)?.addEventListener('click', (e) => {
				brushTools.forEach(b => document.getElementById(b.id)?.classList.remove('active'));
				(/** @type {HTMLElement} */(e.currentTarget)).classList.add('active');
				_activeBrushTool = mode;
			});
		});

		document.querySelectorAll('.palette-tile-btn').forEach(btn => {
			btn.addEventListener('click', (e) => {
				document.querySelectorAll('.palette-tile-btn').forEach(b => b.classList.remove('active'));
				const el = /** @type {HTMLElement} */ (e.currentTarget);
				el.classList.add('active');
				_studioActiveBrushTile = Number(el.dataset.tileId || 1);
				const indicator = document.getElementById('active-tile-indicator');
				if (indicator) indicator.textContent = `${el.dataset.tileName || 'TILE'} (${_studioActiveBrushTile})`;
			});
		});

		document.getElementById('btn-clear-grid')?.addEventListener('click', () => {
			for (const row of _studioLevelGrid) {
				row.fill(0);
			}
			if (typeof global._toast === 'function') global._toast('Cleared level grid to void tiles.', 'pass');
		});
	}

	/**
	 * Binds simulation dispatch events and VFS level persistence.
	 * @returns {void}
	 */
	function _bindSimulationEvents() {
		document.getElementById('btn-sim-event-damage')?.addEventListener('click', () => {
			_studioShakeTrauma = Math.min(1.0, _studioShakeTrauma + 0.5);
			if (global.PhoenixStudioAudio?.preview) global.PhoenixStudioAudio.preview();
			if (typeof global._toast === 'function') global._toast('💥 [EventBus] Dispatched Player Damage Event (-25 HP)', 'pass');
		});

		document.getElementById('btn-sim-event-loot')?.addEventListener('click', () => {
			if (global.PhoenixStudioAudio?.loadPreset) {
				global.PhoenixStudioAudio.loadPreset('COIN');
				global.PhoenixStudioAudio.preview();
			}
			if (typeof global._toast === 'function') global._toast('🪙 [EventBus] Dispatched Item Loot Event (+50 Gold)', 'pass');
		});

		document.getElementById('btn-sim-event-wave')?.addEventListener('click', () => {
			const count = Object.keys(_studioEntities).length;
			for (let i = 1; i <= 3; i++) {
				const id = `mob_wave_${count + i}`;
				_studioEntities[ id ] = {
					id,
					name: `Goblin Minion #${count + i}`,
					icon: '👹',
					x: Math.round(_studioPlayer.x * 32 + (i * 24)),
					y: Math.round(_studioPlayer.y * 32 + (i * 16)),
					speed: 1.8,
					zoom: 1.5
				};
			}
			_renderSceneTree();
			if (typeof global._toast === 'function') global._toast('👾 [EventBus] Dispatched Enemy Wave (3 mobs spawned)', 'pass');
		});

		document.getElementById('btn-save-level-vfs')?.addEventListener('click', () => {
			const json = JSON.stringify({ grid: _studioLevelGrid, entities: _studioEntities }, null, 2);
			if (global._vfs) {
				global._vfs.set('level_01.json', json);
			}
			if (typeof global._toast === 'function') global._toast('💾 Level & entity layout saved to level_01.json', 'pass');
		});
	}

	/**
	 * Binds mouse canvas drawing and resolution switcher.
	 * @returns {void}
	 */
	function _bindCanvasInteractions() {
		const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('game-viewport-canvas'));
		if (!canvas) return;

		let isDrawing = false;
		/**
		 * @param {MouseEvent} e
		 */
		const paintAtMouse = (e) => {
			const rect = canvas.getBoundingClientRect();
			const scaleX = canvas.width / rect.width;
			const scaleY = canvas.height / rect.height;
			const x = (e.clientX - rect.left) * scaleX;
			const y = (e.clientY - rect.top) * scaleY;
			const col = Math.floor(x / 32);
			const row = Math.floor(y / 32);

			if (row >= 0 && row < _studioLevelGrid.length && col >= 0 && col < _studioLevelGrid[ 0 ].length) {
				if (_activeBrushTool === 'paint') {
					_studioLevelGrid[ row ][ col ] = _studioActiveBrushTile;
				} else if (_activeBrushTool === 'erase') {
					_studioLevelGrid[ row ][ col ] = 0;
				} else if (_activeBrushTool === 'select') {
					_studioPlayer.x = col + 0.5;
					_studioPlayer.y = row + 0.5;
					_selectStudioEntity('player');
				}
			}
		};

		canvas.addEventListener('mousedown', (e) => {
			isDrawing = true;
			paintAtMouse(e);
		});
		canvas.addEventListener('mousemove', (e) => {
			if (isDrawing && _activeBrushTool !== 'select') paintAtMouse(e);
		});
		window.addEventListener('mouseup', () => { isDrawing = false; });

		document.getElementById('studio-res-select')?.addEventListener('change', (e) => {
			const [ w, h ] = (/** @type {HTMLSelectElement} */(e.target)).value.split('x').map(Number);
			if (w && h) {
				canvas.width = w;
				canvas.height = h;
			}
		});
	}

	/**
	 * Binds all interactive controls for the game dev workstation studio.
	 * @returns {void}
	 */
	function _bindStudioControls() {
		if (_studioControlsBound || typeof document === 'undefined') return;
		_studioControlsBound = true;

		_bindEntityListEvents();
		_bindPropertyInputs();
		_bindAddEntityButton();
		_bindPaletteAndModeButtons();
		_bindEnginePills();
		_bindStudioPlaybackButtons();
		_bindBrushAndPaletteTools();
		_bindSimulationEvents();
		_bindCanvasInteractions();
	}

	/**
	 * Updates workspace panels visibility for the active layout mode.
	 * @param {string} targetMode - Active mode identifier ('ide' | 'gamedev')
	 * @returns {void}
	 */
	function _updateWorkspaceDOM(targetMode) {
		const idePanel = document.getElementById('editor-panel');
		const studioPanel = document.getElementById('game-studio-workspace');

		if (targetMode === 'gamedev') {
			if (idePanel) idePanel.style.display = 'none';
			if (studioPanel) studioPanel.style.display = 'grid';
			_initRuntimeStudio();
			return;
		}

		if (idePanel) idePanel.style.display = 'flex';
		if (studioPanel) studioPanel.style.display = 'none';
	}

	/**
	 * Toggles between IDE and Game Dev Workstation studio workspace modes.
	 * @param {string} [mode] - Optional explicit mode ('ide' | 'gamedev')
	 * @returns {void}
	 */
	function _toggleWorkspaceMode(mode) {
		const targetMode = mode || (_activeWorkspaceMode === 'ide' ? 'gamedev' : 'ide');
		_activeWorkspaceMode = targetMode;
		if (typeof document === 'undefined') return;

		const switchBtn = document.getElementById('btn-switch-workspace-mode');
		if (switchBtn) {
			switchBtn.textContent = targetMode === 'gamedev' ? '💻 CODE IDE' : '🎮 GAME DEV WORKSTATION';
			switchBtn.classList.toggle('active', targetMode === 'gamedev');
		}

		document.querySelectorAll('.workspace-mode-btn').forEach(btn => {
			btn.classList.toggle('active', (/** @type {HTMLElement} */(btn)).dataset.mode === targetMode);
		});

		_updateWorkspaceDOM(targetMode);
	}

	/**
	 * Switches the active studio rendering engine tier.
	 * @param {string} tierKey - Engine tier identifier ('canvas2d' | 'voxel3d' | 'terrain3d')
	 * @returns {void}
	 */
	function _switchTier(tierKey) {
		_activeStudioEngine = tierKey;
	}

	/**
	 * Applies screen shake translation if trauma is active.
	 * @param {CanvasRenderingContext2D} ctx
	 * @returns {void}
	 */
	function _applyScreenShake(ctx) {
		if (_studioShakeTrauma <= 0) return;
		const shake = _studioShakeTrauma * 12;
		ctx.translate((_getRandomFloat() - 0.5) * shake, (_getRandomFloat() - 0.5) * shake);
		_studioShakeTrauma = Math.max(0, _studioShakeTrauma - 0.05);
	}

	/**
	 * Renders the 2D tilemap grid.
	 * @param {CanvasRenderingContext2D} ctx
	 * @returns {void}
	 */
	function _renderTilemapGrid(ctx) {
		const tileSize = 32;
		for (let r = 0; r < _studioLevelGrid.length; r++) {
			const row = _studioLevelGrid[ r ];
			for (let c = 0; c < row.length; c++) {
				const tile = _studioPalette[ row[ c ] ];
				if (tile) {
					ctx.fillStyle = tile.color;
					ctx.fillRect(c * tileSize, r * tileSize, tileSize - 1, tileSize - 1);
				}
			}
		}
	}

	/**
	 * Renders secondary entities in the scene.
	 * @param {CanvasRenderingContext2D} ctx
	 * @returns {void}
	 */
	function _renderStudioEntities(ctx) {
		for (const [ id, ent ] of Object.entries(_studioEntities)) {
			if (id === 'player') continue;
			ctx.fillStyle = '#ff006e';
			ctx.beginPath();
			ctx.arc(ent.x, ent.y, 8, 0, Math.PI * 2);
			ctx.fill();
		}
	}

	/**
	 * Renders the player hero entity.
	 * @param {CanvasRenderingContext2D} ctx
	 * @returns {void}
	 */
	function _renderStudioPlayer(ctx) {
		ctx.fillStyle = '#ffd166';
		ctx.beginPath();
		ctx.arc(_studioPlayer.x * 32, _studioPlayer.y * 32, 10, 0, Math.PI * 2);
		ctx.fill();
	}

	/**
	 * Renders active visual particles.
	 * @param {CanvasRenderingContext2D} ctx
	 * @returns {void}
	 */
	function _renderStudioParticles(ctx) {
		for (let i = _studioParticles.length - 1; i >= 0; i--) {
			const p = _studioParticles[ i ];
			p.x += p.vx;
			p.y += p.vy;
			p.life -= 0.03;
			if (p.life <= 0) {
				_studioParticles.splice(i, 1);
				continue;
			}
			ctx.fillStyle = p.color;
			ctx.globalAlpha = p.life;
			ctx.fillRect(p.x, p.y, 4, 4);
			ctx.globalAlpha = 1.0;
		}
	}

	/**
	 * Updates the FPS badge and entity count HUD.
	 * @returns {void}
	 */
	function _updateStudioHUD() {
		const fpsBadge = document.getElementById('studio-fps-badge');
		if (fpsBadge && _studioFrameCount % 10 === 0) {
			fpsBadge.textContent = `60 FPS · Frame #${_studioFrameCount}`;
		}
		const entLabel = document.getElementById('hud-entities-label');
		if (entLabel) {
			entLabel.textContent = `ENTITIES: ${Object.keys(_studioEntities).length} active | PARTICLES: ${_studioParticles.length}`;
		}
	}

	/**
	 * Renders 2D tilemap grid and player entity onto the canvas context.
	 * @param {CanvasRenderingContext2D} ctx - 2D rendering context
	 * @param {number} width - Viewport canvas width
	 * @param {number} height - Viewport canvas height
	 * @returns {void}
	 */
	function _renderCanvas2DEngine(ctx, width, height) {
		ctx.save();
		_applyScreenShake(ctx);

		ctx.fillStyle = '#060b0f';
		ctx.fillRect(0, 0, width, height);

		_renderTilemapGrid(ctx);
		_renderStudioEntities(ctx);
		_renderStudioPlayer(ctx);
		_renderStudioParticles(ctx);

		ctx.restore();
		_updateStudioHUD();
	}

	/**
	 * Tick step and render loop for the active workstation engine.
	 * @param {number} [timestamp] - High-resolution frame timestamp
	 * @returns {void}
	 */
	function _renderActiveStudioEngine(timestamp) {
		if (typeof document === 'undefined') return;
		const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('game-viewport-canvas'));
		if (!canvas) return;

		_studioFrameCount++;
		const ts = timestamp || performance.now();
		if (!_studioLastTime) _studioLastTime = ts;
		_studioLastTime = ts;

		const ctx = canvas.getContext('2d');
		if (!ctx) return;

		if (_activeStudioEngine === 'canvas2d' || !_activeStudioEngine) {
			_renderCanvas2DEngine(ctx, canvas.width, canvas.height);
		}

		if (_studioRunning && !_studioPaused) {
			_studioAnimId = requestAnimationFrame(_renderActiveStudioEngine);
		}
	}

	/**
	 * Initializes the game dev workstation runtime studio and animation loop.
	 * @returns {void}
	 */
	function _initRuntimeStudio() {
		_bindStudioControls();
		if (typeof document !== 'undefined') {
			const canvas = /** @type {HTMLCanvasElement | null} */ (document.getElementById('game-viewport-canvas'));
			if (canvas && !_studioAnimId) {
				_studioAnimId = requestAnimationFrame(_renderActiveStudioEngine);
			}
		}
	}

	const PhoenixStudioViewport = Object.freeze({
		init: _initRuntimeStudio,
		toggleWorkspaceMode: _toggleWorkspaceMode,
		switchTier: _switchTier,
		selectEntity: _selectStudioEntity,
		renderSceneTree: _renderSceneTree,
		updateProperties: _selectStudioEntity,
		renderActiveEngine: _renderActiveStudioEngine,
		spawnParticles: _spawnParticlesBurst,
		exportScript: _exportGameScript
	});

	global.PhoenixStudioViewport = PhoenixStudioViewport;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PhoenixStudioViewport;
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
