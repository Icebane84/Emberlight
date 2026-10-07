// cSpell:ignore Consolas punc
/**
 * ============================================================================
 * PHOENIX SOVEREIGN RUNTIME: IN-HOUSE VIRTUALIZED CODE EDITOR SUBSTRATE
 * Document Identifier: VSRP-001-PHOENIX-RUNTIME-EDITOR-CORE
 * Governing Protocol:  VSRP-001 / PSGC-001 / VLT-003 / PERSIST-001
 * Authority:           Host SSOT | 100% Sovereign Vanilla JavaScript Engine
 * ============================================================================
 */
((/** @type {any} */ global) => {
	'use strict';

	const LINE_HEIGHT = 20;
	const POOL_SIZE = 50;
	const CHAR_WIDTH = 8.4; // Monospace 13px Roboto Mono / Consolas reference

	/**
	 * Sovereign Virtual Text Buffer
	 * Manages linear text state, incremental FSM lexer caching, and inverted transactions.
	 */
	class PhoenixEditorBuffer {
		/**
		 * @param {string} [initialText='']
		 */
		constructor(initialText = '') {
			/** @type {string[]} */
			this.lines = initialText.split('\n');
			/** @type {Uint8Array} */
			this._lineStates = new Uint8Array(Math.max(1, this.lines.length));
			/** @type {{ line: number, col: number }} */
			this.cursor = { line: 0, col: 0 };
			/** @type {{ startLine: number, startCol: number, endLine: number, endCol: number } | null} */
			this.selection = null;
			/** @type {{ fromLine: number, fromCol: number, toLine: number, toCol: number, delText: string, insText: string, cursor: { line: number, col: number } }[]} */
			this.history = [];
			/** @type {{ fromLine: number, fromCol: number, toLine: number, toCol: number, delText: string, insText: string, cursor: { line: number, col: number } }[]} */
			this.redoStack = [];
			this.recalculateAllStates();
		}

		get lineCount() {
			return this.lines.length;
		}

		get totalHeight() {
			return this.lines.length * LINE_HEIGHT;
		}

		getText() {
			return this.lines.join('\n');
		}

		/**
		 * @param {string} text
		 */
		setText(text) {
			this.lines = text.split('\n');
			this._lineStates = new Uint8Array(Math.max(1, this.lines.length));
			this.cursor = { line: Math.min(this.cursor.line, this.lines.length - 1), col: 0 };
			this.selection = null;
			this.history.length = 0;
			this.redoStack.length = 0;
			this.recalculateAllStates();
		}

		recalculateAllStates() {
			const lexer = global.PhoenixSovereignEngine?.PhoenixLexer;
			if (!lexer?.tokenizeLine) return;
			let state = 0;
			for (let i = 0; i < this.lines.length; i++) {
				const res = lexer.tokenizeLine(this.lines[i], state);
				state = res.endState;
				this._lineStates[i] = state;
			}
		}

		/**
		 * Incrementally re-lexes forward from startLine until the state stabilizes.
		 * @param {number} startLine
		 */
		invalidateFSM(startLine) {
			const lexer = global.PhoenixSovereignEngine?.PhoenixLexer;
			if (!lexer?.tokenizeLine) return;
			let state = startLine > 0 ? this._lineStates[startLine - 1] : 0;
			for (let i = startLine; i < this.lines.length; i++) {
				const res = lexer.tokenizeLine(this.lines[i], state);
				const prevState = this._lineStates[i];
				state = res.endState;
				this._lineStates[i] = state;
				if (state === prevState && i > startLine) break; // State stabilized
			}
		}

		/**
		 * Applies a discrete transactional edit to the buffer.
		 * @param {number} fromLine
		 * @param {number} fromCol
		 * @param {number} toLine
		 * @param {number} toCol
		 * @param {string} insText
		 * @param {boolean} [recordHistory=true]
		 */
		applyTransaction(fromLine, fromCol, toLine, toCol, insText, recordHistory = true) {
			const oldCursor = { ...this.cursor };
			const startLineStr = this.lines[fromLine] || '';
			const endLineStr = this.lines[toLine] || '';

			// Extract deleted text for inverted undo
			let delText = '';
			if (fromLine === toLine) {
				delText = startLineStr.substring(fromCol, toCol);
			} else {
				const delParts = [startLineStr.substring(fromCol)];
				for (let l = fromLine + 1; l < toLine; l++) delParts.push(this.lines[l]);
				delParts.push(endLineStr.substring(0, toCol));
				delText = delParts.join('\n');
			}

			// Perform insertion/deletion splice
			const prefix = startLineStr.substring(0, fromCol);
			const suffix = endLineStr.substring(toCol);
			const newSegments = insText.split('\n');

			if (newSegments.length === 1) {
				this.lines[fromLine] = prefix + newSegments[0] + suffix;
				if (fromLine !== toLine) {
					this.lines.splice(fromLine + 1, toLine - fromLine);
				}
				this.cursor = { line: fromLine, col: fromCol + newSegments[0].length };
			} else {
				const lastIdx = newSegments.length - 1;
				newSegments[0] = prefix + newSegments[0];
				newSegments[lastIdx] = newSegments[lastIdx] + suffix;
				this.lines.splice(fromLine, toLine - fromLine + 1, ...newSegments);
				this.cursor = { line: fromLine + lastIdx, col: (newSegments.at(-1)?.length ?? 0) - suffix.length };
			}

			// Resize and invalidate FSM state cache
			if (this.lines.length !== this._lineStates.length) {
				const newStates = new Uint8Array(this.lines.length);
				newStates.set(this._lineStates.subarray(0, Math.min(this._lineStates.length, newStates.length)));
				this._lineStates = newStates;
			}
			this.invalidateFSM(fromLine);

			if (recordHistory) {
				this.history.push({ fromLine, fromCol, toLine, toCol, delText, insText, cursor: oldCursor });
				this.redoStack.length = 0;
			}
		}

		undo() {
			const tx = this.history.pop();
			if (!tx) return false;
			const insLines = tx.insText.split('\n');
			const endLine = tx.fromLine + insLines.length - 1;
			const endCol = insLines.length === 1 ? tx.fromCol + insLines[0].length : (insLines.at(-1)?.length ?? 0);
			this.applyTransaction(tx.fromLine, tx.fromCol, endLine, endCol, tx.delText, false);
			this.redoStack.push(tx);
			this.cursor = { ...tx.cursor };
			return true;
		}

		redo() {
			const tx = this.redoStack.pop();
			if (!tx) return false;
			this.applyTransaction(tx.fromLine, tx.fromCol, tx.toLine, tx.toCol, tx.insText, true);
			return true;
		}
	}

	/**
	 * Sovereign Virtualized Viewport Controller
	 * Recycles a pre-allocated 50-node DOM pool with sub-millisecond GPU translate3d positioning.
	 */
	class PhoenixVirtualEditor {
		/**
		 * @param {HTMLElement} container
		 * @param {{ doc?: string, filePath?: string, onChange?: (val: string) => void, onSelectionChange?: () => void }} [options={}]
		 */
		constructor(container, options = {}) {
			this.container = container;
			this.options = options;
			this.buffer = new PhoenixEditorBuffer(options.doc || '');
			this.scrollTop = 0;
			this.scrollLeft = 0;
			this.viewportHeight = 600;
			this.isComposing = false;
			/** @type {any[]} */
			this.diagnostics = [];
			/** @type {Record<number, string>} */
			this.diffMarkers = {};
			this.filePath = '';

			/** @type {HTMLElement} */
			this.gutterEl = document.createElement('div');
			/** @type {HTMLElement} */
			this.viewportEl = document.createElement('div');
			/** @type {HTMLElement} */
			this.spacerEl = document.createElement('div');
			/** @type {HTMLElement} */
			this.linesContainer = document.createElement('div');
			/** @type {HTMLElement} */
			this.caretEl = document.createElement('div');
			/** @type {HTMLTextAreaElement} */
			this.keySink = document.createElement('textarea');
			/** @type {HTMLElement[]} */
			this.linePool = [];
			/** @type {HTMLElement[]} */
			this.gutterPool = [];

			this._buildDOM();
			this._bindEvents();
			this.render();
		}

		_buildDOM() {
			this.container.innerHTML = '';
			this.container.className = 'phoenix-sovereign-editor';

			// 1. Gutter
			this.gutterEl.className = 'phx-gutter';

			// 2. Viewport & Scroll Spacer
			this.viewportEl.className = 'phx-viewport';
			this.spacerEl.className = 'phx-spacer';
			this.viewportEl.appendChild(this.spacerEl);

			// 3. Line Container (GPU Translate Pool)
			this.linesContainer.className = 'phx-lines-container';

			this.linePool.length = 0;
			this.gutterPool.length = 0;
			this.linesContainer.innerHTML = '';
			this.gutterEl.innerHTML = '';

			for (let i = 0; i < POOL_SIZE; i++) {
				const lineDiv = document.createElement('div');
				lineDiv.className = 'phx-line';
				this.linesContainer.appendChild(lineDiv);
				this.linePool.push(lineDiv);

				const gutterDiv = document.createElement('div');
				gutterDiv.className = 'phx-gutter-line';
				this.gutterEl.appendChild(gutterDiv);
				this.gutterPool.push(gutterDiv);
			}

			// 4. Caret Element
			this.caretEl.className = 'phx-caret';
			this.linesContainer.appendChild(this.caretEl);

			// 5. Decoupled Hidden Key Sink
			this.keySink.className = 'phx-key-sink';
			this.keySink.setAttribute('autocomplete', 'off');
			this.keySink.setAttribute('autocorrect', 'off');
			this.keySink.setAttribute('autocapitalize', 'off');
			this.keySink.setAttribute('spellcheck', 'false');
			this.linesContainer.appendChild(this.keySink);

			this.viewportEl.appendChild(this.linesContainer);
			this.container.appendChild(this.gutterEl);
			this.container.appendChild(this.viewportEl);
		}

		_bindEvents() {
			this.viewportEl.addEventListener('scroll', () => {
				this.scrollTop = this.viewportEl.scrollTop;
				this.scrollLeft = this.viewportEl.scrollLeft;
				this.gutterEl.scrollTop = this.scrollTop;
				this.render();
			}, { passive: true });

			// Key Sink input handling
			this.keySink.addEventListener('compositionstart', () => { this.isComposing = true; });
			this.keySink.addEventListener('compositionend', () => {
				this.isComposing = false;
				this._commitInput();
			});

			this.keySink.addEventListener('input', () => {
				if (!this.isComposing) this._commitInput();
			});

			this.keySink.addEventListener('keydown', (e) => this._handleKeyDown(e));

			// Click to position cursor
			this.viewportEl.addEventListener('mousedown', (e) => {
				const rect = this.linesContainer.getBoundingClientRect();
				const clickY = e.clientY - rect.top;
				const clickX = e.clientX - rect.left;
				const lineIdx = Math.max(0, Math.min(this.buffer.lineCount - 1, Math.floor(clickY / LINE_HEIGHT)));
				const lineText = this.buffer.lines[lineIdx] || '';
				const colIdx = Math.max(0, Math.min(lineText.length, Math.round(clickX / CHAR_WIDTH)));
				this.buffer.cursor = { line: lineIdx, col: colIdx };
				this.buffer.selection = null;
				this.render();
				this.focus();
				this.options.onSelectionChange?.();
			});
		}

		_commitInput() {
			const text = this.keySink.value;
			if (!text) return;
			this.keySink.value = '';
			const cur = this.buffer.cursor;
			this.buffer.applyTransaction(cur.line, cur.col, cur.line, cur.col, text, true);
			this.render();
			this.options.onChange?.(this.buffer.getText());
		}

		/**
		 * @param {KeyboardEvent} e
		 * @param {{ line: number, col: number }} cur
		 * @returns {boolean}
		 * @private
		 */
		_handleArrowNavigation(e, cur) {
			if (e.key === 'ArrowUp') {
				this.buffer.cursor.line = Math.max(0, cur.line - 1);
				this._clampCursorCol();
				return true;
			}
			if (e.key === 'ArrowDown') {
				this.buffer.cursor.line = Math.min(this.buffer.lineCount - 1, cur.line + 1);
				this._clampCursorCol();
				return true;
			}
			if (e.key === 'ArrowLeft') {
				if (cur.col > 0) {
					this.buffer.cursor.col--;
				} else if (cur.line > 0) {
					this.buffer.cursor.line--;
					this.buffer.cursor.col = (this.buffer.lines[this.buffer.cursor.line] || '').length;
				}
				return true;
			}
			if (e.key === 'ArrowRight') {
				const len = (this.buffer.lines[cur.line] || '').length;
				if (cur.col < len) {
					this.buffer.cursor.col++;
				} else if (cur.line < this.buffer.lineCount - 1) {
					this.buffer.cursor.line++;
					this.buffer.cursor.col = 0;
				}
				return true;
			}
			return false;
		}

		/**
		 * @param {KeyboardEvent} e
		 */
		_handleKeyDown(e) {
			const cur = this.buffer.cursor;
			const isCtrl = e.ctrlKey || e.metaKey;

			if (isCtrl && e.key.toLowerCase() === 'z') {
				e.preventDefault();
				if (e.shiftKey) this.buffer.redo();
				else this.buffer.undo();
				this.render();
				this.options.onChange?.(this.buffer.getText());
				return;
			}

			if (e.key === 'Enter') {
				e.preventDefault();
				const currentLine = this.buffer.lines[cur.line] || '';
				const indentMatch = /^\s*/.exec(currentLine);
				const indent = indentMatch ? indentMatch[0] : '';
				this.buffer.applyTransaction(cur.line, cur.col, cur.line, cur.col, '\n' + indent, true);
				this.render();
				this.options.onChange?.(this.buffer.getText());
				return;
			}

			if (e.key === 'Backspace') {
				e.preventDefault();
				if (cur.col > 0) {
					this.buffer.applyTransaction(cur.line, cur.col - 1, cur.line, cur.col, '', true);
				} else if (cur.line > 0) {
					const prevLen = (this.buffer.lines[cur.line - 1] || '').length;
					this.buffer.applyTransaction(cur.line - 1, prevLen, cur.line, 0, '', true);
				}
				this.render();
				this.options.onChange?.(this.buffer.getText());
				return;
			}

			if (e.key === 'Tab') {
				e.preventDefault();
				this.buffer.applyTransaction(cur.line, cur.col, cur.line, cur.col, '  ', true);
				this.render();
				this.options.onChange?.(this.buffer.getText());
				return;
			}

			if (this._handleArrowNavigation(e, cur)) {
				e.preventDefault();
				this.render();
			}
		}

		_clampCursorCol() {
			const len = (this.buffer.lines[this.buffer.cursor.line] || '').length;
			this.buffer.cursor.col = Math.min(this.buffer.cursor.col, len);
		}

		render() {
			this.spacerEl.style.height = `${this.buffer.totalHeight + 300}px`;
			const startLine = Math.max(0, Math.floor(this.scrollTop / LINE_HEIGHT) - 2);
			const lexer = global.PhoenixSovereignEngine?.PhoenixLexer;

			// Position recycled lines in GPU composite layer
			for (let i = 0; i < POOL_SIZE; i++) {
				const lineIdx = startLine + i;
				const lineEl = this.linePool[i];
				const gutterEl = this.gutterPool[i];

				if (lineIdx < this.buffer.lineCount) {
					const lineText = this.buffer.lines[lineIdx] || '';
					const y = lineIdx * LINE_HEIGHT;
					lineEl.style.transform = `translate3d(0, ${y}px, 0)`;
					lineEl.style.display = 'block';

					// Render highlighted tokens if PhoenixLexer available
					if (lexer?.tokenizeLine) {
						const prevState = lineIdx > 0 ? this.buffer._lineStates[lineIdx - 1] : 0;
						const res = lexer.tokenizeLine(lineText, prevState);
						lineEl.innerHTML = this._tokensToSpans(res.tokens);
					} else {
						lineEl.textContent = lineText || ' ';
					}

					gutterEl.textContent = String(lineIdx + 1);
					gutterEl.style.transform = `translate3d(0, ${y}px, 0)`;
					gutterEl.style.display = 'block';
				} else {
					lineEl.style.display = 'none';
					gutterEl.style.display = 'none';
				}
			}

			// Update Caret Position
			const cur = this.buffer.cursor;
			const caretY = cur.line * LINE_HEIGHT;
			const caretX = cur.col * CHAR_WIDTH;
			this.caretEl.style.transform = `translate3d(${caretX}px, ${caretY}px, 0)`;
			this.keySink.style.transform = `translate3d(${caretX}px, ${caretY}px, 0)`;

			// Auto-scroll viewport if cursor leaves window
			if (caretY < this.scrollTop) {
				this.viewportEl.scrollTop = caretY;
			} else if (caretY > this.scrollTop + this.viewportEl.clientHeight - LINE_HEIGHT) {
				this.viewportEl.scrollTop = caretY - this.viewportEl.clientHeight + LINE_HEIGHT * 2;
			}
		}

		/**
		 * @param {Array<{ type: string, text?: string, value?: string }>} tokens
		 * @returns {string}
		 */
		_tokensToSpans(tokens) {
			if (!tokens || tokens.length === 0) return '&nbsp;';
			return tokens.map(tok => {
				if (!tok) return '';
				const raw = tok.value ?? tok.text ?? '';
				const escaped = String(raw).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
				const cls = this._tokenTypeToClass(tok.type);
				return cls ? `<span class="${cls}">${escaped}</span>` : escaped;
			}).join('');
		}

		/**
		 * @param {string} [type]
		 * @returns {string}
		 */
		_tokenTypeToClass(type) {
			/** @type {Record<string, string>} */
			const map = {
				KEYWORD: 'tok-kw',
				BUILTIN: 'tok-builtin',
				STRING: 'tok-str',
				NUMBER: 'tok-num',
				COMMENT: 'tok-comment',
				DIRECTIVE: 'tok-directive',
				PUNCTUATION: 'tok-punc'
			};
			return (type && map[type]) || '';
		}

		focus() {
			this.keySink.focus();
		}

		getValue() {
			return this.buffer.getText();
		}

		/**
		 * @param {string} val
		 */
		setValue(val) {
			this.buffer.setText(val);
			this.render();
		}

		/**
		 * Navigates viewport and cursor to a specific 1-indexed line and 0-indexed column.
		 * @param {number} lineNum - 1-indexed line number
		 * @param {number} [col=0] - 0-indexed column
		 */
		jumpToLine(lineNum, col = 0) {
			const targetLine = Math.max(0, Math.min(this.buffer.lineCount - 1, lineNum - 1));
			const maxCol = (this.buffer.lines[ targetLine ] || '').length;
			this.buffer.cursor = { line: targetLine, col: Math.max(0, Math.min(maxCol, col)) };
			const vHeight = this.viewportEl?.clientHeight ?? 600;
			if (this.viewportEl) {
				this.viewportEl.scrollTop = Math.max(0, targetLine * LINE_HEIGHT - (vHeight / 2));
			}
			this.render();
			this.focus();
		}

		/**
		 * Updates syntax language mode for target file.
		 * @param {string} filePath
		 */
		setLanguage(filePath) {
			this.filePath = filePath;
			this.buffer.recalculateAllStates();
			this.render();
		}

		/**
		 * Applies diff status markers to gutter lines.
		 * @param {Record<number, string>} diffMap
		 */
		setDiffMarkers(diffMap) {
			this.diffMarkers = diffMap || {};
			this.render();
		}

		/**
		 * @param {any[]} diags
		 */
		setDiagnostics(diags) {
			this.diagnostics = diags || [];
		}

		destroy() {
			this.container.innerHTML = '';
		}
	}

	const PhoenixEditorCoreAPI = Object.freeze({
		/**
		 * @param {HTMLElement} container
		 * @param {Record<string, any>} [options]
		 */
		createEditor(container, options = {}) {
			return new PhoenixVirtualEditor(container, options);
		},
		PhoenixEditorBuffer,
		PhoenixVirtualEditor
	});

	global.PhoenixEditorCore = PhoenixEditorCoreAPI;
	if (typeof module !== 'undefined' && module.exports) {
		module.exports = PhoenixEditorCoreAPI;
	}
})(
	(() => {
		if (typeof globalThis !== 'undefined') return globalThis;
		if (typeof window !== 'undefined') return window;
		if (typeof global !== 'undefined') return global;
		return {};
	})()
);
