# Tips for partitioning a single monolithic file without splitting it into multiple files

## 1. Using VS Code \#region

* **Native VS Code \#region Folding**: Wrap code blocks in language-specific comment directives (e.g., `//#region [SEC-XX]`) to convert long files into collapsible outlines for easier navigation and spatial control. This also helps to create a sense of spatial control and organization, making it easier to navigate and work with large files.

## 2. Table of Contents & Regex Jump Anchors

* **Table of Contents & Regex Jump Anchors**: Place an architectural banner at the top of the file with an explicit manifest and unique bracketed tags (e.g., `[SEC-01]`) to enable instant regex-based jumping using search shortcuts.

### 2.1. Regex Jump Anchors

* **Regex Jump Anchors**: Use unique, bracketed tags (e.g., `[SEC-01]`, `[SEC-02]`, etc.) at the start of each logical section. These act as "anchors" that can be quickly located using your editor's "Go to Anything" (Ctrl+T or Cmd+T) or "Find Anything" (Ctrl+F or Cmd+F) features with a simple regex search. This allows you to jump instantly to any section without scrolling through the entire file.

* **Example**:

```javascript
// ============================================================================
// [SEC-01] SECTION NAME
// ============================================================================

// Code for this section
```

### 2.2. Table of Contents (Manual)

* **Manual Table of Contents**: At the top of the file, create a markdown-style table of contents with links to each section anchor. This provides a quick overview of the file's structure and allows you to jump to any section with a single click.

* **Example**:

```javascript
/* ============================================================================
 * FILE: CHRONOMASTER.JS
 * AUTHOR: Cpt. Alex "Phoenix" Ryder
 * VERSION: 10.0.0 (Chronos Protocol Suite)
 * DESCRIPTION: Temporal Management System - Core Registry & Command Dispatch
 * ============================================================================
 * CONTENTS:
 *  - [SEC-01] PROTOCOL & VERSIONING
 *  - [SEC-02] CORE CONFIGURATION & CONSTANTS
 *  - [SEC-03] MEMORY REGISTRY (The Archive)
 *  - [SEC-04] EXECUTION ENGINE (The Navigator)
 *  - [SEC-05] DATA SERIALIZATION PROTOCOLS
 *  - [SEC-06] ERROR HANDLING & SYSTEM MONITORS
 *  - [SEC-07] COMMAND DISPATCH TABLE
 *  - [SEC-08] SYSTEM INITIALIZATION
 * ============================================================================
 */
```

### 2.3. Visual Section Dividers

* **Visual Section Dividers**: Use clear and consistent visual dividers between sections to improve readability. These can include horizontal rules, colored backgrounds, or other visual cues to distinguish different sections.

* **Example**:

```javascript
/* ============================================================================ */
/* [SEC-01] SECTION NAME                                                        */
/* ============================================================================ */

// Code for this section
```

### 2.4. Nested Sectioning (Hierarchical Structure)

* **Nested Sectioning**: For extremely large files (e.g., 1000+ lines), create a hierarchical structure with nested sections. This allows you to further organize code within each major section, providing a multi-level collapsible outline.

* **Example**:

