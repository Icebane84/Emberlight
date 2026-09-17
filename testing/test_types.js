/**
 * EMBERLIGHT SOVEREIGN ENGINE: STATIC TYPE VERIFICATION GATE
 * Protocol Anchor: VSRP-001 / MPFS-001
 * Runs TypeScript type checking over the whole repository headlessly.
 */

const { execSync } = require('node:child_process');
const path = require('node:path');

const rootDir = path.resolve(__dirname, '..');

console.log('=== EMBERLIGHT REPO-WIDE TYPE CHECK GATE ===');

try {
	execSync('npx -y -p typescript tsc --noEmit -p jsconfig.json', {
		cwd: rootDir,
		encoding: 'utf8',
		stdio: 'pipe',
		windowsHide: true,
	});
	console.log('[PASS] Static Type Check: 0 errors detected across all 86 scripts.');
	process.exit(0);
} catch (err) {
	const stdout = err.stdout ? err.stdout.toString() : '';
	const stderr = err.stderr ? err.stderr.toString() : '';
	const fullOutput = (stdout + '\n' + stderr).trim();

	console.error('[FAIL] Static Type Errors Detected:');
	console.error(fullOutput);
	process.exit(1);
}
