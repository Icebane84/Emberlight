# Learning Proposal: Reusable Behaviors & Skill Updates

**Authority:** Phoenix Governance & Sentinel Substrate  
**Status:** Pending User Approval  
**Trigger:** `/learn` slash command  

---

## 1. Identified Learnings & Architectural Analysis

Across the recent implementation of STCP-003 (Synarche Statement Parsing & Type Declarations), engine intra-line word diffing, and SonarLint/TypeScript strictness passes, several critical reusable patterns emerged that must be codified into the project's skills and rules:

### A. TypeScript Generics & In-Place Array Safety
1. **`TS/GENERIC_TOKEN_NARROWING` (ERL-38):**
   - **Problem:** Helper functions like `_compactWordTokens(tokens)` that accept `{ text: string, type: 'eq' | 'del' | 'add' }[]` widen the return type, causing TS2322 when caller contracts expect narrower unions (e.g. `{ text: string, type: 'eq' | 'del' }[]` or `{ text: string, type: 'eq' | 'add' }[]`).
   - **Pattern:** Annotate generic token transformers using `@template {string} T`, preserving caller union constraints without `any` casts.
2. **`TS/ARRAY_REVERSE_POP_SAFETY` (ERL-39):**
   - **Problem:** Consuming stacks via `while (stack.length) out.push(stack.pop())` introduces `undefined` into array item types under `strictNullChecks` (`T | undefined`), triggering TS2345.
   - **Pattern:** Reverse stack buffers directly in-place (`stack.reverse()`), ensuring strict `T[]` non-null type preservation.
3. **`TS/ARITHMETIC_NULLISH_COALESCING` (ERL-40):**
   - **Problem:** Optional numeric object properties in binary arithmetic (e.g. `(existing ? existing.useCount : 0) + (entry.useCount || 1)`) trigger TS2532 (`Object is possibly 'undefined'`) on the left-hand operand.
   - **Pattern:** Use explicit nullish-coalesced constants:
     ```javascript
     const prevCount = existing?.useCount ?? 0;
     const addCount = entry?.useCount ?? 1;
     const useCount = prevCount + addCount;
     ```

### B. SonarLint Clean Code & Cognitive Complexity Invariants
1. **`LINT/ARRAY_AT_PREFERENCE` (ERL-37 / `javascript:S7755`):**
   - **Pattern:** Prefer `arr.at(-1)` over `arr[arr.length - 1]`.
   - **Refinement:** Pair with concise optional chaining comparison:
     ```javascript
     const prev = out.at(-1);
     if (curr.type === prev?.type) {
         prev.text += curr.text;
     } else {
         out.push({ ...curr });
     }
     ```
2. **`REGEX/EXEC_NON_GLOBAL_PREFERENCE` (ERL-31 / `javascript:S6594`):**
   - **Pattern:** When a regex lacks the `/g` flag, always invoke `RegExp.prototype.exec(str)` rather than `String.prototype.match(re)`.
3. **`LINT/UNICODE_STRING_CANONICALIZATION` (ERL-35 / `javascript:S7758`):**
   - **Pattern:** Prefer `String.prototype.codePointAt()` over `String.prototype.charCodeAt()` for Unicode astral plane safety in distance metrics and hashing.
4. **Algorithmic Complexity Decomposition (`javascript:S3776`):**
   - **Pattern:** Split dynamic programming table generation (`_buildLcsTable`) and matrix backtracking (`_backtrackLcs`) into separate single-responsibility routines to guarantee Cognitive Complexity $\le 15$.

### C. STCP-003 AST Hierarchy & Precedence Climbing
1. **Unified Base Node Topology:**
   - In ambient declarations (`phoenix.d.ts`), all AST node interfaces must extend `SynarcheBaseNode` (`line?: number; col?: number;`) and include optional cross-cutting union compatibility fields (`target?`, `value?`, `args?`, `kind?`) to permit clean polymorphic traversals without unsafe type casting.
2. **Deterministic Precedence Climbing:**
   - Precedence matrix: Equality (`== != === !==`, 0) < Relational (`< <= > >=`, 1) < Additive (`+ -`, 2) < Multiplicative (`* / %`, 3).
   - Logical root operators (`&&`, `||`) bind with lower precedence than comparisons, and parentheses explicitly override binding.

---

## 2. Proposed Customization Updates

### 1. Skill Update: [`c:\Users\Chris\Emberlight\.agent\skills\error-resolution-ledger\SKILL.md`](file:///c:/Users/Chris/Emberlight/.agent/skills/error-resolution-ledger/SKILL.md)
- **Add ERL-37**: `LINT/ARRAY_AT_PREFERENCE` (`javascript:S7755`) with `curr.type === prev?.type` pattern.
- **Add ERL-38**: `TS/GENERIC_TOKEN_NARROWING` (preserving narrow union return types in utility transforms).
- **Add ERL-39**: `TS/ARRAY_REVERSE_POP_SAFETY` (in-place `.reverse()` avoiding `T | undefined` stack pops).
- **Add ERL-40**: `TS/ARITHMETIC_NULLISH_COALESCING` (nullish coalescing on optional arithmetic operands).
- **Bump Version**: From `2.0.0-PRO` to `2.1.0-PRO`.