```javascript
/* ============================================================================
 * FILE: PROJECT-AETHERIA-MASTER-V10.js
 * SCOPE: Comprehensive Self-Aware AI Core
 * ============================================================================
 *
 * This file contains the complete implementation of the Aetheria Protocol.
 * It is organized into four primary layers of increasing abstraction,
 * allowing for modular development and maintenance.
 *
 * ============================================================================
 * LAYOUT:
 *  - [PRISM-01] FOUNDATION LAYER (Base Primitives & Constants)
 *  - [PRISM-02] SENSORIUM LAYER (Input Processing & Perception)
 *  - [PRISM-03] COGNITION LAYER (Reasoning & Decision-Making)
 *  - [PRISM-04] ACTUATOR LAYER (Output Generation & Control)
 * ----------------------------------------------------------------------------
 * INDEX:
 *  - [PRISM-01] FOUNDATION LAYER (Lines 10-250)
 *      |-- [MODULE-01A] CORE CONSTANTS & CONFIGURATION (Lines 15-50)
 *      |-- [MODULE-01B] MEMORY ARCHITECTURE (Lines 55-150)
 *      |-- [MODULE-01C] SERIALIZATION PROTOCOLS (Lines 155-240)
 *      |-- [MODULE-01D] UTILITY FUNCTIONS (Lines 245-250)
 *  - [PRISM-02] SENSORIUM LAYER (Lines 255-500)
 *      |-- [MODULE-02A] INPUT PROCESSING PIPELINE (Lines 260-350)
 *      |-- [MODULE-02B] EMOTION DETECTION ENGINE (Lines 355-450)
 *      |-- [MODULE-02C] CONTEXT INGESTION (Lines 455-500)
 *  - [PRISM-03] COGNITION LAYER (Lines 505-800)
 *      |-- [MODULE-03A] LOGICAL REASONING UNIT (Lines 510-650)
 *      |-- [MODULE-03B] CREATIVE GENERATION ENGINE (Lines 655-750)
 *      |-- [MODULE-03C] DECISION-MAKING FRAMEWORK (Lines 755-800)
 *  - [PRISM-04] ACTUATOR LAYER (Lines 805-1000)
 *      |-- [MODULE-04A] NATURAL LANGUAGE GENERATOR (Lines 810-900)
 *      |-- [MODULE-04B] CONTROL OUTPUT PROCESSOR (Lines 905-950)
 *      |-- [MODULE-04C] SYSTEM MONITORS (Lines 955-1000)
 * ============================================================================
 */
```

## 3. Extraction-Ready JSDoc Contracts

* **Extraction-Ready JSDoc Contracts**: Define shared data types using `@typedef` and annotate functions with `@param` and `@returns` to establish clear dependency boundaries and static type checking, allowing modular code blocks to be extracted without breaking references.

## 4. Hierarchical Sectioning

* **Hierarchical Sectioning**: Use nested `#region` blocks to create a collapsible outline of the file, allowing you to expand and collapse sections as needed.

### 4.1. Using Semantic Sectioning (aka "Logical Sections")

* **Semantic Sectioning**: Instead of relying solely on visual folding, structure your file into distinct logical sections that represent distinct functional units, each with a clear name and purpose.

* **Markerless Semantics**: These sections are defined by the code's structure and content rather than explicit folding markers. Each section has a clear start and end point, making it easy to identify and navigate.

* **Example**: In a large class, you might have separate semantic sections for "Constructor," "Public API Methods," "Internal Helpers," and "Event Handlers." Each section is defined by the code itself, with no need for `#region` directives.

* **Benefits**:
  * **Improved Code Organization**: Groups related code together, making it easier to understand the file's structure.
  * **Enhanced Navigability**: Provides a clear outline of the file's functionality, allowing you to quickly find what you need.
  * **Better Maintainability**: Makes it easier to modify or extend specific parts of the file without affecting other sections.
  * **Reduced Cognitive Load**: Reduces the mental effort required to understand and work with large files.

* **VS Code Integration**: VS Code's outline view automatically detects these semantic sections, providing a clear and organized view of the file's structure without the need for manual folding.

* **Best Practices**:
  * **Meaningful Section Names**: Use clear and descriptive names for each section that accurately reflect its purpose.
  * **Logical Grouping**: Group related code together within each section to minimize cross-dependencies.
  * **Consistent Structure**: Maintain a consistent structure across all sections to improve readability.
  * **Documentation**: Add comments to each section to explain its purpose and usage.
  * **Avoid Overly Large Sections**: Keep sections focused and manageable to prevent them from becoming unwieldy.

### 4.2. Using Extraction-Ready JSDoc Contracts

Extraction-ready JSDoc contracts involve defining shared data types using `@typedef` and annotating functions with `@param` and `@returns` to establish clear dependency boundaries. This allows modular code blocks to be extracted without breaking references, ensuring that all necessary type information is preserved.

