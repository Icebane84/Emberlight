/**
 * ============================================================================
 * PHOENIX SOVEREIGN ENGINE: SIMD COLLISION DISPATCH SUBSTRATE
 * Standard: PSGC-001 / VLT-003 / SDCP-001 / AOP-MEM-SIMD-001
 * Authority: Zero-ESM UMD / file:/// Double-Click Compliant
 * ============================================================================
 */
(function (rootScope, factoryDefinition) {
  'use strict';
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factoryDefinition();
  } else {
    rootScope.SovereignSimdDispatcher = factoryDefinition();
  }
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  /**
   * Scalar fallback implementation when WASM SIMD is unavailable.
   *
   * @param {SovereignMemoryFacade} facade
   * @param {number} candidateIndex
   * @param {number} px
   * @param {number} py
   * @returns {number} 4-bit bitmask
   */
  function scalarFallback4Way(facade, candidateIndex, px, py) {
    const baseOffset = facade.SIMD_FLOAT_BASE_INDEX + (candidateIndex * 16);
    let mask = 0;

    for (let lane = 0; lane < 4; lane++) {
      const minX = facade.float32View[baseOffset + lane];
      const minY = facade.float32View[baseOffset + 4 + lane];
      const maxX = facade.float32View[baseOffset + 8 + lane];
      const maxY = facade.float32View[baseOffset + 12 + lane];

      if (px >= minX && px <= maxX && py >= minY && py <= maxY) {
        mask |= (1 << lane);
      }
    }
    return mask;
  }

  /**
   * Initializes the SIMD dispatcher.
   *
   * @param {Object} memoryCoreAllocation
   * @param {WebAssembly.Instance|null} wasmSimdInstance
   * @returns {Object} Sealed dispatcher facade
   */
  function createDispatcher(memoryCoreAllocation, wasmSimdInstance) {
    const rawMemory = memoryCoreAllocation.wasmMemory;
    const facade = rootScope.SovereignMemoryCore.createMemoryFacade(rawMemory);
    const hasWasmSimd = wasmSimdInstance !== null &&
                        typeof wasmSimdInstance.exports.test_point_collision_4way === 'function';

    const testPointCollision4Way = hasWasmSimd
      ? wasmSimdInstance.exports.test_point_collision_4way
      : function (candidateIndex, px, py) {
          return scalarFallback4Way(facade, candidateIndex, px, py);
        };

    return Object.freeze({
      hasHardwareSimd: hasWasmSimd,
      facade: facade,
      testPointCollision4Way: testPointCollision4Way
    });
  }

  return Object.freeze({
    createDispatcher: createDispatcher
  });
}));