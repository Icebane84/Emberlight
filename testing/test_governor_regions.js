const fs = require('fs');
const path = require('path');
const vm = require('vm');
const test = require('node:test');
const assert = require('node:assert/strict');

const HTML_PATH = path.join(__dirname, '..', 'phoenix', 'core_governor.html');
const CSS_PATH = path.join(__dirname, '..', 'phoenix', 'workbench.css');
const SKILL_PATH = path.join(__dirname, '..', '.agent', 'skills', 'phoenix-workbench', 'SKILL.md');

test('Governor Governance Suite: Canonical 36-Region Structural Verification', async (t) => {
  const html = fs.readFileSync(HTML_PATH, 'utf8');
  const css = fs.readFileSync(CSS_PATH, 'utf8');
  const skill = fs.readFileSync(SKILL_PATH, 'utf8');

  await t.test('CSS Styling Regions [CSS-01]..[CSS-12] monotonic & balanced', () => {
    const lines = css.split('\n');
    const opens = [];
    const closes = [];

    lines.forEach((l, idx) => {
      const lineNum = idx + 1;
      const oMatch = l.match(/\/\*\s*#region\s*(\[CSS-\d{2}\])/);
      if (oMatch) opens.push({ line: lineNum, id: oMatch[1] });
      const cMatch = l.match(/\/\*\s*#endregion\s*(\[CSS-\d{2}\])/);
      if (cMatch) closes.push({ line: lineNum, id: cMatch[1] });
    });

    assert.equal(opens.length, 12, 'Must have exactly 12 [CSS-XX] regions');
    assert.equal(closes.length, 12, 'Must have exactly 12 [CSS-XX] closing tags');

    for (let i = 1; i <= 12; i++) {
      const id = '[CSS-' + String(i).padStart(2, '0') + ']';
      assert.equal(opens[i - 1].id, id, `Region ${i} must be ${id}`);
      assert.equal(closes[i - 1].id, id, `Closing tag ${i} must be ${id}`);
      assert.ok(opens[i - 1].line < closes[i - 1].line, `Region ${id} must open before it closes`);
    }
  });

  await t.test('DOM Structural Regions [DOM-01]..[DOM-09] monotonic & balanced', () => {
    const lines = html.split('\n');
    const opens = [];
    const closes = [];

    lines.forEach((l, idx) => {
      const lineNum = idx + 1;
      const oMatch = l.match(/<!--\s*#region\s*(\[DOM-\d{2}\])/);
      if (oMatch) opens.push({ line: lineNum, id: oMatch[1] });
      const cMatch = l.match(/<!--\s*#endregion\s*(\[DOM-\d{2}\])/);
      if (cMatch) closes.push({ line: lineNum, id: cMatch[1] });
    });

    assert.equal(opens.length, 9, 'Must have exactly 9 [DOM-XX] regions');
    assert.equal(closes.length, 9, 'Must have exactly 9 [DOM-XX] closing tags');

    for (let i = 1; i <= 9; i++) {
      const id = '[DOM-' + String(i).padStart(2, '0') + ']';
      assert.equal(opens[i - 1].id, id, `DOM Region ${i} must be ${id}`);
      const c = closes.find(x => x.id === id);
      assert.ok(c, `DOM Closing tag for ${id} must exist`);
      assert.ok(opens[i - 1].line < c.line, `DOM Region ${id} must open before it closes`);
    }
  });

  await t.test('JavaScript Subsystem Sections [SEC-00]..[SEC-15] monotonic & balanced', () => {
    const lines = html.split('\n');
    const opens = [];
    const closes = [];

    lines.forEach((l, idx) => {
      const lineNum = idx + 1;
      const oMatch = l.match(/\/\/#region\s*(\[SEC-\d{2}\])/);
      if (oMatch) opens.push({ line: lineNum, id: oMatch[1] });
      const cMatch = l.match(/\/\/#endregion\s*(\[SEC-\d{2}\])/);
      if (cMatch) closes.push({ line: lineNum, id: cMatch[1] });
    });

    assert.equal(opens.length, 16, 'Must have exactly 16 [SEC-XX] regions ([SEC-00]..[SEC-15])');
    assert.equal(closes.length, 16, 'Must have exactly 16 [SEC-XX] closing tags');

    for (let i = 0; i <= 15; i++) {
      const id = '[SEC-' + String(i).padStart(2, '0') + ']';
      assert.equal(opens[i].id, id, `SEC Region ${i} must be ${id}`);
      assert.equal(closes[i].id, id, `SEC Closing tag ${i} must be ${id}`);
      assert.ok(opens[i].line < closes[i].line, `SEC Region ${id} must open before it closes`);
    }
  });

  await t.test('CMD-DOC-INDEX exact line number synchronization', () => {
    const lines = html.split('\n');
    const regionLines = {};
    lines.forEach((l, idx) => {
      const lineNum = idx + 1;
      const match = l.match(/(?:<!--\s*#region|\/\/#region)\s*(\[(?:DOM|SEC)-\d{2}\])/);
      if (match) {
        regionLines[match[1]] = lineNum;
      }
    });

    for (const [id, actualLine] of Object.entries(regionLines)) {
      const escaped = id.replace('[', '\\[').replace(']', '\\]');
      const indexRegex = new RegExp(escaped + ' \\.{10} Line ~\\s*(\\d+)');
      const m = html.match(indexRegex);
      assert.ok(m, `CMD-DOC-INDEX must include entry for ${id}`);
      const indexLine = parseInt(m[1], 10);
      assert.equal(indexLine, actualLine, `CMD-DOC-INDEX line for ${id} (${indexLine}) must match actual line (${actualLine})`);
    }
  });

  await t.test('JavaScript Syntax Cleanliness & Zero Compilation Errors', () => {
    const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
    assert.ok(scriptMatch, 'Monolith must contain embedded <script>');
    assert.doesNotThrow(() => {
      new vm.Script(scriptMatch[1]);
    }, 'Embedded JavaScript must parse with zero syntax errors');
  });

  await t.test('[INV-01] Theme-Agnostic Isolation Verification', () => {
    assert.equal(html.includes('runCombatAction'), false, 'Substrate must not contain runCombatAction RPG code');
    assert.equal(html.includes('ALCHEMICAL_STANCE'), false, 'Substrate must not contain RPG combat stance references');
  });

  await t.test('Skill specification synchronization', () => {
    for (let i = 1; i <= 12; i++) {
      const id = '[CSS-' + String(i).padStart(2, '0') + ']';
      assert.ok(skill.includes(id), `phoenix-workbench SKILL.md must document ${id}`);
    }
    for (let i = 1; i <= 9; i++) {
      const id = '[DOM-' + String(i).padStart(2, '0') + ']';
      assert.ok(skill.includes(id), `phoenix-workbench SKILL.md must document ${id}`);
    }
    for (let i = 0; i <= 15; i++) {
      const id = '[SEC-' + String(i).padStart(2, '0') + ']';
      assert.ok(skill.includes(id), `phoenix-workbench SKILL.md must document ${id}`);
    }
  });
});