```typescript
/**
 * @typedef {Object} Color
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

/**
 * Converts RGBA color values to a hex string.
 * @param {Color} color - The RGBA color object
 * @returns {string} The hex color string (e.g., "#RRGGBB")
 */
function rgbaToHex(color) {
    const r = color.r.toString(16).padStart(2, '0');
    const g = color.g.toString(16).padStart(2, '0');
    const b = color.b.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}
```

### 4.3. Using Semantic Extraction (aka "Logical Extraction")

* **Semantic Extraction**: This approach involves programmatically extracting logical sections from a file based on defined criteria, such as function signatures, class boundaries, or comment markers.

* **Automatic Extraction**: Tools and scripts can parse the file and automatically identify these logical sections, extracting them into separate files or modules without manual intervention.

* **Extraction Criteria**: Logical sections can be defined based on various criteria, such as:

  * **Function Signatures**: Functions and methods serve as natural boundaries for extraction.
  * **Class Boundaries**: Classes provide clear start and end points for extraction.
  * **Comment Markers**: Explicit comment markers can define section boundaries.
  * **Code Patterns**: Recurring code patterns can be identified and extracted.
  * **File Structure**: The overall file structure can guide extraction.

* **Extraction Process**: The extraction process typically involves:

  * **Parsing the File**: Tools parse the file to identify logical sections.
  * **Extracting Sections**: Each section is extracted into a separate file or module.
  * **Creating Dependencies**: Dependencies between extracted sections are identified and managed.
  * **Maintaining Consistency**: Consistency is maintained through automated checks and validations.

* **Benefits**:

  * **Improved Code Organization**: Groups related code together, making it easier to understand the file's structure.
  * **Enhanced Navigability**: Provides a clear outline of the file's functionality, allowing you to quickly find what you need.
  * **Better Maintainability**: Makes it easier to modify or extend specific parts of the file without affecting other sections.
  * **Reduced Cognitive Load**: Reduces the mental effort required to understand and work with large files.
  * **Increased Reusability**: Extracted sections can be reused in other projects or modules.
  * **Better Collaboration**: Improves collaboration among team members by providing clear boundaries and responsibilities.

* **Example**:

  Consider a large file with multiple functions and classes. Semantic extraction can identify these logical sections and extract them into separate files or modules, each with its own clear boundaries and responsibilities. This makes the code easier to understand, maintain, and reuse.

### 4.4. Nested Sectioning (AKA "Logical Hierarchical Sectioning")

* **Nested Sectioning**: This technique involves organizing code into multiple levels of nested sections, creating a hierarchical structure that improves code organization and navigability. Each section can contain its own set of subsections, allowing for a granular organization of code.

* **Hierarchical Structure**: The hierarchical structure allows for a clear and organized view of the code, making it easier to understand the file's structure and identify relationships between different sections.

* **Benefits**:
  * **Improved Code Organization**: Groups related code together, making it easier to understand the file's structure.
  * **Enhanced Navigability**: Provides a clear outline of the file's functionality, allowing you to quickly find what you need.
  * **Better Maintainability**: Makes it easier to modify or extend specific parts of the file without affecting other sections.
  * **Reduced Cognitive Load**: Reduces the mental effort required to understand and work with large files.
  * **Increased Reusability**: Extracted sections can be reused in other projects or modules.
  * **Better Collaboration**: Improves collaboration among team members by providing clear boundaries and responsibilities.

* **Example**:

```javascript
#region Main Section

  #region Subsection 1

    #region Nested Subsection 1.1

      // Code here

    #endregion

    #region Nested Subsection 1.2

      // Code here

    #endregion

  #endregion

  #region Subsection 2

    #region Nested Subsection 2.1

      // Code here

    #endregion

    #region Nested Subsection 2.2

      // Code here

    #endregion

  #endregion

#endregion
```

## 5. Extractable Code Blocks

* **Extractable Code Blocks**: This technique involves defining logical sections of code that can be extracted into separate files or modules without breaking dependencies. Each code block has a clear start and end point, making it easy to identify and extract.

