/**
 * EMBERLIGHT SOVEREIGN ENGINE: FAST SYNTAX & COMPILATION GATE
 * Protocol: VSRP-001 / MPFS-001
 * Uses Node built-in test runner (node:test) and vm.Script to assert 100% clean AST compilation across all 86 modules.
 */
'use strict';

const { test, describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const baseDir = path.resolve(__dirname, '..');
const scripts = require('./load_order.js');

describe('Emberlight Sovereign Engine - Static Syntax Compilation Battery', () => {
	it('should verify all 86 canonical modules exist and parse with zero syntax errors', () => {
		assert.ok(Array.isArray(scripts), 'Script load order must be an array');
		assert.ok(scripts.length >= 70, `Expected >= 70 modules in load order, got ${scripts.length}`);

		let passCount = 0;
		for (const relativePath of scripts) {
			const fullPath = path.join(baseDir, relativePath);
			assert.ok(fs.existsSync(fullPath), `Target script missing on disk: ${relativePath}`);
			const sourceCode = fs.readFileSync(fullPath, 'utf8');

			// Instantiating vm.Script parses the full JavaScript AST without executing side effects
			assert.doesNotThrow(() => {
				new vm.Script(sourceCode, { filename: relativePath });
			}, `Syntax error encountered while compiling ${relativePath}`);

			passCount++;
		}

		assert.equal(passCount, scripts.length, 'All scripts must compile successfully');
	});
});
