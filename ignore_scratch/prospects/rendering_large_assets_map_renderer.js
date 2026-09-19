// Inside your overworld map loop rendering code blocks (map_renderer.js)
function drawEntityDecoration(ctx, tileX, tileY, assetKey, screenOffsetX, screenOffsetY) {
	const baker = window.EmberlightSpriteBaker;
	const dataUrl = baker.getAsset(assetKey);
	if (!dataUrl) return;

	const spec = baker.getSpec(assetKey);

	// Resolve screen space alignment anchors
	const tileW = 38; // System tile width
	const tileH = 30; // System tile height

	const drawX = screenOffsetX + (tileX * tileW) + (tileW * 0.5) - (spec.w * 0.5);
	// Subtract originYOffset to draw large frames upward into vertical blank spaces
	const drawY = screenOffsetY + (tileY * tileH) + tileH - spec.h + spec.originYOffset;

	const img = new Image();
	img.src = dataUrl;

	// Draw directly onto the 2D matrix canvas frame
	ctx.drawImage(img, drawX, drawY - spec.originYOffset);
}
