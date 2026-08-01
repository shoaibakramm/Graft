/**
 * Dummy data for testing Phase 3 in isolation.
 *
 * Every row matches the shape scenarios.js returns:
 *   { id, name, parentId, metadata }
 * with parentId === null on the root.
 *
 */




/* ------------------------------------------------------------------------ */
/*  Valid trees                                                             */
/* ------------------------------------------------------------------------ */


/**
 * Straight chain, no branching. Every node an only child, so the layout
 * should place them in one vertical line.
 */
export const chain = [
  { id: '1', name: 'CEO',      parentId: null, metadata: 'Executive' },
  { id: '2', name: 'CTO',      parentId: '1',  metadata: 'Technology' },
  { id: '3', name: 'Manager',  parentId: '2',  metadata: 'Engineering' },
  { id: '4', name: 'Employee', parentId: '3',  metadata: 'Engineering' },
];


/**
 * One node only. Catches the "no children" edge case in the layout walk.
 */
export const singleNode = [
  { id: 'root', name: 'Only Node', parentId: null, metadata: '' },
];


/**
 * Scenario A — corporate org chart. Uneven depths on purpose: Legal is a leaf
 * at depth 1 while Engineering runs three levels deep. compactBox should NOT
 * drag Legal down to the bottom row.
 */
export const orgChart = [
  { id: '1',  name: 'Amara Osei',      parentId: null, metadata: 'CEO | Executive' },

  { id: '2',  name: 'Ravi Chandra',    parentId: '1',  metadata: 'CTO | Technology' },
  { id: '3',  name: 'Lena Fischer',    parentId: '1',  metadata: 'CFO | Finance' },
  { id: '4',  name: 'Tom Whitfield',   parentId: '1',  metadata: 'General Counsel | Legal' },

  { id: '5',  name: 'Priya Nair',      parentId: '2',  metadata: 'VP Engineering | Technology' },
  { id: '6',  name: 'Diego Márquez',   parentId: '2',  metadata: 'VP Infrastructure | Technology' },

  { id: '7',  name: 'Sam Okonkwo',     parentId: '5',  metadata: 'Frontend Lead | Engineering' },
  { id: '8',  name: 'Yuki Tanaka',     parentId: '5',  metadata: 'Backend Lead | Engineering' },
  { id: '9',  name: 'Nadia Haddad',    parentId: '5',  metadata: 'QA Lead | Engineering' },

  { id: '10', name: 'Ben Larsson',     parentId: '7',  metadata: 'Engineer | Engineering' },
  { id: '11', name: 'Mei Zhang',       parentId: '7',  metadata: 'Engineer | Engineering' },

  { id: '12', name: 'Ana Ferreira',    parentId: '6',  metadata: 'SRE | Infrastructure' },

  { id: '13', name: 'Ollie Brennan',   parentId: '3',  metadata: 'Controller | Finance' },
];


/**
 * Scenario B — website navigation taxonomy. Same component, unrelated domain.
 * Proves the layout is data agnostic.*/
export const navTaxonomy = [
  { id: 'home',        name: '/',                parentId: null,      metadata: 'Landing | Public' },

  { id: 'products',    name: '/products',        parentId: 'home',    metadata: 'Category | Public' },
  { id: 'docs',        name: '/docs',            parentId: 'home',    metadata: 'Category | Public' },
  { id: 'about',       name: '/about',           parentId: 'home',    metadata: 'Static | Public' },
  { id: 'account',     name: '/account',         parentId: 'home',    metadata: 'Category | Private' },

  { id: 'p-list',      name: '/products/all',    parentId: 'products', metadata: 'Index | Public' },
  { id: 'p-detail',    name: '/products/:slug',  parentId: 'products', metadata: 'Dynamic | Public' },

  { id: 'd-start',     name: '/docs/quickstart', parentId: 'docs',    metadata: 'Guide | Public' },
  { id: 'd-api',       name: '/docs/api',        parentId: 'docs',    metadata: 'Reference | Public' },
  { id: 'd-api-auth',  name: '/docs/api/auth',   parentId: 'd-api',   metadata: 'Reference | Public' },

  { id: 'a-settings',  name: '/account/settings', parentId: 'account', metadata: 'Form | Private' },
  { id: 'a-billing',   name: '/account/billing',  parentId: 'account', metadata: 'Form | Private' },
];


/**
 * One parent, many children. Stresses sibling spacing and makes the bounding
 * box much wider than it is tall.
 */
export const wideTree = [
  { id: 'r', name: 'Root', parentId: null, metadata: '' },
  ...Array.from({ length: 12 }, (_, i) => ({
    id: `c${i + 1}`,
    name: `Child ${i + 1}`,
    parentId: 'r',
    metadata: '',
  })),
];


/**
 * parentId as "" rather than null — what a raw CSV upload produces if it
 * bypasses the SQL NULL conversion. Must still resolve to a root.
 */
export const emptyStringRoot = [
  { id: '1', name: 'Root', parentId: '', metadata: '' },
  { id: '2', name: 'Kid',  parentId: '1', metadata: '' },
];


/**
 * Non-default column names. Confirms the accessor options actually work
 * instead of the keys being hardcoded.
 */
export const customKeys = [
  { pk: 'a', title: 'Root', fk: null, metadata: '' },
  { pk: 'b', title: 'Kid',  fk: 'a',  metadata: '' },
];




/* ------------------------------------------------------------------------ */
/*  Broken trees — every one of these must throw a clear error              */
/* ------------------------------------------------------------------------ */


export const broken = {

  /** Nothing to lay out. */
  empty: [],

  /** Trailing ",,," row in a CSV. Reads as a second root with an empty id. */
  blankRow: [
    { id: '1', name: 'CEO', parentId: null, metadata: '' },
    { id: '',  name: '',    parentId: '',   metadata: '' },
  ],

  /** Same id twice — silently loses a subtree if not caught. */
  duplicateId: [
    { id: '1', name: 'A', parentId: null, metadata: '' },
    { id: '1', name: 'B', parentId: null, metadata: '' },
  ],

  /** Three roots. A tree layout can only draw one. */
  multipleRoots: [
    { id: '1', name: 'A', parentId: null, metadata: '' },
    { id: '2', name: 'B', parentId: null, metadata: '' },
    { id: '3', name: 'C', parentId: null, metadata: '' },
  ],

  /** Every row has a parent, so there is no entry point. */
  noRoot: [
    { id: '1', name: 'A', parentId: '2', metadata: '' },
    { id: '2', name: 'B', parentId: '1', metadata: '' },
  ],

  /** parentId points at an id that does not exist. */
  missingParent: [
    { id: '1', name: 'A', parentId: null, metadata: '' },
    { id: '2', name: 'B', parentId: '99', metadata: '' },
  ],

  /** A node parented to itself. */
  selfParent: [
    { id: '1', name: 'A', parentId: null, metadata: '' },
    { id: '2', name: 'B', parentId: '2',  metadata: '' },
  ],

  /** 2 -> 4 -> 3 -> 2. Valid root exists, but three rows are unreachable. */
  cycle: [
    { id: '1', name: 'R', parentId: null, metadata: '' },
    { id: '2', name: 'A', parentId: '4',  metadata: '' },
    { id: '3', name: 'B', parentId: '2',  metadata: '' },
    { id: '4', name: 'C', parentId: '3',  metadata: '' },
  ],

  /** No id column at all — wrong file uploaded. */
  wrongColumns: [
    { nodeId: '1', label: 'A', parent: '', metadata: '' },
  ],

};