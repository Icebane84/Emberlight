/**
 * ============================================================================
 * EMBERLIGHT SOVEREIGN ENGINE: MARKET DOM PRESENTATION RENDERER
 * Document Identifier: VSRP-001-MARKET-RENDERER
 * Governing Protocol:  VSRP-001
 * Authority:           Peripheral Presentation
 * ============================================================================
 * 
 * TABLE OF CONTENTS & NAVIGATION ANCHORS:
 *   [SEC-01] Type Definitions, Module State & DOM/Emission Helpers
 *   [SEC-02] Manifest & Item Data Accessors
 *   [SEC-03] Character Equipment & Stat Diff Computation
 *   [SEC-04] Public VSRP-001 Tier-3 Interface Gateway
 * ============================================================================
 */

/**
 * @typedef {Object} MarketActionToken
 * @property {string} type Action token type.
 * @property {string} [tab] Target tab name ('BUY' | 'SELL').
 * @property {string} [itemId] Item identifier key.
 */

/**
 * @typedef {Record<string, number>} ItemStats
 */

/**
 * @typedef {Object} ItemDefinition
 * @property {string} id Unique item identifier.
 * @property {string} label Display label.
 * @property {string} desc Description text.
 * @property {number} cost Base monetary cost.
 * @property {string} [slot] Equipment slot ('weapon', 'armor', etc.).
 * @property {ItemStats} [stats] Item stat bonuses.
 * @property {string[]} [allowedPhenotypes] Allowed class phenotypes.
 * @property {string[]} [allowedClasses] Allowed classes alias.
 */

/**
 * @typedef {Object} ShopStockEntry
 * @property {string} itemId Item identifier.
 * @property {number} maxQuantity Maximum available quantity.
 */

/**
 * @typedef {Object} ShopDefinition
 * @property {string} label Display name of shop.
 * @property {string} merchantName Name of merchant.
 * @property {number} [buyRate] Buy price multiplier.
 * @property {number} [sellRate] Sell price multiplier.
 * @property {ShopStockEntry[]} [stock] Stock entry array.
 */

/**
 * @typedef {Object} CharacterBattler
 * @property {string} name Character display name.
 * @property {string} phenotype Character class phenotype.
 * @property {number} hp Current HP.
 * @property {number} maxHp Max HP.
 * @property {number} mp Current MP.
 * @property {number} maxMp Max MP.
 * @property {Object.<string, string>} [equipment] Equipped slot-to-item-ID mapping.
 */

/**
 * @typedef {Object} MarketState
 * @property {string} shopId Unique shop identifier key.
 * @property {number} gold Current player gold.
 * @property {string} currentTab Active tab ('BUY' | 'SELL').
 * @property {string|null} selectedItemId Currently inspected item ID.
 * @property {Object.<string, number>} [workingStock] Working stock quantity map.
 * @property {Object.<string, number>} [inventory] Player inventory quantity map.
 * @property {CharacterBattler[]} [party] Party character array.
 */

/**
 * @typedef {Object} MarketDiagnostics
 * @property {string} driverId Driver internal identifier.
 */

/**
 * @typedef {Object} StatDiffResult
 * @property {Object.<string, number>} diff Numerical differences per stat key.
 * @property {string} rating Evaluation rating ('upgrade' | 'downgrade' | 'sidegrade' | 'none').
 * @property {string} currentEquippedLabel Label of currently equipped item or 'Empty'.
 */