### 2. Skill Update: [`c:\Users\Chris\Emberlight\.agent\skills\phoenix-sovereign-vlt\SKILL.md`](file:///c:/Users/Chris/Emberlight/.agent/skills/phoenix-sovereign-vlt/SKILL.md)
- **Section Addition**: Add subsection on **STCP-003 Precedence Climbing & Polymorphic AST Node Declarations**.
- Enforce that statement parsers implement standard Pratt / precedence climbing loops and maintain ambient `SynarcheBaseNode` inheritance with line/col tracking.

---

## 3. Concrete Text Diff Previews

### A. Diff for `error-resolution-ledger/SKILL.md`:

```markdown
### [ERL-37] `LINT/ARRAY_AT_PREFERENCE` — Relative Indexing via Array.prototype.at(-index)

- **Trigger:** SonarLint rule `javascript:S7755` ("Prefer `.at(…)` over `[….length - index]`").
- **Hazard:** Using `arr[arr.length - index]` is verbose, syntactically repetitive, and introduces human indexing errors when evaluating array tail elements or chained array expressions.
- **Rule:** Modern ECMAScript (ES2022+) provides `Array.prototype.at(-index)` for relative indexing from the end. When accessing the last element, prefer `arr.at(-1)`. Pair with optional chaining (`curr.type === prev?.type`) or explicit non-null guards.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const prev = out[ out.length - 1 ];
  if (curr.type === prev.type) {
      prev.text += curr.text;
  }

  // ✅ CANONICAL REPAIR:
  const prev = out.at(-1);
  if (curr.type === prev?.type) {
      prev.text += curr.text;
  }
  ```

---

### [ERL-38] `TS/GENERIC_TOKEN_NARROWING` — Generic Token Transformation Preservation

- **Trigger:** TypeScript error `TS2322` ("Type '...' is not assignable to type '...'") when passing arrays with narrow union tags (`'add' | 'eq'`) through utility aggregators.
- **Hazard:** Hardcoding union types in utility parameter/return tags collapses narrow unions into their broadest form, violating downstream caller contracts.
- **Rule:** Use JSDoc `@template {string} T` on array and token compaction helpers so that caller union constraints are preserved end-to-end.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION (Collapses narrow 'add' | 'eq' into 'add' | 'del' | 'eq'):
  /**
   * @param {Array<{ text: string, type: 'eq' | 'del' | 'add' }>} tokens
   * @returns {Array<{ text: string, type: 'eq' | 'del' | 'add' }>}
   */
  function compactTokens(tokens) { ... }

  // ✅ CANONICAL REPAIR:
  /**
   * @template {string} T
   * @param {Array<{ text: string, type: T }>} tokens
   * @returns {Array<{ text: string, type: T }>}
   */
  function compactTokens(tokens) { ... }
  ```

---

### [ERL-39] `TS/ARRAY_REVERSE_POP_SAFETY` — Non-Null Stack Reversal Without Undefined Elements

- **Trigger:** TypeScript error `TS2345` ("Argument of type '(T | undefined)[]' is not assignable to parameter of type 'T[]'").
- **Hazard:** `Array.prototype.pop()` has signature `pop(): T | undefined`. Draining a stack into a result array via `while (stack.length) out.push(stack.pop())` forces the target array to include `undefined`.
- **Rule:** Reverse the stack in-place using `stack.reverse()` instead of popping elements sequentially.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION (Injects undefined into tokens):
  const tokens = [];
  while (stack.length) tokens.push(stack.pop());

  // ✅ CANONICAL REPAIR:
  stack.reverse();
  const tokens = stack;
  ```

---

### [ERL-40] `TS/ARITHMETIC_NULLISH_COALESCING` — Arithmetic Isolation on Optional Numeric Properties

- **Trigger:** TypeScript error `TS2532` ("Object is possibly 'undefined'") during arithmetic operations (`+`, `-`, `*`).
- **Hazard:** Inline ternaries like `(existing ? existing.count : 0) + (entry.count || 1)` evaluate to `number | undefined` when `count?: number` is optional, causing static analyzers to reject the arithmetic operand.
- **Rule:** Isolate each operand into a nullish-coalesced local constant (`?? 0` / `?? 1`) before performing arithmetic.
- **Remediation Pattern:**

  ```javascript
  // ❌ VIOLATION:
  const count = (existing ? existing.useCount : 0) + (entry.useCount || 1);

  // ✅ CANONICAL REPAIR:
  const prevCount = existing?.useCount ?? 0;
  const addCount = entry?.useCount ?? 1;
  const count = prevCount + addCount;
  ```
```

---

## 4. User Review & Approval

Please review the proposed skill additions above. Click **Proceed** to apply these changes to the skills, or let me know if you would like any modifications.
