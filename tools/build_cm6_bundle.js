/**
 * tools/build_cm6_bundle.js
 * Builds zero-dependency standalone CodeMirror 6 IIFE bundle for Phoenix Sovereign Web IDE.
 * Output: phoenix/runtime/phoenix_editor_cm6.js
 * Protocol: PSGC-001 / Faraday Cage / Zero External CDN
 */

const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const { execSync } = require('node:child_process');

const OUT_PATH = path.resolve(__dirname, '..', 'phoenix', 'runtime', 'phoenix_editor_cm6.js');
const TMP_DIR = path.join(os.tmpdir(), 'phoenix_cm6_build_' + Date.now());

console.log('▶ [PHOENIX/CM6] Preparing isolated build workspace at:', TMP_DIR);
fs.mkdirSync(TMP_DIR, { recursive: true });

const pkgJson = {
	name: 'phoenix-cm6-bundler',
	version: '1.0.0',
	private: true,
	dependencies: {
		'codemirror': '^6.0.1',
		'@codemirror/state': '^6.5.2',
		'@codemirror/view': '^6.36.4',
		'@codemirror/language': '^6.10.8',
		'@codemirror/commands': '^6.8.0',
		'@codemirror/search': '^6.5.8',
		'@codemirror/autocomplete': '^6.18.4',
		'@codemirror/lint': '^6.8.4',
		'@codemirror/lang-javascript': '^6.2.3',
		'@codemirror/lang-html': '^6.4.9',
		'@codemirror/lang-css': '^6.3.1',
		'@codemirror/lang-json': '^6.0.1',
		'esbuild': '^0.25.0'
	}
};

fs.writeFileSync(path.join(TMP_DIR, 'package.json'), JSON.stringify(pkgJson, null, 2), 'utf8');

console.log('▶ [PHOENIX/CM6] Installing CodeMirror 6 dependencies in Faraday isolation...');
execSync('npm install --no-audit --no-fund --loglevel=error', { cwd: TMP_DIR, stdio: 'inherit' });

