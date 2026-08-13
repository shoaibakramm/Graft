



/**
 * Every format's signature, in priority order.
 *
 * `required` — all of these must be present.
 * `test`     — optional extra check for formats whose columns are patterned rather than fixed, e.g. "Level 1", "Level 2", ...
 */
const SIGNATURES = [

  {
    format: 'canonical',
    label: 'Standard format',
    required: ['id', 'name', 'parentid'],
    reason: 'has id, name and parentId columns',
  },

  {
    format: 'path',
    label: 'Path format',
    required: ['path'],
    reason: 'has a path column and no explicit parent column',
  },

  {
    format: 'pivot',
    label: 'Pivot / BI export',
    required: [],
    test: (lower) => levelColumns(lower).length >= 2,
    reason: 'has two or more "Level N" columns',
  },

];




/**
 * @param {string[]} columns 
 * @returns {import('./formatContract').DetectionResult}
 */
export function detectFormat(columns) {


  if (!Array.isArray(columns) || columns.length === 0) 
  {
    return {
      format: 'unknown',
      label: 'Unrecognised',
      reason: 'the file has no columns',
      columns: [],
    };
  }


  const lower = columns.map((c) => String(c).trim().toLowerCase());


  for (const signature of SIGNATURES) 
  {
    const hasRequired = signature.required.every((r) => lower.includes(r));

    const passesTest = signature.test ? signature.test(lower) : true;

    if (hasRequired && passesTest) 
    {
      console.log(`detectFormat: matched "${signature.format}" — ${signature.reason}.`);

      return {
        format: signature.format,
        label: signature.label,
        reason: signature.reason,
        columns,
      };
    }
  }


  return {
    format: 'unknown',
    label: 'Unrecognised',
    reason: `no known format matches. Columns found: ${columns.join(', ')}. ` + `Expected either id/name/parentId, or a path column, or "Level 1", "Level 2", … columns.`,
    columns,
  };
}




/**
 * Level columns in ascending order — "Level 1", "level 2", "LEVEL 3".
 *
 * @param {string[]} columns 
 * @returns {Array<{ name: string, level: number }>} 
 */
export function levelColumns(columns) {

  const found = [];

  for (const column of columns) 
  {
    const match = String(column).trim().match(/^level\s*(\d+)$/i);

    if (match) 
    {
      found.push({ name: column, level: Number(match[1]) });
    }
  }

  found.sort((a, b) => a.level - b.level);

  return found;
}