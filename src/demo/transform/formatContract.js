/**
 * The single shape every transformer must produce, and the format identifiers the detector chooses between.
 *
 * Nothing downstream of a transformer knows which format the file arrived in — that is the whole point of the layer.
 */




/**
 * Format identifiers.
 *
 * @typedef {'canonical'|'path'|'pivot'|'unknown'} FormatId
 */




/**
 * What every transformer returns. Column names are fixed: the tree component and the canonical query both depend on them.
 *
 * @typedef {Object} CanonicalRow
 * @property {string} id
 * @property {string} name
 * @property {string|null} parentId   - null on the root, exactly one per file.
 * @property {string|null} metadata   - Free text for the tooltip, or null.
 */




/**
 * What detectFormat returns.
 *
 * @typedef {Object} DetectionResult
 * @property {FormatId} format
 * @property {string} label           - Human-readable, for the UI.
 * @property {string} reason          - Why this format matched; shown on failure.
 * @property {string[]} columns       - The columns actually found in the file.
 */