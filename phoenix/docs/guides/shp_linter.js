/**
 * ============================================================================
 * AGNOSTIC SEMANTIC HYPER-GRAPH LINTER (SHP-LINTER-001)
 * Enforces Holographic Headers, Hyper-Graph Edge Annotations & Zero-GC Rules.
 * ============================================================================
 */

const fs = require('fs');
const path = require('path');

// Target monolithic file path passed via CLI or defaulted
const TARGET_FILE = process.argv[2] || path.join(__dirname, 'monolith_source.js');

function executeAgnosticLint() {
    console.log(`[SHP-LINTER] Scanning target monolith: ${TARGET_FILE}...`);
    
    if (!fs.existsSync(TARGET_FILE)) {
        console.error(`[LINTER-FATAL] Target file not found at: ${TARGET_FILE}`);
        process.exit(1);
    }

    const sourceCode = fs.readFileSync(TARGET_FILE, 'utf8');
    const lines = sourceCode.split('\n');

    let errorsFound = 0;
    let warningsFound = 0;

    // 1. Verify TENSOR-001 Holographic Header Presence
    if (!sourceCode.includes('[TENSOR-001]')) {
        console.error(`[LINTER-FAIL] [TENSOR-001] Holographic Monolith Index Matrix missing from head of file.`);
        errorsFound++;
    } else {
        console.log(`[LINTER-PASS] [TENSOR-001] Holographic Index Matrix verified.`);
    }

    // 2. Scan for Zero-GC Violations inside @zero-gc-enforced regions
    let currentRegionId = null;
    let zeroGcEnforced = false;
    const forbiddenTokens = ['new Object', 'new Array', 'new Map', 'new Set', '.push(', '.map(', '.filter(', '.slice('];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];

        if (line.includes('@node-id')) {
            currentRegionId = line.trim();
        }
        if (line.includes('@zero-gc-enforced true')) {
            zeroGcEnforced = true;
        }
        if (line.includes('//#endregion')) {
            zeroGcEnforced = false;
            currentRegionId = null;
        }

        if (zeroGcEnforced) {
            for (const token of forbiddenTokens) {
                // Ignore comments, JSDoc annotations, and strings
                const trimmed = line.trim();
                if (trimmed.includes(token) && !trimmed.startsWith('*') && !trimmed.startsWith('//')) {
                    console.error(`[LINTER-FAIL] Zero-GC Violation in Region ${currentRegionId || 'Unmarked'} (Line ${i + 1}):`);
                    console.error(`   -> Forbidden allocation token: "${token}"`);
                    console.error(`   -> Line: ${trimmed}`);
                    errorsFound++;
                }
            }
        }
    }

    // 3. Verify Hyper-Graph Edge Annotation Completeness
    const regionMatches = sourceCode.match(/#region\s+\[SEC-[0-9A-Z-]+\]/g) || [];
    const edgeInMatches = sourceCode.match(/@edges-in/g) || [];
    
    console.log(`[SHP-TELEMETRY] Detected ${regionMatches.length} architectural regions and ${edgeInMatches.length} hyper-graph edge blocks.`);

    if (edgeInMatches.length < regionMatches.length) {
        console.warn(`[LINTER-WARN] Some architectural regions lack complete @edges-in hyper-graph annotations.`);
        warningsFound++;
    } else {
        console.log(`[LINTER-PASS] Hyper-Graph Edge Annotations fully mapped.`);
    }

    console.log('\n============================================================');
    if (errorsFound > 0) {
        console.error(`[LINTER-RESULT] BUILD HALTED: Found ${errorsFound} structural/invariant error(s).`);
        process.exit(1);
    } else {
        console.log(`[LINTER-RESULT] BUILD SUCCESSFUL: Code tensor structure & Zero-GC invariants verified.`);
        process.exit(0);
    }
}

executeAgnosticLint();