const EmberlightMarketRenderer = (() => {
	//#region [SEC-01] Module State & DOM/Emission Helpers
	/**
	 * Safely retrieves the market view container element.
	 * (Pure presentation lookup utility)
	 * @returns {HTMLElement|null} View element instance or null.
	 */
	function getView() {
		return typeof document === 'undefined' ? null : document.getElementById('market-view');
	}

	/**
	 * Dispatches an action token via the provided dispatch callback.
	 * (Action inversion dispatcher)
	 * @param {((action: MarketActionToken) => void) | any} dispatch Dispatch handler function.
	 * @param {MarketActionToken} action Action payload object.
	 * @returns {void}
	 */
	function emit(dispatch, action) {
		if (typeof dispatch === 'function') dispatch(action);
	}
	//#endregion

	//#region [SEC-02] Manifest & Item Data Accessors
	/**
	 * Retrieves the active game manifest definition.
	 * (Pure state-accessor utility)
	 * @returns {Record<string, any>} Manifest object.
	 */
	function getManifest() {
		return typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
	}

	/**
	 * Retrieves a specific item definition from the manifest.
	 * (Pure state-accessor utility)
	 * @param {string | null | undefined} itemId Unique item identifier key.
	 * @returns {ItemDefinition|null} Item definition object or null.
	 */
	function getItem(itemId) {
		if (!itemId) return null;
		return getManifest()?.Items?.[itemId] || null;
	}

	/**
	 * Retrieves a specific shop definition from the manifest.
	 * (Pure state-accessor utility)
	 * @param {string | null | undefined} shopId Unique shop identifier key.
	 * @returns {ShopDefinition|null} Shop definition object or null.
	 */
	function getShop(shopId) {
		if (!shopId) return null;
		return getManifest()?.Shops?.[shopId] || null;
	}
	//#endregion

	//#region [SEC-03] Character Equipment & Stat Diff Computation
	/**
	 * Computes stat differences and upgrade ratings between a character's equipped gear and a new item.
	 * (Pure calculation utility)
	 * @param {CharacterBattler} character Character battler object.
	 * @param {ItemDefinition} newItem Candidate item definition object.
	 * @returns {StatDiffResult} Stat comparison result.
	 */
	function computeItemDiff(character, newItem) {
		/** @type {StatDiffResult} */
		const fallback = { diff: {}, rating: 'none', currentEquippedLabel: 'Empty' };
		if (!character || !newItem?.slot) return fallback;
		const currentItemId = character.equipment?.[newItem.slot];
		const currentItem = currentItemId ? getItem(currentItemId) : null;
		const currentStats = /** @type {Record<string, number>} */ (currentItem?.stats || {});
		const newStats = /** @type {Record<string, number>} */ (newItem.stats || {});
		const allStatKeys = Array.from(new Set([...Object.keys(currentStats), ...Object.keys(newStats)]));

		/** @type {Object.<string, number>} */
		const diff = {};
		let totalPositive = 0;
		let totalNegative = 0;

		allStatKeys.forEach((key) => {
			const cur = currentStats[key] || 0;
			const next = newStats[key] || 0;
			const d = next - cur;
			if (d !== 0) {
				diff[key] = d;
				if (d > 0) totalPositive++;
				else totalNegative++;
			}
		});

		let rating = 'none';
		if (totalPositive > 0 && totalNegative === 0) rating = 'upgrade';
		else if (totalNegative > 0 && totalPositive === 0) rating = 'downgrade';
		else if (totalPositive > 0 && totalNegative > 0) rating = 'sidegrade';

		return { diff, rating, currentEquippedLabel: currentItem?.label || 'Empty' };
	}
	//#endregion

	//#region [SEC-04] Public VSRP-001 Tier-3 Interface Gateway
	/**
	 * Resolves item icon URLs with window-level fallback support.
	 * @param {string} itemId Item ID key.
	 * @returns {string|null} Icon data URL or null.
	 */
	function resolveItemIconUrl(itemId) {
		const win = /** @type {any} */ (typeof window !== 'undefined' ? window : {});
		const icons = win.EmberlightIcons || win.EmberlightPartyIcons;
		if (icons && typeof icons.get === 'function') {
			return icons.get(itemId);
		}
		return null;
	}

	/**
	 * Renders a single row in the buy goods catalog.
	 * @param {ShopStockEntry} entry Stock catalog entry.
	 * @param {MarketState} state Active market state.
	 * @param {((action: MarketActionToken) => void) | any} dispatch Action dispatch callback.
	 * @param {ShopDefinition} [shop] Shop definition.
	 * @returns {HTMLElement|null} Catalog row element.
	 */
	function renderBuyCatalogRow(entry, state, dispatch, shop) {
		const item = getItem(entry.itemId);
		if (!item) return null;

		const isSelected = state.selectedItemId === entry.itemId;
		const iconUrl = resolveItemIconUrl(item.id);
		const currentStock = state.workingStock?.[entry.itemId] !== undefined
			? state.workingStock[entry.itemId]
			: entry.maxQuantity;
		const price = Math.round(item.cost * (shop?.buyRate || 1.0));
		const canAfford = state.gold >= price && currentStock > 0;

		const row = document.createElement('div');
		row.className = `canonical-stat-row market-item-row ${isSelected ? 'selected-item' : ''}`;
		row.style.display = 'flex';
		row.style.justifyContent = 'space-between';
		row.style.alignItems = 'center';
		row.style.padding = '4px 6px';
		row.style.border = isSelected ? '1px solid var(--ember)' : '1px solid transparent';
		row.style.cursor = 'pointer';

		row.onmouseenter = () => emit(dispatch, { type: 'SELECT_ITEM', itemId: entry.itemId });

		row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        ${iconUrl ? `<img src="${iconUrl}" style="width:24px; height:24px; image-rendering:pixelated; border:1px solid var(--border-dim); background:#000;" />` : ''}
        <div>
          <span style="color:${currentStock > 0 ? 'var(--text)' : 'var(--text-dim)'}">
            ${item.label} (${price}g)
          </span>
          <span style="color:var(--text-dim); font-size:7px;"> — ${item.desc} [Stock: ${currentStock}]</span>
        </div>
      </div>
    `;

		const buyBtn = document.createElement('button');
		buyBtn.type = 'button';
		buyBtn.className = 'cmd-btn action';
		buyBtn.style.fontSize = '7px';
		buyBtn.style.padding = '4px 8px';
		buyBtn.textContent = 'BUY';
		buyBtn.disabled = !canAfford;
		buyBtn.onclick = (e) => {
			e.stopPropagation();
			emit(dispatch, { type: 'BUY', itemId: entry.itemId });
		};

		row.appendChild(buyBtn);
		return row;
	}

	/**
	 * Renders a single row in the sell inventory catalog.
	 * @param {string} itemId Item identifier.
	 * @param {number} count Owned inventory quantity.
	 * @param {MarketState} state Active market state.
	 * @param {((action: MarketActionToken) => void) | any} dispatch Action dispatch callback.
	 * @param {ShopDefinition} [shop] Shop definition.
	 * @returns {HTMLElement|null} Inventory row element.
	 */
	function renderSellInventoryRow(itemId, count, state, dispatch, shop) {
		const item = getItem(itemId);
		if (!item) return null;

		const isSelected = state.selectedItemId === itemId;
		const iconUrl = resolveItemIconUrl(item.id);
		const sellPrice = Math.max(1, Math.round(item.cost * (shop?.sellRate || 0.5)));

		const row = document.createElement('div');
		row.className = `canonical-stat-row market-item-row ${isSelected ? 'selected-item' : ''}`;
		row.style.display = 'flex';
		row.style.justifyContent = 'space-between';
		row.style.alignItems = 'center';
		row.style.padding = '4px 6px';
		row.style.border = isSelected ? '1px solid var(--ember)' : '1px solid transparent';
		row.style.cursor = 'pointer';

		row.onmouseenter = () => emit(dispatch, { type: 'SELECT_ITEM', itemId });

		row.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        ${iconUrl ? `<img src="${iconUrl}" style="width:24px; height:24px; image-rendering:pixelated; border:1px solid var(--border-dim); background:#000;" />` : ''}
        <div>
          <span>${item.label} (Qty: ${count})</span>
          <span style="color:var(--text-dim); font-size:7px;"> — Sell for ${sellPrice}g</span>
        </div>
      </div>
    `;

		const sellBtn = document.createElement('button');
		sellBtn.type = 'button';
		sellBtn.className = 'cmd-btn run';
		sellBtn.style.fontSize = '7px';
		sellBtn.style.padding = '4px 8px';
		sellBtn.textContent = 'SELL';
		sellBtn.onclick = (e) => {
			e.stopPropagation();
			emit(dispatch, { type: 'SELL', itemId });
		};

		row.appendChild(sellBtn);
		return row;
	}

	/**
	 * Renders the tab navigation header bar.
	 * @param {MarketState} state Active market state.
	 * @param {((action: MarketActionToken) => void) | any} dispatch Action dispatch callback.
	 * @returns {HTMLElement} Navigation container element.
	 */
	function renderMarketNavBar(state, dispatch) {
		const navBar = document.createElement('div');
		navBar.style.display = 'flex';
		navBar.style.gap = '8px';
		navBar.style.marginBottom = '12px';

		const buyTabBtn = document.createElement('button');
		buyTabBtn.type = 'button';
		buyTabBtn.className = `cmd-btn${state.currentTab === 'BUY' ? ' run' : ''}`;
		buyTabBtn.textContent = '🛒 BUY GOODS';
		buyTabBtn.onclick = () => emit(dispatch, { type: 'SWITCH_TAB', tab: 'BUY' });
		navBar.appendChild(buyTabBtn);

		const sellTabBtn = document.createElement('button');
		sellTabBtn.type = 'button';
		sellTabBtn.className = `cmd-btn${state.currentTab === 'SELL' ? ' run' : ''}`;
		sellTabBtn.textContent = '💰 SELL ITEMS';
		sellTabBtn.onclick = () => emit(dispatch, { type: 'SWITCH_TAB', tab: 'SELL' });
		navBar.appendChild(sellTabBtn);

		return navBar;
	}

	/**
	 * Renders the main catalog or inventory content box based on the active tab.
	 * @param {MarketState} state Active market state.
	 * @param {ShopDefinition|null} shop Shop definition object.
	 * @param {((action: MarketActionToken) => void) | any} dispatch Action dispatch callback.
	 * @returns {HTMLElement} Content box element.
	 */
	function renderMarketContentBox(state, shop, dispatch) {
		const contentBox = document.createElement('div');
		contentBox.style.display = 'flex';
		contentBox.style.flexDirection = 'column';
		contentBox.style.gap = '6px';
		contentBox.style.minHeight = '140px';

		if (state.currentTab === 'BUY') {
			const stockList = shop?.stock || [];
			if (stockList.length === 0) {
				contentBox.innerHTML = '<div style="font-size:8px; color:var(--text-dim);">Merchant has no goods in stock.</div>';
			} else {
				stockList.forEach((entry) => {
					const row = renderBuyCatalogRow(entry, state, dispatch, shop || undefined);
					if (row) contentBox.appendChild(row);
				});
			}
		} else {
			const invEntries = Object.entries(state.inventory || {}).filter(([_, count]) => count > 0);
			if (invEntries.length === 0) {
				contentBox.innerHTML = '<div style="font-size:8px; color:var(--text-dim);">Your pouch is empty.</div>';
			} else {
				invEntries.forEach(([itemId, count]) => {
					const row = renderSellInventoryRow(itemId, count, state, dispatch, shop || undefined);
					if (row) contentBox.appendChild(row);
				});
			}
		}

		return contentBox;
	}

	/**
	 * Renders an individual character compatibility card for equipment inspection.
	 * @param {CharacterBattler} char Character battler object.
	 * @param {ItemDefinition} selectedItem Candidate inspection item definition.
	 * @returns {HTMLElement} Compatibility card element.
	 */
	function renderCompatCard(char, selectedItem) {
		const card = document.createElement('div');
		const allowed = selectedItem.allowedPhenotypes || selectedItem.allowedClasses;
		const isEligible = !selectedItem.slot || !allowed || allowed.includes(char.phenotype);

		if (!isEligible) {
			card.className = 'market-compat-card incompatible';
			card.innerHTML = `
        <div class="market-compat-name">${char.name}</div>
        <div style="color:var(--danger); font-size:6.5px;">INCOMPATIBLE</div>
        <div style="color:var(--text-dim); font-size:6px;">${char.phenotype}</div>
      `;
		} else if (selectedItem.slot) {
			const diffInfo = computeItemDiff(char, selectedItem);
			const diffEntries = Object.entries(diffInfo.diff);
			let diffStr = '';

			if (diffEntries.length === 0) {
				diffStr = '<span style="color:var(--text-dim)">No Stat Change</span>';
			} else {
				diffStr = diffEntries.map(([st, val]) => {
					const sign = val > 0 ? `+${val}` : `${val}`;
					const col = val > 0 ? 'var(--ok)' : 'var(--danger)';
					return `<span style="color:${col}">${st.toUpperCase()} ${sign}</span>`;
				}).join(' ');
			}

			let tagClass = 'sidegrade';
			if (diffInfo.rating === 'upgrade') {
				tagClass = 'upgrade';
			} else if (diffInfo.rating === 'downgrade') {
				tagClass = '';
			}

			card.className = `market-compat-card ${tagClass}`;
			card.innerHTML = `
        <div class="market-compat-name">${char.name} <span style="font-size:6px; color:var(--text-dim)">(${char.phenotype})</span></div>
        <div style="font-size:6.5px; margin:2px 0;">${diffStr}</div>
        <div style="font-size:6px; color:var(--text-dim);">Wearing: ${diffInfo.currentEquippedLabel}</div>
      `;
		} else {
			card.className = 'market-compat-card upgrade';
			card.innerHTML = `
        <div class="market-compat-name">${char.name}</div>
        <div style="color:var(--ok); font-size:6.5px;">CAN USE</div>
        <div style="font-size:6px; color:var(--text-dim)">HP:${char.hp}/${char.maxHp} MP:${char.mp}/${char.maxMp}</div>
      `;
		}

		return card;
	}

	return {
		init() { },

		/**
		 * Renders the market store interface, tabs, inventory catalogs, and inspection HUD.
		 * (State-mutating DOM presenter)
		 * @param {MarketState} state Active market state snapshot.
		 * @param {((action: MarketActionToken) => void) | any} dispatch Action dispatch handler.
		 * @returns {void}
		 */
		renderMarket(state, dispatch) {
			const view = getView();
			if (!view || !state) return;
			view.innerHTML = '';

			const shop = getShop(state.shopId);
			const shopLabel = shop ? shop.label : 'Town Merchant';
			const merchantName = shop ? shop.merchantName : 'Merchant';

			const panel = document.createElement('div');
			panel.className = 'panel';
			panel.style.borderColor = 'var(--ember)';

			// 1. Header with Shop Title, Merchant Name, and Dynamic Gold
			panel.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-dim); padding-bottom:6px; margin-bottom:10px;">
          <div>
            <div class="panel-title" style="color:var(--ember); margin-bottom:2px; border:none; padding:0;">${shopLabel}</div>
            <div style="font-size:7px; color:var(--text-dim);">${merchantName}</div>
          </div>
          <div style="font-size:9px; color:var(--ember); font-weight:bold;">
            PURSE: ${state.gold}g
          </div>
        </div>
      `;

			// 2. Tab Navigation
			const navBar = renderMarketNavBar(state, dispatch);
			panel.appendChild(navBar);

			// 3. Main Catalog / Inventory Grid
			const contentBox = renderMarketContentBox(state, shop, dispatch);
			panel.appendChild(contentBox);

			// 4. In-Store Party Compatibility & Stat Diff Footer
			const selectedItem = getItem(state.selectedItemId);
			if (selectedItem) {
				const inspectDeck = document.createElement('div');
				inspectDeck.id = 'market-inspection-deck';

				let headerDesc = '';
				if (selectedItem.slot) {
					headerDesc = `EQUIPMENT COMPATIBILITY & STAT DIFF: <b style="color:var(--text)">${selectedItem.label}</b> (${selectedItem.slot.toUpperCase()})`;
				} else {
					headerDesc = `ITEM UTILITY: <b style="color:var(--text)">${selectedItem.label}</b> (${selectedItem.desc})`;
				}

				inspectDeck.innerHTML = `
          <div style="font-size:7.5px; color:var(--ember); border-bottom:1px solid var(--border-dim); padding-bottom:4px; margin-bottom:6px;">
            ${headerDesc}
          </div>
          <div class="market-compat-grid" id="market-compat-roster"></div>
        `;

				const rosterGrid = inspectDeck.querySelector('#market-compat-roster');

				(state.party || []).forEach((char) => {
					const card = renderCompatCard(char, selectedItem);
					if (rosterGrid) rosterGrid.appendChild(card);
				});

				panel.appendChild(inspectDeck);
			}

			// 5. Return to Exploration Footer
			const exitRow = document.createElement('div');
			exitRow.style.marginTop = '14px';
			exitRow.style.borderTop = '1px solid var(--border-dim)';
			exitRow.style.paddingTop = '10px';
			exitRow.style.textAlign = 'right';

			const exitBtn = document.createElement('button');
			exitBtn.type = 'button';
			exitBtn.className = 'cmd-btn action';
			exitBtn.textContent = '🚪 LEAVE SHOP / RETURN';
			exitBtn.onclick = () => emit(dispatch, { type: 'EXIT' });
			exitRow.appendChild(exitBtn);
			panel.appendChild(exitRow);

			view.appendChild(panel);
		},

		/**
		 * Returns diagnostic telemetry for the market renderer.
		 * (Pure telemetry collector)
		 * @returns {MarketDiagnostics} Diagnostic telemetry object.
		 */
		getDiagnostics() {
			return { driverId: 'market_renderer' };
		},

		/**
		 * Purges market presentation DOM elements.
		 * (State-mutating cleanup gateway)
		 * @returns {void}
		 */
		destroy() {
			const view = getView();
			if (view) view.innerHTML = '';
		},
	};
	//#endregion
})();

if (typeof window !== 'undefined') {
	window.EmberlightMarketRenderer = EmberlightMarketRenderer;
}
if (typeof module !== 'undefined' && module.exports) {
	module.exports = EmberlightMarketRenderer;
}