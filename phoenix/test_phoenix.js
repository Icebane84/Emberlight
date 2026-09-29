/**
 * @fileoverview Forwarder shim for Phoenix test suite.
 * Canonical implementation is located at: testing/test_phoenix.js
 */

const fs = require('node:fs');
const path = require('node:path');

const canonicalPath = path.resolve(__dirname, '../testing/test_phoenix.js');
if (fs.existsSync(canonicalPath)) {
	require(canonicalPath);
} else {
	require('./test_phoenix_sovereign_engine.js');
}