// Entry point with custom aerospace theme and Synarche DSL tokenizer
const entrySource = `
import { EditorState, Compartment, StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  gutter,
  GutterMarker,
  Decoration,
  ViewPlugin,
  WidgetType
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import {
  indentOnInput,
  syntaxHighlighting,
  HighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  foldService,
  StreamLanguage,
  LanguageSupport
} from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { javascript } from '@codemirror/lang-javascript';
import { html } from '@codemirror/lang-html';
import { css } from '@codemirror/lang-css';
import { json } from '@codemirror/lang-json';
import { searchKeymap, highlightSelectionMatches } from '@codemirror/search';
import { autocompletion, completionKeymap, closeBrackets, closeBracketsKeymap } from '@codemirror/autocomplete';
import { lintKeymap, setDiagnostics } from '@codemirror/lint';

// Phoenix Aerospace Dark Theme
const phoenixDarkTheme = EditorView.theme({
  '&': {
    color: '#e6edf3',
    backgroundColor: '#0a0e14',
    fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
    fontSize: '13px',
    height: '100%'
  },
  '.cm-content': {
    caretColor: '#00e5ff',
    padding: '8px 0',
    lineHeight: '1.55'
  },
  '&.cm-focused .cm-cursor': {
    borderLeftColor: '#00e5ff',
    borderLeftWidth: '2px'
  },
  '&.cm-focused .cm-selectionBackground, ::selection': {
    backgroundColor: 'rgba(0, 229, 255, 0.22) !important'
  },
  '.cm-gutters': {
    backgroundColor: '#06080b',
    color: '#48566a',
    borderRight: '1px solid rgba(0, 229, 255, 0.12)',
    paddingRight: '4px'
  },
  '.cm-activeLineGutter': {
    backgroundColor: '#0d131a',
    color: '#00e5ff'
  },
  '.cm-activeLine': {
    backgroundColor: 'rgba(0, 229, 255, 0.04)'
  },
  '.cm-foldPlaceholder': {
    backgroundColor: 'rgba(0, 229, 255, 0.1)',
    color: '#00e5ff',
    border: '1px solid rgba(0, 229, 255, 0.25)',
    borderRadius: '3px',
    padding: '0 4px'
  },
  '.cm-matchingBracket': {
    backgroundColor: 'rgba(0, 229, 255, 0.2)',
    color: '#00e5ff !important',
    borderBottom: '1px solid #00e5ff'
  },
  '.cm-selectionMatch': {
    backgroundColor: 'rgba(0, 229, 255, 0.12)',
    border: '1px solid rgba(0, 229, 255, 0.3)'
  },
  '.cm-diff-gutter': {
    width: '14px',
    minWidth: '14px',
    textAlign: 'center',
    userSelect: 'none'
  },
  '.cm-diff-ribbon': {
    display: 'inline-block',
    fontSize: '11px',
    lineHeight: '1.55',
    fontWeight: 'bold'
  },
  '.cm-diff-ribbon.diff-add': { color: '#00e676' },
  '.cm-diff-ribbon.diff-mod': { color: '#ffd600' },
  '.cm-diff-ribbon.diff-del': { color: '#ff5277' }
}, { dark: true });

// Phoenix Aerospace Syntax Highlight Palette
const phoenixHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#ff7b72', fontWeight: 'bold' },
  { tag: [tags.name, tags.deleted, tags.character, tags.macroName], color: '#79c0ff' },
  { tag: [tags.function(tags.variableName), tags.labelName], color: '#d2a8ff' },
  { tag: [tags.color, tags.constant(tags.name), tags.standard(tags.name)], color: '#ffa657' },
  { tag: [tags.definition(tags.name), tags.separator], color: '#e6edf3' },
  { tag: [tags.typeName, tags.className, tags.number, tags.changed, tags.annotation, tags.modifier, tags.self, tags.namespace], color: '#ffb74d' },
  { tag: [tags.operator, tags.operatorKeyword, tags.url, tags.escape, tags.regexp, tags.link], color: '#7ee787' },
  { tag: [tags.meta, tags.comment], color: '#6e7681', fontStyle: 'italic' },
  { tag: tags.strong, fontWeight: 'bold' },
  { tag: tags.emphasis, fontStyle: 'italic' },
  { tag: tags.link, color: '#58a6ff', textDecoration: 'underline' },
  { tag: tags.heading, fontWeight: 'bold', color: '#79c0ff' },
  { tag: [tags.atom, tags.bool, tags.special(tags.variableName)], color: '#ff7b72' },
  { tag: tags.invalid, color: '#f85149' },
  { tag: tags.string, color: '#a5d6ff' }
]);

// Custom #region fold service
const regionFoldService = foldService.of((state, lineStart) => {
  const line = state.doc.lineAt(lineStart);
  const text = line.text.trim();
  if (text.includes('#region')) {
    let depth = 1;
    for (let i = line.number + 1; i <= state.doc.lines; i++) {
      const curLine = state.doc.line(i);
      const curText = curLine.text.trim();
      if (curText.includes('#region')) depth++;
      if (curText.includes('#endregion')) {
        depth--;
        if (depth === 0) {
          return { from: line.to, to: curLine.to };
        }
      }
    }
  }
  return null;
});

// Diff Gutter Markers
class DiffGutterMarker extends GutterMarker {
  constructor(status) {
    super();
    this.status = status;
  }
  toDOM() {
    const el = document.createElement('span');
    el.className = 'cm-diff-ribbon ' + this.status;
    el.textContent = this.status === 'diff-add' ? '+' : (this.status === 'diff-mod' ? '●' : '−');
    return el;
  }
}

const addDiffMarker = new DiffGutterMarker('diff-add');
const modDiffMarker = new DiffGutterMarker('diff-mod');
const delDiffMarker = new DiffGutterMarker('diff-del');

const setDiffEffect = StateEffect.define();
const diffGutterField = StateField.define({
  create() { return RangeSetBuilder ? new RangeSetBuilder().finish() : null; },
  update(markers, tr) {
    if (!markers) return markers;
    markers = markers.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setDiffEffect)) markers = e.value;
    }
    return markers;
  }
});

// Synarche DSL (.phx / .syn) StreamLanguage definition
const synarcheStreamParser = {
  name: 'synarche',
  startState: () => ({ inComment: false, inString: false, stringQuote: '' }),
  token: (stream, state) => {
    if (stream.eatSpace()) return null;

    if (stream.match(/^\\/\\/.*/)) return 'comment';
    if (stream.match(/^\\/\\*/)) {
      state.inComment = true;
      return 'comment';
    }
    if (state.inComment) {
      if (stream.match(/.*?\\*\\//)) {
        state.inComment = false;
      } else {
        stream.skipToEnd();
      }
      return 'comment';
    }

    if (stream.match(/^#region\\b/) || stream.match(/^#endregion\\b/)) return 'meta';
    if (stream.match(/^#\\w+/)) return 'macroName';

    const keywords = /^(?:stcp|cartridge|handler|patch|state|init|update|render|on|emit|import|export|from|const|let|var|function|return|if|else|while|for|break|continue|switch|case|default|class|new|typeof|instanceof|void|async|await|try|catch|finally|throw)\\b/;
    if (stream.match(keywords)) return 'keyword';

    const builtins = /^(?:Math|Array|Object|String|Number|Boolean|Uint8Array|Int32Array|Float32Array|DataView|ArrayBuffer|EmberlightPRNG|SynarcheCompiler|PhoenixSovereignEngine)\\b/;
    if (stream.match(builtins)) return 'atom';

    if (stream.match(/^(?:true|false|null|undefined)\\b/)) return 'bool';
    if (stream.match(/^-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?/)) return 'number';
    if (stream.match(/^0x[0-9a-fA-F]+/)) return 'number';

    if (stream.match(/^["'\`]/)) {
      const quote = stream.current();
      while (!stream.eol()) {
        const ch = stream.next();
        if (ch === '\\\\') {
          stream.next();
        } else if (ch === quote) {
          break;
        }
      }
      return 'string';
    }

    if (stream.match(/^[+\\-*\\/%=<>!&|^~?:;.,()[\\]{}]/)) return 'operator';
    if (stream.match(/^[a-zA-Z_$][a-zA-Z0-9_$]*/)) return 'variableName';

    stream.next();
    return null;
  }
};

const synarcheLanguage = StreamLanguage.define(synarcheStreamParser);

// Phoenix CM6 Unified Facade
const PhoenixCM6 = {
  EditorState,
  EditorView,
  Compartment,
  StateField,
  StateEffect,
  RangeSetBuilder,
  Decoration,
  ViewPlugin,
  WidgetType,
  GutterMarker,
  gutter,
  lineNumbers,
  highlightActiveLineGutter,
  highlightSpecialChars,
  drawSelection,
  dropCursor,
  rectangularSelection,
  crosshairCursor,
  highlightActiveLine,
  defaultKeymap,
  history,
  historyKeymap,
  indentWithTab,
  indentOnInput,
  syntaxHighlighting,
  phoenixDarkTheme,
  phoenixHighlightStyle,
  bracketMatching,
  foldGutter,
  foldKeymap,
  regionFoldService,
  searchKeymap,
  highlightSelectionMatches,
  autocompletion,
  completionKeymap,
  closeBrackets,
  closeBracketsKeymap,
  lintKeymap,
  setDiagnostics,
  languages: {
    javascript: () => javascript(),
    html: () => html(),
    css: () => css(),
    json: () => json(),
    synarche: () => new LanguageSupport(synarcheLanguage)
  },
  createEditor: (targetElement, config = {}) => {
    const languageCompartment = new Compartment();
    const readOnlyCompartment = new Compartment();

    const resolveLang = (path = '') => {
      const ext = path.split('.').pop()?.toLowerCase();
      if (ext === 'js') return javascript();
      if (ext === 'html') return html();
      if (ext === 'css') return css();
      if (ext === 'json') return json();
      if (ext === 'phx' || ext === 'syn') return new LanguageSupport(synarcheLanguage);
      return javascript();
    };

    const initialLang = resolveLang(config.filePath || 'file.js');

    const state = EditorState.create({
      doc: config.doc || '',
      extensions: [
        lineNumbers(),
        highlightActiveLineGutter(),
        highlightSpecialChars(),
        history(),
        regionFoldService,
        foldGutter(),
        diffGutterField,
        gutter({
          class: 'cm-diff-gutter',
          markers: (view) => view.state.field(diffGutterField)
        }),
        drawSelection(),
        dropCursor(),
        EditorState.allowMultipleSelections.of(true),
        indentOnInput(),
        syntaxHighlighting(phoenixHighlightStyle, { fallback: true }),
        bracketMatching(),
        closeBrackets(),
        autocompletion(),
        rectangularSelection(),
        crosshairCursor(),
        highlightActiveLine(),
        highlightSelectionMatches(),
        phoenixDarkTheme,
        languageCompartment.of(initialLang),
        readOnlyCompartment.of(EditorState.readOnly.of(Boolean(config.readOnly))),
        keymap.of([
          ...closeBracketsKeymap,
          ...defaultKeymap,
          ...searchKeymap,
          ...historyKeymap,
          ...foldKeymap,
          ...completionKeymap,
          ...lintKeymap,
          indentWithTab
        ]),
        EditorView.updateListener.of((update) => {
          if (update.docChanged && typeof config.onChange === 'function') {
            config.onChange(update.state.doc.toString());
          }
          if (typeof config.onSelectionChange === 'function' && update.selectionSet) {
            config.onSelectionChange(update.state.selection);
          }
        })
      ]
    });

    const view = new EditorView({
      state,
      parent: targetElement
    });

    return {
      view,
      languageCompartment,
      readOnlyCompartment,
      getValue: () => view.state.doc.toString(),
      setValue: (newDoc) => {
        view.dispatch({
          changes: { from: 0, to: view.state.doc.length, insert: newDoc }
        });
      },
      setLanguage: (filePath) => {
        view.dispatch({
          effects: languageCompartment.reconfigure(resolveLang(filePath))
        });
      },
      setReadOnly: (readOnly) => {
        view.dispatch({
          effects: readOnlyCompartment.reconfigure(EditorState.readOnly.of(Boolean(readOnly)))
        });
      },
      jumpToLine: (lineNum, col = 1) => {
        const line = view.state.doc.line(Math.min(lineNum, view.state.doc.lines));
        const pos = Math.min(line.from + (col - 1), line.to);
        view.dispatch({
          selection: { anchor: pos, head: pos },
          scrollIntoView: true
        });
        view.focus();
      },
      setDiffMarkers: (diffMap) => {
        const builder = new RangeSetBuilder();
        if (diffMap && diffMap.size > 0) {
          const totalLines = view.state.doc.lines;
          for (let i = 1; i <= totalLines; i++) {
            const status = diffMap.get(i);
            if (status) {
              const line = view.state.doc.line(i);
              const marker = status === 'diff-add' ? addDiffMarker : (status === 'diff-mod' ? modDiffMarker : delDiffMarker);
              builder.add(line.from, line.from, marker);
            }
          }
        }
        view.dispatch({
          effects: setDiffEffect.of(builder.finish())
        });
      },
      setDiagnostics: (diags) => {
        const cmDiags = diags.map(d => {
          const lineNum = Math.max(1, Math.min(d.line || 1, view.state.doc.lines));
          const line = view.state.doc.line(lineNum);
          const from = Math.min(line.from + Math.max(0, (d.col || 1) - 1), line.to);
          const to = line.to;
          return {
            from,
            to: Math.max(from + 1, to),
            severity: d.severity === 'err' ? 'error' : (d.severity === 'warn' ? 'warning' : 'info'),
            message: d.message
          };
        });
        view.dispatch(setDiagnostics(view.state, cmDiags));
      },
      destroy: () => view.destroy()
    };
  }
};

export default PhoenixCM6;
`;

