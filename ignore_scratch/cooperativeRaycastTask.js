/**
 * EMBERLIGHT PERIPHERAL ADVANCED PIPELINE: TIME-SLICED RAYCASTER
 * Conforms to VSRP-001 and integrates directly with EmberlightScheduler.
 */
function* cooperativeRaycastTask(gameState, viewportDimensions) {
	const { map, playerPos } = gameState;
	const { width: W, height: H } = viewportDimensions;

	const { cosA, sinA } = EmberlightPseudo3D.RaycastMath.computeCameraPlane(camera);
	const { planeX, planeY } = EmberlightPseudo3D.RaycastMath.computeFov(camera, FOV, cosA, sinA);
	const plane = { cosA, sinA, planeX, planeY };

	const stride = 4; // Render every 4th column per step for interlaced generation passes
	const torchFlicker = 0.95 + Math.sin(Date.now() * 0.005) * 0.03;
	const isTown = Boolean(gameState.flags?.in_town);
	const isDungeon = Boolean(gameState.depth > 0);

	// Step Pass 1: Quick Interlaced Low-Res Draft
	for (let offset = 0; offset < stride; offset++) {
		for (let x = offset; x < W; x += stride) {
			// Render specific vertical column to shared pixel buffers
			renderWallColumnColumnDirect(x, map, plane, torchFlicker, isTown, H, W);
		}

		// Yield thread execution smoothly back to the frame manager after each vertical pass
		yield {
			phase: 'interlaced_slice',
			sliceIndex: offset,
			percent: Math.round(((offset + 1) / stride) * 100)
		};
	}

	return true; // Frame generation completed cooperatively
}