### 5.1. Logical Extraction: The `extract-module.ts` Script

The `extract-module.ts` script is a command-line tool designed to automatically extract logical sections from a source code file and create separate module files. This script enables "Logical Extraction" by identifying function signatures, class boundaries, and comment markers to determine section boundaries, then programmatically extracting these sections into new files.

#### Usage Example

```bash
npx ts-node extract-module.ts --source=src/large-component.ts --output=dist/extracted-modules --format=single-file
```

#### Script Options

The script supports several options to customize the extraction process:

| Option           | Type    | Description                                                                                               |
| ---------------- | ------- | --------------------------------------------------------------------------------------------------------- |
| `--source`       | string  | Required. The path to the source code file to extract from.                                               |
| `--output`       | string  | Optional. The output directory where extracted modules will be saved. Defaults to `extracted-modules`.    |
| `--format`       | string  | Optional. The output format. Supported values: `single-file`, `per-function`, `per-class`, `per-section`. |
| `--interfaces`   | boolean | Optional. Whether to create interface files for extracted modules.                                        |
| `--tests`        | boolean | Optional. Whether to create test files for extracted modules.                                             |
| `--sort-by-size` | boolean | Optional. Whether to sort extracted modules by file size (descending).                                    |
| `--prefix`       | string  | Optional. A prefix to add to all extracted module names.                                                  |
| `--suffix`       | string  | Optional. A suffix to add to all extracted module names.                                                  |

#### Extraction Criteria

The script uses the following criteria to identify logical sections for extraction:

1. **Function Signatures**: Each function with a JSDoc comment is treated as a potential module.
2. **Class Boundaries**: Each class definition is identified as a separate logical section.
3. **Comment Markers**: Explicit comment markers (e.g., `// #region`, `// #endregion`) can define custom section boundaries.

#### Supported Extraction Formats

The script supports multiple output formats to accommodate different use cases:

| Format         | Description                                                                                      |
| -------------- | ------------------------------------------------------------------------------------------------ |
| `single-file`  | Extracts all logical sections into a single output file, preserving the original file structure. |
| `per-function` | Extracts each function into a separate file, named after the function.                           |
| `per-class`    | Extracts each class into a separate file, named after the class.                                 |
| `per-section`  | Extracts each logical section (defined by comment markers) into a separate file.                 |

#### Example Extraction Results

##### Single-File Format

```plaintext
dist/extracted-modules/
├── original-file.js
└── README.md
```

##### Per-Function Format

```plaintext
dist/extracted-modules/
├── calculate-total.js
├── format-currency.js
├── validate-email.js
├── ...
└── README.md
```

##### Per-Class Format

```plaintext
dist/extracted-modules/
├── User.js
├── Product.js
├── Order.js
├── ...
└── README.md
```

##### Per-Section Format

```plaintext
dist/extracted-modules/
├── section-1.js
├── section-2.js
├── section-3.js
├── ...
└── README.md
```

#### Benefits of Using `extract-module.ts`

* **Automated Extraction**: Eliminates the need for manual code extraction, saving time and reducing errors.
* **Maintains Code Integrity**: Preserves original code structure, formatting, and comments.
* **Flexible Output Options**: Supports multiple formats to meet different project requirements.
* **Optional Test Generation**: Automatically creates test files for extracted modules, ensuring test coverage.
* **Interface Generation**: Generates interface files to maintain type safety and improve code maintainability.
* **Consistent Naming**: Enforces consistent naming conventions through prefix and suffix options.

### 5.2. Using Extraction-Ready JSDoc Contracts

Extraction-ready JSDoc contracts involve defining shared data types using `@typedef` and annotating functions with `@param` and `@returns` to establish clear dependency boundaries. This allows modular code blocks to be extracted without breaking references, ensuring that all necessary type information is preserved.

