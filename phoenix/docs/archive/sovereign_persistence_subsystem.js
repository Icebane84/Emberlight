/**
 * ============================================================================
 * EMBERLIGHT ENGINE SUBSTRATE: SOVEREIGN PERSISTENCE SUBSYSTEM (SPS)
 * Document Identifier: AOP-ENG-SPS-001
 * Governing Standards: PSGC-001 / PERSIST-001 / VLT-003 / SDCP-001 / MPFS-001
 * Authority: Plane 1 Binary Storage Engine & Rehydration Gatekeeper
 * ============================================================================
 */
(function (rootContext, factory) {
  'use strict';
  const resolvedRoot = typeof globalThis !== 'undefined'
    ? globalThis
    : (typeof self !== 'undefined' ? self : this);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = factory(resolvedRoot);
  } else {
    resolvedRoot.SovereignPersistenceSubsystem = factory(resolvedRoot);
  }
}(typeof self !== 'undefined' ? self : this, function (resolvedRoot) {
  'use strict';

  // Constitutional Constants (PSGC-001 / PERSIST-001)
  const PARTITION_PERSIST_CAPACITY = 2048;
  const HEADER_TOTAL_BYTES = 96;
  const ENTITY_PAYLOAD_BYTES = 1952;
  const HEAP_MAGIC = 0x5053594E; // 'PSYN' Little-Endian
  const FORMAT_VERSION = 0x00000001;

  // Header Offsets
  const OFF_MAGIC = 0x00;
  const OFF_TICK = 0x04;
  const OFF_SEED = 0x0C;
  const OFF_PAYLOAD = 0x10;
  const OFF_CRC32 = 0x14;
  const OFF_VERSION = 0x18;
  const OFF_UUID = 0x20;
  const OFF_EPOCH = 0x2C;
  const OFF_CAP_MASK = 0x40;
  const OFF_TIER = 0x44;
  const OFF_SGI_HASH = 0x48;
  const OFF_SALT = 0x58;
  const OFF_ENTITY_BASE = 0x60;

  // Pre-calculated CRC32 Lookup Table
  const CRC32_TABLE = new Uint32Array(256);
  (function initCrcTable() {
    for (let i = 0; i < 256; i++) {
      let c = i;
      for (let k = 0; k < 8; k++) {
        c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
      }
      CRC32_TABLE[i] = c >>> 0;
    }
  }());

  function computeCrc32(byteBuffer, offset, length) {
    let crc = 0xFFFFFFFF;
    const end = offset + length;
    for (let i = offset; i < end; i++) {
      crc = (crc >>> 8) ^ CRC32_TABLE[(crc ^ byteBuffer[i]) & 0xFF];
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  /**
   * Sovereign Persistence Subsystem Core.
   */
  class SovereignPersistenceSubsystem {
    constructor() {
      this.opfsRoot = null;
      this.savesDir = null;
      this.quarantineDir = null;
      this.saveFileHandle = null;
      this.syncAccessHandle = null;
      this.storageMode = 'UNINITIALIZED'; // 'OPFS_SYNC' | 'EPHEMERAL_MEMORY'
      this.ephemeralBuffer = new Uint8Array(PARTITION_PERSIST_CAPACITY);
    }

    /**
     * Initializes the storage pipeline with non-destructive fallback for file:/// ([SEC-12]).
     */
    async init() {
      try {
        if (typeof navigator !== 'undefined' &&
            navigator.storage &&
            typeof navigator.storage.getDirectory === 'function') {

          this.opfsRoot = await navigator.storage.getDirectory();
          this.savesDir = await this.opfsRoot.getDirectoryHandle('saves', { create: true });
          this.quarantineDir = await this.opfsRoot.getDirectoryHandle('quarantine', { create: true });
          this.saveFileHandle = await this.savesDir.getFileHandle('world_state.bin', { create: true });

          // Test for synchronous access handle capability
          if (typeof this.saveFileHandle.createSyncAccessHandle === 'function') {
            this.syncAccessHandle = await this.saveFileHandle.createSyncAccessHandle();
            this.storageMode = 'OPFS_SYNC';
            return;
          }
        }
      } catch (storageError) {
        // Fall through to ephemeral mode on file:/// origin restrictions
      }

      this.storageMode = 'EPHEMERAL_MEMORY';
    }

    /**
     * Executes the 8-Gate verification matrix across an incoming buffer ([SEC-05.3]).
     *
     * @param {ArrayBuffer|SharedArrayBuffer} candidateBuffer
     * @param {Uint8Array|null} expectedSgiHash16
     * @param {number} hostCapabilityMask
     * @param {bigint} lastTick
     * @returns {Object} { isValid: boolean, failureGate: string|null, message: string }
     */
    verify8Gates(candidateBuffer, expectedSgiHash16, hostCapabilityMask, lastTick) {
      if (!candidateBuffer || candidateBuffer.byteLength < PARTITION_PERSIST_CAPACITY) {
        return { isValid: false, failureGate: 'GATE_SIZE', message: 'Byte length below 2,048 bytes' };
      }

      const view = new DataView(candidateBuffer);
      const bytes = new Uint8Array(candidateBuffer);

      // Gate 1: Magic Number Attestation
      const magic = view.getUint32(OFF_MAGIC, true);
      if (magic !== HEAP_MAGIC) {
        return { isValid: false, failureGate: 'GATE_MAGIC', message: `Magic 0x${magic.toString(16)} != 0x5053594E` };
      }

      // Gate 2: Format Version Verification
      const version = view.getUint32(OFF_VERSION, true);
      if (version !== FORMAT_VERSION) {
        return { isValid: false, failureGate: 'GATE_VERSION', message: `Version ${version} violates canonical v1.0` };
      }

      // Gate 3: Payload Capacity Bounds Check
      const payloadLength = view.getUint32(OFF_PAYLOAD, true);
      if (payloadLength > ENTITY_PAYLOAD_BYTES) {
        return { isValid: false, failureGate: 'GATE_PAYLOAD_BOUNDS', message: `Payload ${payloadLength} > 1952` };
      }

      // Gate 4: CRC32 Bitwise Integrity Check
      const storedCrc = view.getUint32(OFF_CRC32, true);
      const computedCrc = computeCrc32(bytes, OFF_ENTITY_BASE, payloadLength);
      if (storedCrc !== computedCrc) {
        return { isValid: false, failureGate: 'GATE_CRC32', message: `CRC mismatch: stored 0x${storedCrc.toString(16)} != computed 0x${computedCrc.toString(16)}` };
      }

      // Gate 5: SGI Invariant Hash Parity
      if (expectedSgiHash16) {
        for (let i = 0; i < 16; i++) {
          if (bytes[OFF_SGI_HASH + i] !== expectedSgiHash16[i]) {
            return { isValid: false, failureGate: 'GATE_SGI_HASH', message: 'SGI feature hash drift detected' };
          }
        }
      }

      // Gate 6: Capability Escalation Boundary
      const storedCapMask = view.getUint32(OFF_CAP_MASK, true);
      if ((storedCapMask & ~hostCapabilityMask) !== 0) {
        return { isValid: false, failureGate: 'GATE_CAPABILITY', message: 'Snapshot capability exceeds host grant' };
      }

      // Gate 7: Monotonic Anti-Replay Tick Verification
      const storedTick = view.getBigInt64(OFF_TICK, true);
      if (storedTick < lastTick) {
        return { isValid: false, failureGate: 'GATE_TICK_MONOTONIC', message: `Stored tick ${storedTick} < ${lastTick}` };
      }

      // Gate 8: Authority Tier Range Validation
      const tier = bytes[OFF_TIER];
      if (tier < 1 || tier > 4) {
        return { isValid: false, failureGate: 'GATE_AUTHORITY_TIER', message: `Tier ${tier} out of bounds [1, 4]` };
      }

      return { isValid: true, failureGate: null, message: 'All 8 gates verified successfully' };
    }

    /**
     * Non-Destructive Recovery (NDR): Quarantines corrupt buffer and creates Genesis survivor ([SEC-05.4]).
     */
    async quarantineAndRecover(corruptBytes, gateFailure) {
      const timestamp = Date.now();

      // Asynchronous quarantine write
      if (this.storageMode === 'OPFS_SYNC' && this.quarantineDir) {
        try {
          const qFileHandle = await this.quarantineDir.getFileHandle(
            `corrupt_${timestamp}_${gateFailure.failureGate}.bin`,
            { create: true }
          );
          const qAccess = await qFileHandle.createSyncAccessHandle();
          qAccess.truncate(corruptBytes.byteLength);
          qAccess.write(corruptBytes, { at: 0 });
          qAccess.flush();
          qAccess.close();
        } catch (e) {
          // Non-blocking fallback
        }
      }

      // Generate pristine Genesis Survivor Buffer
      return this.createGenesisSurvivorBuffer();
    }

    /**
     * Synthesizes a canonical Genesis survivor buffer.
     */
    createGenesisSurvivorBuffer() {
      const buffer = new ArrayBuffer(PARTITION_PERSIST_CAPACITY);
      const view = new DataView(buffer);
      const bytes = new Uint8Array(buffer);
      const floatView = new Float32Array(buffer);

      // Core Header
      view.setUint32(OFF_MAGIC, HEAP_MAGIC, true);
      view.setBigInt64(OFF_TICK, 0n, true);
      view.setUint32(OFF_SEED, 0x12345678, true);
      view.setUint32(OFF_PAYLOAD, ENTITY_PAYLOAD_BYTES, true);
      view.setUint32(OFF_VERSION, FORMAT_VERSION, true);

      // Provenance & Audit
      view.setUint32(OFF_EPOCH, (Date.now() / 1000) | 0, true);
      view.setUint32(OFF_CAP_MASK, 0xFFFFFFFF, true);
      bytes[OFF_TIER] = 1;
      view.setUint32(OFF_SALT, 0xA5A5A5A5, true);

      // Entity 0 (Player Avatar) at Center (320, 240)
      const baseFloat = OFF_ENTITY_BASE >>> 2;
      floatView[baseFloat] = 320.0;
      floatView[baseFloat + 1] = 240.0;
      floatView[baseFloat + 2] = 0.0;
      floatView[baseFloat + 3] = 0.0;

      // Calculate Genesis CRC32
      const crc = computeCrc32(bytes, OFF_ENTITY_BASE, ENTITY_PAYLOAD_BYTES);
      view.setUint32(OFF_CRC32, crc, true);

      return buffer;
    }

    /**
     * Commits the 2,048-byte Partition 0 heap in place ([SEC-11], [SEC-12]).
     *
     * @param {Uint8Array} partition0Bytes
     */
    commit(partition0Bytes) {
      if (this.storageMode === 'OPFS_SYNC' && this.syncAccessHandle) {
        this.syncAccessHandle.truncate(PARTITION_PERSIST_CAPACITY);
        this.syncAccessHandle.write(partition0Bytes, { at: 0 });
        this.syncAccessHandle.flush();
      } else {
        // Ephemeral in-memory fallback
        this.ephemeralBuffer.set(partition0Bytes.subarray(0, PARTITION_PERSIST_CAPACITY));
      }
    }

    /**
     * Loads and rehydrates state from persistent storage.
     */
    async load(expectedSgiHash, hostCapMask, lastTick) {
      let rawBytes = null;

      if (this.storageMode === 'OPFS_SYNC' && this.syncAccessHandle) {
        const candidate = new Uint8Array(PARTITION_PERSIST_CAPACITY);
        const bytesRead = this.syncAccessHandle.read(candidate, { at: 0 });
        if (bytesRead === PARTITION_PERSIST_CAPACITY) {
          rawBytes = candidate;
        }
      } else if (this.storageMode === 'EPHEMERAL_MEMORY') {
        const view = new DataView(this.ephemeralBuffer.buffer);
        if (view.getUint32(OFF_MAGIC, true) === HEAP_MAGIC) {
          rawBytes = this.ephemeralBuffer;
        }
      }

      if (!rawBytes) {
        // Fresh start: return Genesis Survivor
        return this.createGenesisSurvivorBuffer();
      }

      // Evaluate 8-Gate Matrix
      const gateResult = this.verify8Gates(rawBytes.buffer, expectedSgiHash, hostCapMask, lastTick);
      if (!gateResult.isValid) {
        return await this.quarantineAndRecover(rawBytes, gateResult);
      }

      return rawBytes.buffer;
    }

    /**
     * Flushes and releases the synchronous access handle on teardown.
     */
    destroy() {
      if (this.syncAccessHandle) {
        try {
          this.syncAccessHandle.flush();
          this.syncAccessHandle.close();
        } catch (e) {
          // Cleanup trap
        }
        this.syncAccessHandle = null;
      }
      this.storageMode = 'DESTROYED';
    }
  }

  return Object.freeze({
    SovereignPersistenceSubsystem: SovereignPersistenceSubsystem,
    computeCrc32: computeCrc32
  });
}));