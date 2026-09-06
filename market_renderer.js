/* =========================================================================
   PERIPHERAL DRIVER: MARKET DOM PRESENTATION RENDERER (TIER-3 PERIPHERAL)
   ========================================================================= */

const EmberlightMarketRenderer = (() => {
  'use strict';

  function getView() {
    return typeof document === 'undefined' ? null : document.getElementById('market-view');
  }

  function emit(dispatch, action) {
    if (typeof dispatch === 'function') dispatch(action);
  }

  function getManifest() {
    return typeof EmberlightManifest !== 'undefined' ? EmberlightManifest : {};
  }

  function getItem(itemId) {
    return getManifest()?.Items?.[itemId] || null;
  }

  function getShop(shopId) {
    return getManifest()?.Shops?.[shopId] || null;
  }

  function computeItemDiff(character, newItem) {
    if (!character || !newItem?.slot) return { diff: {}, rating: 'none', currentEquippedLabel: 'Empty' };
    const currentItemId = character.equipment?.[newItem.slot];
    const currentItem = currentItemId ? getItem(currentItemId) : null;
    const currentStats = currentItem?.stats || {};
    const newStats = newItem.stats || {};
    const allStatKeys = Array.from(new Set([...Object.keys(currentStats), ...Object.keys(newStats)]));

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

  return {
    init(_context) {},

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
      const navBar = document.createElement('div');
      navBar.style.display = 'flex';
      navBar.style.gap = '8px';
      navBar.style.marginBottom = '12px';

      const buyTabBtn = document.createElement('button');
      buyTabBtn.type = 'button';
      buyTabBtn.className = 'cmd-btn' + (state.currentTab === 'BUY' ? ' run' : '');
      buyTabBtn.textContent = '🛒 BUY GOODS';
      buyTabBtn.onclick = () => emit(dispatch, { type: 'SWITCH_TAB', tab: 'BUY' });
      navBar.appendChild(buyTabBtn);

      const sellTabBtn = document.createElement('button');
      sellTabBtn.type = 'button';
      sellTabBtn.className = 'cmd-btn' + (state.currentTab === 'SELL' ? ' run' : '');
      sellTabBtn.textContent = '💰 SELL ITEMS';
      sellTabBtn.onclick = () => emit(dispatch, { type: 'SWITCH_TAB', tab: 'SELL' });
      navBar.appendChild(sellTabBtn);
      panel.appendChild(navBar);

      // 3. Main Catalog / Inventory Grid
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
            const item = getItem(entry.itemId);
            if (!item) return;

            const isSelected = state.selectedItemId === entry.itemId;
            const iconUrl = typeof EmberlightIcons !== 'undefined' ? EmberlightIcons.get(item.id) : null;
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
            contentBox.appendChild(row);
          });
        }
      } else {
        // SELL TAB
        const invEntries = Object.entries(state.inventory || {}).filter(([_, count]) => count > 0);
        if (invEntries.length === 0) {
          contentBox.innerHTML = '<div style="font-size:8px; color:var(--text-dim);">Your pouch is empty.</div>';
        } else {
          invEntries.forEach(([itemId, count]) => {
            const item = getItem(itemId);
            if (!item) return;

            const isSelected = state.selectedItemId === itemId;
            const iconUrl = typeof EmberlightIcons !== 'undefined' ? EmberlightIcons.get(item.id) : null;
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
            contentBox.appendChild(row);
          });
        }
      }
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
            // Consumable item compatibility
            card.className = 'market-compat-card upgrade';
            card.innerHTML = `
              <div class="market-compat-name">${char.name}</div>
              <div style="color:var(--ok); font-size:6.5px;">CAN USE</div>
              <div style="font-size:6px; color:var(--text-dim)">HP:${char.hp}/${char.maxHp} MP:${char.mp}/${char.maxMp}</div>
            `;
          }

          rosterGrid.appendChild(card);
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

    getDiagnostics() {
      return { driverId: 'market_renderer' };
    },

    destroy() {
      const view = getView();
      if (view) view.innerHTML = '';
    },
  };
})();

if (typeof window !== 'undefined') {
  window.EmberlightMarketRenderer = EmberlightMarketRenderer;
}