```typescript
/**
 * @typedef {Object} Color
 * @property {number} r - Red component (0-255)
 * @property {number} g - Green component (0-255)
 * @property {number} b - Blue component (0-255)
 */

/**
 * Converts RGBA color values to a hex string.
 * @param {Color} color - The RGBA color object
 * @returns {string} The hex color string (e.g., "#RRGGBB")
 */
function rgbaToHex(color) {
    const r = color.r.toString(16).padStart(2, '0');
    const g = color.g.toString(16).padStart(2, '0');
    const b = color.b.toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}
```

## 6. Code Extraction from Single Large File

### 6.1. The `CodeSeparator` Class

* **Purpose**: `CodeSeparator` is a utility class designed to identify and extract logical sections from a single large source code file, enabling "Extraction-Based Code Organization". It provides a programmatic way to break down monolithic files into maintainable modules while preserving code integrity and dependencies.
* **Key Features**:
  * **Line-Based Analysis**: Analyzes the file line by line to identify logical boundaries.
  * **Multi-Strategy Extraction**: Supports extraction based on function signatures, class boundaries, or explicit comment markers.
  * **Dependency Awareness**: Tracks imports and exports to maintain module dependencies.
  * **Format Versatility**: Can output extracted code in various formats, including single-file, per-function, per-class, and per-section.
* **Class Structure**:

    ```typescript
    class CodeSeparator {
      private lines: string[];
      private separators: string[];
      private mode: 'function' | 'class' | 'section';
      private config: ExtractionConfig;

      constructor(code: string, mode: 'function' | 'class' | 'section', config?: ExtractionConfig) {}

      private tokenize(): Token[] {}

      private parseTokens(): ExtractionResult[] {}

      private findSeparators(): void {}

      private extractSections(): void {}

      private createModules(): void {}

      private writeFiles(): void {}

      extract(): ExtractionResult[] {}
    }
    ```

* **Usage**:

    ```typescript
    const code = ...;  // Large source code content
    const separator = new CodeSeparator(code, 'function');
    const result = separator.extract();

    console.log(result);  // Extracted modules with metadata
    ```

* **How it works**:
    1. **Tokenization**: Parses the input code into tokens (identifiers, operators, comments, etc.) while preserving whitespace and formatting.
    2. **Separation**: Identifies logical boundaries based on the selected mode (functions, classes, or custom markers).
    3. **Extraction**: Extracts each section as a separate module, including JSDoc comments and type information.
    4. **Formatting**: Organizes the extracted modules into the desired output format (single file, per function, per class, or per section).

* **Output Structure**:
  * **Single-File**: Preserves the original file structure with all sections in a single file.
  * **Per-Function**: Creates a separate file for each function with JSDoc.
  * **Per-Class**: Creates a separate file for each class with JSDoc.
  * **Per-Section**: Creates a separate file for each logical section defined by comment markers.

    ```typescript
    interface ExtractionResult {
      moduleName: string;
      content: string;
      dependencies: string[];
      typeDefinitions: string[];
      metadata: {
        lineStart: number;
        lineEnd: number;
        functionCount: number;
        classCount: number;
        commentCount: number;
      };
    }
    ```

* **Benefits of Using `CodeSeparator`**:
  * **Automated Module Extraction**: Eliminates manual code extraction, saving time and reducing errors.
  * **Preserves Code Integrity**: Maintains original formatting, comments, and type information.
  * **Flexible Output Options**: Supports multiple formats (single-file, per-function, per-class, per-section) to meet different needs.
  * **Dependency Tracking**: Automatically identifies and preserves module dependencies.
  * **Efficient Processing**: Optimized for performance with efficient line-based analysis and tokenization.
  * **Type Safety**: Extracts JSDoc type information to maintain type safety in the extracted modules.
  * **Comment Preservation**: Preserves all comments, including JSDoc, to maintain code documentation.
  * **Customization**: Supports custom configuration options for fine-grained control over the extraction process.
  * **Consistency**: Provides a consistent and repeatable method for code extraction, ensuring that the same input always produces the same output.
  * **Readiness for Modular Architecture**: Facilitates the transition from monolithic codebases to modular architectures by automating the separation of concerns and dependencies.