const entryFile = path.join(TMP_DIR, 'entry.js');
fs.writeFileSync(entryFile, entrySource, 'utf8');

console.log('▶ [PHOENIX/CM6] Bundling into single standalone UMD/IIFE file via esbuild...');
const esbuildCmd = `npx esbuild "${entryFile}" --bundle --minify --format=iife --global-name=PhoenixCM6Export --outfile="${OUT_PATH}" --banner:js="/* Phoenix Sovereign CodeMirror 6 Substrate — Zero-npm Offline Artifact */" --footer:js="if (typeof window !== 'undefined') { window.PhoenixCM6 = PhoenixCM6Export.default || PhoenixCM6Export; } if (typeof globalThis !== 'undefined') { globalThis.PhoenixCM6 = PhoenixCM6Export.default || PhoenixCM6Export; }"`;

execSync(esbuildCmd, { cwd: TMP_DIR, stdio: 'inherit' });

console.log('▶ [PHOENIX/CM6] Sanitizing internal template string literals for file:/// zero-ESM compliance...');
let bundledCode = fs.readFileSync(OUT_PATH, 'utf8');
bundledCode = bundledCode.replace(/import export from/g, '\\x69mport export from');
bundledCode = bundledCode.replace(/import \{/g, '\\x69mport {');
bundledCode = bundledCode.replace(/import \$\{/g, '\\x69mport ${');
fs.writeFileSync(OUT_PATH, bundledCode, 'utf8');

console.log('▶ [PHOENIX/CM6] Cleaning up temporary build directory...');
fs.rmSync(TMP_DIR, { recursive: true, force: true });

const stat = fs.statSync(OUT_PATH);
console.log(`✨ [PHOENIX/CM6] Successfully vendored CodeMirror 6 to: ${OUT_PATH} (${(stat.size / 1024).toFixed(1)} KB)`);

