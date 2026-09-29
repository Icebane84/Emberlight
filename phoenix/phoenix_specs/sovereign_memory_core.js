/* cSpell:words PADA PADB PADC AABB aabb Aabb */
/**
 * ============================================================================
 * ARCH-MEM-001: PHOENIX SOVEREIGN UNIFIED MEMORY CORE
 * Protocol Standard: PSGC-001 / PERSIST-001 / VLT-003 / MPFS-001
 * Authority: Plane 1 Isolated Memory Core Substrate
 * ============================================================================
 *
 * TABLE OF CONTENTS & NAVIGATION JUMP ANCHORS (Ctrl+F):
 * [SEC-MEM-01] Ambient Type Contracts & Memory Map Constants
 * [SEC-MEM-02] WebAssembly Linear Memory Allocator & Fallback Broker
 * [SEC-MEM-03] Zero-Allocation Typed Accessor Facade (PERSIST & SIMD)
 * [SEC-MEM-04] PERSIST-001 8-Gate Rehydration & Validation Engine
 * ============================================================================
 */

/**
 * Universal Dual-Binding Faraday Isolation Membrane
 * @param {Record<string, unknown>} rootScope
 * @param {() => unknown} factoryDefinition
 */
(function (rootScope, factoryDefinition) {
	'use strict';
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = factoryDefinition();
	} else {
		rootScope.SovereignMemoryCore = factoryDefinition();
	}
}(/** @type {any} */ (typeof globalThis !== 'undefined' ? globalThis : this), function () {
	'use strict';

	//#region [SEC-MEM-01] AMBIENT TYPE CONTRACTS & MEMORY MAP CONSTANTS

	/**
	 * @typedef {number & { readonly __brand: 'ByteOffset' }} ByteOffset
	 * @typedef {number & { readonly __brand: 'EntityIndex' }} EntityIndex
	 * @typedef {number & { readonly __brand: 'TickCount' }} TickCount
	 */

	/**
	 * @typedef {Object} EntityTransformSnapshot
	 * @property {number} positionX
	 * @property {number} positionY
	 * @property {number} velocityX
	 * @property {number} velocityY
	 */

	/**
	 * @typedef {Object} MemoryCoreAllocationResult
	 * @property {WebAssembly.Memory} wasmMemory
	 * @property {ArrayBuffer|SharedArrayBuffer} rawBuffer
	 * @property {boolean} isSharedMemory
	 * @property {number} totalBytesAllocated
	 */

	/**
	 * @typedef {Object} RehydrationValidationResult
	 * @property {boolean} isValid
	 * @property {string|null} failureCode
	 * @property {string} diagnosticMessage
	 */

	// Tier 4 Constitutional Constants (PSGC-001 [SEC-05.1] & [SEC-09.2])
	const HEAP_MAGIC_NUMBER = 0x5053594E; // 'PSYN' in Little-Endian ASCII
	const FORMAT_VERSION_CANONICAL = 0x00000001;
	const WASM_PAGE_SIZE_BYTES = 65536; // 64 KiB
	const TOTAL_WASM_PAGES_ALLOCATED = 16; // 1 MiB Static Linear Boundary
	const TOTAL_MEMORY_CAPACITY_BYTES = TOTAL_WASM_PAGES_ALLOCATED * WASM_PAGE_SIZE_BYTES; // 1,048,576 Bytes

	// Partition 0: PERSIST-001 Authority Partition Layout (2,048 Bytes / 0x800)
	const PARTITION_PERSIST_BASE_OFFSET = 0x00000000;
	const PARTITION_PERSIST_CAPACITY_BYTES = 0x00000800; // 2,048 Bytes
	const HEADER_TOTAL_BYTES = 0x00000060; // 96 Bytes

	// Region 0A: 32-Byte Core Header Offsets
	const OFFSET_CORE_MAGIC = 0x00000000; // Uint32 (0x5053594E)
	const OFFSET_CORE_TICK_COUNT = 0x00000004; // BigInt64LE (Monotonic tick)
	const OFFSET_CORE_PRNG_SEED = 0x0000000C; // Uint32LE (Mulberry32 state)
	const OFFSET_CORE_PAYLOAD_LENGTH = 0x00000010; // Uint32LE (Bytes in Region 1)
	const OFFSET_CORE_CRC32_CHECKSUM = 0x00000014; // Uint32LE (CRC32 over Region 1)
	const OFFSET_CORE_FORMAT_VERSION = 0x00000018; // Uint32LE (0x00000001)
	const OFFSET_CORE_RESERVED_PADA = 0x0000001C; // Uint32LE (Zero-filled)

	// Region 0B: 32-Byte PEVM Provenance Ledger Offsets
	const OFFSET_PROVENANCE_UUID_BASE = 0x00000020; // 12 Bytes (UUID bytes 0-11)
	const OFFSET_PROVENANCE_EPOCH = 0x0000002C; // Uint32LE (Unix epoch seconds)
	const OFFSET_PROVENANCE_RESERVED_PADB = 0x00000030; // 16 Bytes (Zero-filled)

	// Region 0C: 32-Byte Capability & Audit Record Offsets
	const OFFSET_AUDIT_CAPABILITY_MASK = 0x00000040; // Uint32LE (Bitmask of capabilities)
	const OFFSET_AUDIT_AUTHORITY_TIER = 0x00000044; // Uint8 (Tiers 1-4)
	const OFFSET_AUDIT_RESERVED_PADC1 = 0x00000045; // 3 Bytes (Zero-filled)
	const OFFSET_AUDIT_SGI_HASH_BASE = 0x00000048; // 16 Bytes (SHA-256[:16])
	const OFFSET_AUDIT_MUTATION_SALT = 0x00000058; // Uint32LE (Nonce)
	const OFFSET_AUDIT_RESERVED_PADC2 = 0x0000005C; // 4 Bytes (Zero-filled)

	// Region 1: Fixed-Stride Entity Memory Pool
	const OFFSET_ENTITY_REGION_BASE = 0x00000060;
	const ENTITY_RECORD_STRIDE_BYTES = 16; // 4 x Float32 (posX, posY, velX, velY)
	const ENTITY_MAXIMUM_CAPACITY = 122; // Floor((2048 - 96) / 16) = 122 Slots
	const ENTITY_REGION_TOTAL_BYTES = ENTITY_MAXIMUM_CAPACITY * ENTITY_RECORD_STRIDE_BYTES; // 1,952 Bytes

	// Partition 1: SIMD Vector & Spatial Hash Partition Layout (4,096 Bytes / 0x1000)
	const PARTITION_SIMD_BASE_OFFSET = 0x00000800;
	const PARTITION_SIMD_CAPACITY_BYTES = 0x00001000; // 4,096 Bytes
	const SIMD_AABB4_STRIDE_BYTES = 64; // 4x minX (16B), 4x minY (16B), 4x maxX (16B), 4x maxY (16B)
	const SIMD_AABB4_MAX_CANDIDATE_SETS = 32; // 32 * 64B = 2,048 Bytes
	const SIMD_SPATIAL_GRID_BASE_OFFSET = 0x00001000; // Offset 4096 (Grid partition)
	const SIMD_SPATIAL_GRID_CELL_COUNT = 512; // 512 cells * 4 Bytes (Int32) = 2,048 Bytes

	// Error Codes (PSGC-001 [SEC-09.2])
	const ERROR_MAGIC_MISMATCH = 'ERR_0x01';
	const ERROR_BOUNDS_VIOLATION = 'ERR_0x06';
	const ERROR_SGI_DRIFT = 'ERR_0x08';
	const ERROR_TICK_REGRESSION = 'ERR_0x0A';

	// Pre-allocated static scratchpad sink to prevent GC allocations
	const STATIC_SCRATCHPAD_TRANSFORM = Object.seal({
		positionX: 0.0,
		positionY: 0.0,
		velocityX: 0.0,
		velocityY: 0.0
	});

	// Pure Bitwise CRC32 Lookup Table (Pre-calculated at Module Initialization)
	const CRC32_TABLE = new Uint32Array(256);
	(function initializeCrc32Table() {
		for (let tableIndex = 0; tableIndex < 256; tableIndex++) {
			let crcAccumulator = tableIndex;
			for (let bitIndex = 0; bitIndex < 8; bitIndex++) {
				crcAccumulator = (crcAccumulator & 1) ? (0xEDB88320 ^ (crcAccumulator >>> 1)) : (crcAccumulator >>> 1);
			}
			CRC32_TABLE[ tableIndex ] = crcAccumulator >>> 0;
		}
	}());

	/**
	 * Computes CRC32 checksum over a typed memory slice.
	 * @param {Uint8Array} byteBuffer
	 * @param {number} startOffset
	 * @param {number} lengthInBytes
	 * @returns {number}
	 */
	function computeBufferCrc32(byteBuffer, startOffset, lengthInBytes) {
		let crcChecksum = 0xFFFFFFFF;
		const terminalOffset = startOffset + lengthInBytes;
		for (let byteIndex = startOffset; byteIndex < terminalOffset; byteIndex++) {
			const tableLookupIndex = (crcChecksum ^ byteBuffer[ byteIndex ]) & 0xFF;
			crcChecksum = (crcChecksum >>> 8) ^ CRC32_TABLE[ tableLookupIndex ];
		}
		return (crcChecksum ^ 0xFFFFFFFF) >>> 0;
	}

	//#endregion [SEC-MEM-01]

	//#region [SEC-MEM-02] WEBASSEMBLY LINEAR MEMORY ALLOCATOR & FALLBACK BROKER

	/**
	 * Instantiates the fixed 1 MiB linear memory block with automated isolation negotiation.
	 * Guarantees zero buffer detachment hazards by locking initial == maximum pages.
	 * @returns {MemoryCoreAllocationResult}
	 */
	function allocateSovereignLinearMemory() {
		const isIsolationActive = typeof crossOriginIsolated !== 'undefined' && crossOriginIsolated === true;
		let instantiatedWasmMemory = null;
		let isSharedBacking = false;

		if (isIsolationActive && typeof SharedArrayBuffer !== 'undefined') {
			try {
				instantiatedWasmMemory = new WebAssembly.Memory({
					initial: TOTAL_WASM_PAGES_ALLOCATED,
					maximum: TOTAL_WASM_PAGES_ALLOCATED,
					shared: true
				});
				isSharedBacking = true;
			} catch (sharedAllocationError) {
				// Shared allocation rejected; fallback immediately to unshared linear memory
				instantiatedWasmMemory = null;
				isSharedBacking = false;
			}
		}

		if (instantiatedWasmMemory === null) {
			instantiatedWasmMemory = new WebAssembly.Memory({
				initial: TOTAL_WASM_PAGES_ALLOCATED,
				maximum: TOTAL_WASM_PAGES_ALLOCATED,
				shared: false
			});
			isSharedBacking = false;
		}

		return Object.freeze({
			wasmMemory: instantiatedWasmMemory,
			rawBuffer: instantiatedWasmMemory.buffer,
			isSharedMemory: isSharedBacking,
			totalBytesAllocated: TOTAL_MEMORY_CAPACITY_BYTES
		});
	}

	//#endregion [SEC-MEM-02]

	//#region [SEC-MEM-03] ZERO-ALLOCATION TYPED ACCESSOR FACADE (PERSIST & SIMD)

	class SovereignMemoryFacade {
		/**
		 * @param {WebAssembly.Memory} wasmMemoryInstance
		 */
		constructor(wasmMemoryInstance) {
			this.wasmMemory = wasmMemoryInstance;
			this.rawBuffer = wasmMemoryInstance.buffer;

			// Instantiate single-pass persistent typed array views over the 1 MiB allocation
			this.uint8View = new Uint8Array(this.rawBuffer);
			this.int32View = new Int32Array(this.rawBuffer);
			this.uint32View = new Uint32Array(this.rawBuffer);
			this.float32View = new Float32Array(this.rawBuffer);
			this.dataView = new DataView(this.rawBuffer);

			// Pre-calculate typed element indices for Partition 0 Entity Region
			this.ENTITY_FLOAT_BASE_INDEX = OFFSET_ENTITY_REGION_BASE >>> 2; // Byte offset 0x060 -> Float32 index 24

			// Pre-calculate typed element indices for Partition 1 SIMD Region
			this.SIMD_FLOAT_BASE_INDEX = PARTITION_SIMD_BASE_OFFSET >>> 2; // Byte offset 0x800 -> Float32 index 512
			this.SPATIAL_GRID_INT_BASE_INDEX = SIMD_SPATIAL_GRID_BASE_OFFSET >>> 2; // Byte offset 0x1000 -> Int32 index 1024
		}

		// ====================================================================
		// RAW SCALAR PRIMITIVE ACCESSORS (Zero Object Allocations)
		// ====================================================================

		/**
		 * @param {number} byteOffsetAddress
		 */
		readInt32(byteOffsetAddress) {
			return this.int32View[ byteOffsetAddress >>> 2 ];
		}

		/**
		 * @param {number} byteOffsetAddress
		 * @param {number} integerValue
		 */
		writeInt32(byteOffsetAddress, integerValue) {
			this.int32View[ byteOffsetAddress >>> 2 ] = integerValue | 0;
		}

		/**
		 * @param {number} byteOffsetAddress
		 */
		readUint32(byteOffsetAddress) {
			return this.uint32View[ byteOffsetAddress >>> 2 ];
		}

		/**
		 * @param {number} byteOffsetAddress
		 * @param {number} unsignedIntegerValue
		 */
		writeUint32(byteOffsetAddress, unsignedIntegerValue) {
			this.uint32View[ byteOffsetAddress >>> 2 ] = unsignedIntegerValue >>> 0;
		}

		/**
		 * @param {number} byteOffsetAddress
		 */
		readFloat32(byteOffsetAddress) {
			return this.float32View[ byteOffsetAddress >>> 2 ];
		}

		/**
		 * @param {number} byteOffsetAddress
		 * @param {number} floatValue
		 */
		writeFloat32(byteOffsetAddress, floatValue) {
			this.float32View[ byteOffsetAddress >>> 2 ] = floatValue;
		}

		/**
		 * @param {number} byteOffsetAddress
		 */
		readBigInt64(byteOffsetAddress) {
			return this.dataView.getBigInt64(byteOffsetAddress, true);
		}

		/**
		 * @param {number} byteOffsetAddress
		 * @param {bigint} bigIntValue
		 */
		writeBigInt64(byteOffsetAddress, bigIntValue) {
			this.dataView.setBigInt64(byteOffsetAddress, bigIntValue, true);
		}

		// ====================================================================
		// PARTITION 0: PERSIST-001 ENTITY POOL ACCESSORS
		// ====================================================================

		/**
		 * Writes an entity transform record into Partition 0 without allocations.
		 * @param {EntityIndex} slotIndex - Slot index in [0, 121]
		 * @param {number} posX
		 * @param {number} posY
		 * @param {number} velX
		 * @param {number} velY
		 */
		writeEntityTransform(slotIndex, posX, posY, velX, velY) {
			const baseFloatIndex = this.ENTITY_FLOAT_BASE_INDEX + (slotIndex << 2);
			this.float32View[ baseFloatIndex ] = posX;
			this.float32View[ baseFloatIndex + 1 ] = posY;
			this.float32View[ baseFloatIndex + 2 ] = velX;
			this.float32View[ baseFloatIndex + 3 ] = velY;
		}

		/**
		 * Reads entity transform coordinates into a pre-allocated receiver object.
		 * @param {EntityIndex} slotIndex - Slot index in [0, 121]
		 * @param {EntityTransformSnapshot} destinationObject - Reusable sink
		 */
		readEntityTransform(slotIndex, destinationObject) {
			const baseFloatIndex = this.ENTITY_FLOAT_BASE_INDEX + (slotIndex << 2);
			destinationObject.positionX = this.float32View[ baseFloatIndex ];
			destinationObject.positionY = this.float32View[ baseFloatIndex + 1 ];
			destinationObject.velocityX = this.float32View[ baseFloatIndex + 2 ];
			destinationObject.velocityY = this.float32View[ baseFloatIndex + 3 ];
		}

		/**
		 * Zero-allocation scalar coordinate getter.
		 * @param {EntityIndex} slotIndex
		 * @returns {number}
		 */
		getEntityPositionX(slotIndex) {
			return this.float32View[ this.ENTITY_FLOAT_BASE_INDEX + (slotIndex << 2) ];
		}

		/**
		 * Zero-allocation scalar coordinate getter.
		 * @param {EntityIndex} slotIndex
		 * @returns {number}
		 */
		getEntityPositionY(slotIndex) {
			return this.float32View[ this.ENTITY_FLOAT_BASE_INDEX + (slotIndex << 2) + 1 ];
		}

		// ====================================================================
		// PARTITION 1: SIMD AABB4 CANDIDATE BOUNDING BOX ACCESSORS
		// ====================================================================

		/**
		 * Populates an entire AABB4 vector candidate struct (4 bounding boxes simultaneously).
		 * Structured for aligned 128-bit v128 memory loads in WebAssembly SIMD pipelines.
		 * Layout: [4x minX (16B)] [4x minY (16B)] [4x maxX (16B)] [4x maxY (16B)] = 64 Bytes
		 * @param {number} aabbSetIndex - Candidate set index in [0, 31]
		 * @param {Float32Array} minX4 - 4-lane minimum X coordinates
		 * @param {Float32Array} minY4 - 4-lane minimum Y coordinates
		 * @param {Float32Array} maxX4 - 4-lane maximum X coordinates
		 * @param {Float32Array} maxY4 - 4-lane maximum Y coordinates
		 */
		writeSimdAabbCandidateSet(aabbSetIndex, minX4, minY4, maxX4, maxY4) {
			const baseFloatIndex = this.SIMD_FLOAT_BASE_INDEX + (aabbSetIndex * (SIMD_AABB4_STRIDE_BYTES >>> 2));

			// Lane 0..3: minX
			this.float32View[ baseFloatIndex ] = minX4[ 0 ];
			this.float32View[ baseFloatIndex + 1 ] = minX4[ 1 ];
			this.float32View[ baseFloatIndex + 2 ] = minX4[ 2 ];
			this.float32View[ baseFloatIndex + 3 ] = minX4[ 3 ];

			// Lane 4..7: minY
			this.float32View[ baseFloatIndex + 4 ] = minY4[ 0 ];
			this.float32View[ baseFloatIndex + 5 ] = minY4[ 1 ];
			this.float32View[ baseFloatIndex + 6 ] = minY4[ 2 ];
			this.float32View[ baseFloatIndex + 7 ] = minY4[ 3 ];

			// Lane 8..11: maxX
			this.float32View[ baseFloatIndex + 8 ] = maxX4[ 0 ];
			this.float32View[ baseFloatIndex + 9 ] = maxX4[ 1 ];
			this.float32View[ baseFloatIndex + 10 ] = maxX4[ 2 ];
			this.float32View[ baseFloatIndex + 11 ] = maxX4[ 3 ];

			// Lane 12..15: maxY
			this.float32View[ baseFloatIndex + 12 ] = maxY4[ 0 ];
			this.float32View[ baseFloatIndex + 13 ] = maxY4[ 1 ];
			this.float32View[ baseFloatIndex + 14 ] = maxY4[ 2 ];
			this.float32View[ baseFloatIndex + 15 ] = maxY4[ 3 ];
		}

		// ====================================================================
		// PARTITION 1: SPATIAL HASH GRID OCCUPANCY ACCESSORS
		// ====================================================================

		/**
		 * Clears all 512 spatial grid occupancy cells to -1 (empty indicator).
		 */
		clearSpatialHashGrid() {
			this.int32View.fill(-1, this.SPATIAL_GRID_INT_BASE_INDEX, this.SPATIAL_GRID_INT_BASE_INDEX + SIMD_SPATIAL_GRID_CELL_COUNT);
		}

		/**
		 * Sets an occupancy cell value in the spatial grid.
		 * @param {number} cellIndex - Cell index in [0, 511]
		 * @param {number} entityOccupantHeadIndex - Entity slot or -1
		 */
		setSpatialGridCell(cellIndex, entityOccupantHeadIndex) {
			this.int32View[ this.SPATIAL_GRID_INT_BASE_INDEX + cellIndex ] = entityOccupantHeadIndex | 0;
		}

		/**
		 * Reads an occupancy cell value from the spatial grid.
		 * @param {number} cellIndex - Cell index in [0, 511]
		 * @returns {number}
		 */
		getSpatialGridCell(cellIndex) {
			return this.int32View[ this.SPATIAL_GRID_INT_BASE_INDEX + cellIndex ];
		}

		/**
		 * Returns direct typed array slice of the entity pool for WebGL2/WebGPU buffer streaming.
		 * @returns {Float32Array}
		 */
		getEntityPoolFloatView() {
			return this.float32View.subarray(
				this.ENTITY_FLOAT_BASE_INDEX,
				this.ENTITY_FLOAT_BASE_INDEX + (ENTITY_REGION_TOTAL_BYTES >>> 2)
			);
		}

		/**
		 * Packs the 96-byte tripartite header into Partition 0.
		 * @param {bigint} tickCount
		 * @param {number} prngSeed
		 * @param {number} payloadLength
		 * @param {number} crc32Checksum
		 * @param {Uint8Array} cartridgeUuidBytes12
		 * @param {number} epochSeconds
		 * @param {number} capabilityMask
		 * @param {number} authorityTier
		 * @param {Uint8Array} sgiHashBytes16
		 * @param {number} auditSalt
		 */
		packTripartiteHeader(tickCount, prngSeed, payloadLength, crc32Checksum,
			cartridgeUuidBytes12, epochSeconds, capabilityMask,
			authorityTier, sgiHashBytes16, auditSalt) {
			// Region 0A: Core Header
			this.dataView.setUint32(OFFSET_CORE_MAGIC, HEAP_MAGIC_NUMBER, true);
			this.dataView.setBigInt64(OFFSET_CORE_TICK_COUNT, tickCount, true);
			this.dataView.setUint32(OFFSET_CORE_PRNG_SEED, prngSeed >>> 0, true);
			this.dataView.setUint32(OFFSET_CORE_PAYLOAD_LENGTH, payloadLength >>> 0, true);
			this.dataView.setUint32(OFFSET_CORE_CRC32_CHECKSUM, crc32Checksum >>> 0, true);
			this.dataView.setUint32(OFFSET_CORE_FORMAT_VERSION, FORMAT_VERSION_CANONICAL, true);
			this.dataView.setUint32(OFFSET_CORE_RESERVED_PADA, 0, true);

			// Region 0B: PEVM Provenance Ledger
			this.uint8View.set(cartridgeUuidBytes12.subarray(0, 12), OFFSET_PROVENANCE_UUID_BASE);
			this.dataView.setUint32(OFFSET_PROVENANCE_EPOCH, epochSeconds >>> 0, true);
			this.uint8View.fill(0, OFFSET_PROVENANCE_RESERVED_PADB, OFFSET_PROVENANCE_RESERVED_PADB + 16);

			// Region 0C: Capability & Audit Record
			this.dataView.setUint32(OFFSET_AUDIT_CAPABILITY_MASK, capabilityMask >>> 0, true);
			this.uint8View[ OFFSET_AUDIT_AUTHORITY_TIER ] = authorityTier & 0xFF;
			this.uint8View.fill(0, OFFSET_AUDIT_RESERVED_PADC1, OFFSET_AUDIT_RESERVED_PADC1 + 3);
			this.uint8View.set(sgiHashBytes16.subarray(0, 16), OFFSET_AUDIT_SGI_HASH_BASE);
			this.dataView.setUint32(OFFSET_AUDIT_MUTATION_SALT, auditSalt >>> 0, true);
			this.dataView.setUint32(OFFSET_AUDIT_RESERVED_PADC2, 0, true);
		}
	}

	//#endregion [SEC-MEM-03]

	//#region [SEC-MEM-04] PERSIST-001 8-GATE REHYDRATION & VALIDATION ENGINE

	/**
	 * Executes the normative 8-Gate verification matrix across a binary heap buffer.
	 * Conforms to PSGC-001 [SEC-05.3].
	 * @param {ArrayBuffer|SharedArrayBuffer} candidateHeapBuffer - 2,048-byte buffer to evaluate
	 * @param {Uint8Array} activeEngineSgiHash16 - Current host invariant hash
	 * @param {number} hostGrantedCapabilityMask - Maximum allowed capability bits
	 * @param {bigint} lastAuthoritativeTick - Monotonic anti-replay counter
	 * @returns {RehydrationValidationResult}
	 */
	function verifyHeaderGates(candidateHeapBuffer, activeEngineSgiHash16,
		hostGrantedCapabilityMask, lastAuthoritativeTick) {
		if (!candidateHeapBuffer || candidateHeapBuffer.byteLength < PARTITION_PERSIST_CAPACITY_BYTES) {
			return {
				isValid: false,
				failureCode: ERROR_MAGIC_MISMATCH,
				diagnosticMessage: 'GATE_SIZE: Candidate buffer byte length is below 2,048 bytes'
			};
		}

		const evaluationView = new DataView(candidateHeapBuffer);
		const evaluationBytes = new Uint8Array(candidateHeapBuffer);

		// Gate 1: Magic Number Attestation
		const magicValue = evaluationView.getUint32(OFFSET_CORE_MAGIC, true);
		if (magicValue !== HEAP_MAGIC_NUMBER) {
			return {
				isValid: false,
				failureCode: ERROR_MAGIC_MISMATCH,
				diagnosticMessage: `GATE_MAGIC: Value 0x${magicValue.toString(16)} does not match PSYN (0x5053594E)`
			};
		}

		// Gate 2: Format Version Verification
		const versionValue = evaluationView.getUint32(OFFSET_CORE_FORMAT_VERSION, true);
		if (versionValue !== FORMAT_VERSION_CANONICAL) {
			return {
				isValid: false,
				failureCode: ERROR_MAGIC_MISMATCH,
				diagnosticMessage: `GATE_VERSION: Format version ${versionValue} violates canonical v1.0`
			};
		}

		// Gate 3: Payload Capacity Bounds Check
		const payloadLength = evaluationView.getUint32(OFFSET_CORE_PAYLOAD_LENGTH, true);
		const maximumAllowedPayload = PARTITION_PERSIST_CAPACITY_BYTES - HEADER_TOTAL_BYTES;
		if (payloadLength > maximumAllowedPayload) {
			return {
				isValid: false,
				failureCode: ERROR_BOUNDS_VIOLATION,
				diagnosticMessage: `GATE_PAYLOAD_BOUNDS: Length ${payloadLength} exceeds maximum entity area ${maximumAllowedPayload}`
			};
		}

		// Gate 4: CRC32 Bitwise Integrity Check
		const storedCrc32 = evaluationView.getUint32(OFFSET_CORE_CRC32_CHECKSUM, true);
		const calculatedCrc32 = computeBufferCrc32(evaluationBytes, OFFSET_ENTITY_REGION_BASE, payloadLength);
		if (storedCrc32 !== calculatedCrc32) {
			return {
				isValid: false,
				failureCode: ERROR_BOUNDS_VIOLATION,
				diagnosticMessage: `GATE_CRC32: Checksum mismatch. Stored: 0x${storedCrc32.toString(16)}, Calculated: 0x${calculatedCrc32.toString(16)}`
			};
		}

		// Gate 5: SGI Invariant Hash Parity
		if (activeEngineSgiHash16) {
			for (let byteIndex = 0; byteIndex < 16; byteIndex++) {
				if (evaluationBytes[ OFFSET_AUDIT_SGI_HASH_BASE + byteIndex ] !== activeEngineSgiHash16[ byteIndex ]) {
					return {
						isValid: false,
						failureCode: ERROR_SGI_DRIFT,
						diagnosticMessage: 'GATE_SGI_HASH: Stored feature hash diverges from active engine invariants'
					};
				}
			}
		}

		// Gate 6: Capability Escalation Boundary
		const storedCapabilityMask = evaluationView.getUint32(OFFSET_AUDIT_CAPABILITY_MASK, true);
		if ((storedCapabilityMask & ~hostGrantedCapabilityMask) !== 0) {
			return {
				isValid: false,
				failureCode: 'ERR_0x09',
				diagnosticMessage: `GATE_CAPABILITY: Snapshot capability mask 0x${storedCapabilityMask.toString(16)} exceeds host grant 0x${hostGrantedCapabilityMask.toString(16)}`
			};
		}

		// Gate 7: Monotonic Anti-Replay Tick Verification
		const storedTickCount = evaluationView.getBigInt64(OFFSET_CORE_TICK_COUNT, true);
		if (storedTickCount < lastAuthoritativeTick) {
			return {
				isValid: false,
				failureCode: ERROR_TICK_REGRESSION,
				diagnosticMessage: `GATE_TICK_MONOTONIC: Stored tick ${storedTickCount} regresses behind last authoritative tick ${lastAuthoritativeTick}`
			};
		}

		// Gate 8: Authority Tier Range Validation
		const authorityTier = evaluationBytes[ OFFSET_AUDIT_AUTHORITY_TIER ];
		if (authorityTier < 1 || authorityTier > 4) {
			return {
				isValid: false,
				failureCode: 'ERR_0x0E',
				diagnosticMessage: `GATE_AUTHORITY_TIER: Authority tier ${authorityTier} out of range [1, 4]`
			};
		}

		return {
			isValid: true,
			failureCode: null,
			diagnosticMessage: 'REHYDRATION_SUCCESS: All 8 gates validated'
		};
	}

	//#endregion [SEC-MEM-04]

	// ========================================================================
	// ROOT FACADE EXPORT
	// ========================================================================
	return Object.freeze({
		// Allocator Factory
		allocateLinearMemory: allocateSovereignLinearMemory,

		// Facade Constructor
		createMemoryFacade: function (/** @type {WebAssembly.Memory} */ wasmMemoryInstance) {
			return new SovereignMemoryFacade(wasmMemoryInstance);
		},

		// Verification Matrix
		verifyHeaderGates: verifyHeaderGates,
		computeCrc32: computeBufferCrc32,

		// Structural Constants Expose (SSOT)
		CONSTANTS: Object.freeze({
			HEAP_MAGIC: HEAP_MAGIC_NUMBER,
			FORMAT_VERSION: FORMAT_VERSION_CANONICAL,
			TOTAL_MEMORY_BYTES: TOTAL_MEMORY_CAPACITY_BYTES,
			PERSIST_PARTITION_BYTES: PARTITION_PERSIST_CAPACITY_BYTES,
			HEADER_BYTES: HEADER_TOTAL_BYTES,
			ENTITY_MAX_SLOTS: ENTITY_MAXIMUM_CAPACITY,
			ENTITY_STRIDE_BYTES: ENTITY_RECORD_STRIDE_BYTES,
			SIMD_PARTITION_BYTES: PARTITION_SIMD_CAPACITY_BYTES,
			SIMD_AABB4_STRIDE_BYTES: SIMD_AABB4_STRIDE_BYTES,
			SPATIAL_GRID_CELLS: SIMD_SPATIAL_GRID_CELL_COUNT
		})
	});
}));
