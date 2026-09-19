/**
 * Cooperative Asset Baking Blueprint.
 * Generates assets piece by piece across multiple animation frame ticks.
 */
function* cooperativeAssetBakingTask() {
	const assetsToBake = [
		{ type: 'HERO', wpn: 'IRON_SWORD', arm: 'CHAINMAIL' },
		{ type: 'WARRIOR', wpn: 'GREATAXE', arm: 'CHAINMAIL' },
		{ type: 'MAGE', wpn: 'OAK_STAFF', arm: 'MAGE_ROBE' },
		{ type: 'HEALER', wpn: 'SUN_MACE', arm: 'MAGE_ROBE' },
		{ type: 'SHADE_WOLF' },
		{ type: 'BONE_ARCHER' },
		{ type: 'CATACOMB_SKELETON' },
		{ type: 'CAVE_SPIDER' },
		{ type: 'DREAD_ACOLYTE' },
		{ type: 'IRON_BRUTE' },
		{ type: 'BOSS_MALAKOR' }
	];

	for (let i = 0; i < assetsToBake.length; i++) {
		const asset = assetsToBake[i];

		// 1. Process a single asset card assembly
		// This runs at full native CPU speed for a fraction of a millisecond
		window.EmberlightBattlerBaker.bakeIndividualAsset(asset);

		// 2. Yield thread control back to the Host scheduler
		// This pauses execution here, saving state until the next frame tick
		yield { progress: Math.round(((i + 1) / assetsToBake.length) * 100) };
	}

	return true; // Execution complete
}

// Enqueue operation smoothly during Step 7 / Sentinel Boot passes
window.EmberlightScheduler.enqueue(
	'boot_asset_bake',
	cooperativeAssetBakingTask,
	window.EmberlightScheduler.PRIORITY.LOW,
	(success) => {
		console.log("All canvas buffers successfully generated cooperatively!");
		// Mount title screen table matrix safely here
	}
);
