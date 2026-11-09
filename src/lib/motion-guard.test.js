/**
 * Guardrail test: every stylesheet that animates must honour reduced motion.
 *
 * Repo convention (AGENTS.md): animations are disabled or downgraded under
 * `prefers-reduced-motion`, in CSS as well as in JS. This test walks every
 * stylesheet under `src/` and fails when a file declares `@keyframes` or an
 * `animation:` shorthand without also declaring a `prefers-reduced-motion`
 * media query. The failure names the offending file so the fix is obvious.
 *
 * Pure `node:*` imports only — no DOM, no extra dependencies.
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

/** `src/` — the directory this test lives in, one level up. */
const SRC_DIR = fileURLToPath(new URL('..', import.meta.url));
/** Repository root, two levels up from `src/lib/`. Used for readable paths. */
const REPO_ROOT = fileURLToPath(new URL('../..', import.meta.url));

/** Directories that never belong to app source. Pruned during the walk. */
const SKIP_DIRS = new Set(['node_modules', 'dist', 'build', '.git', '.vite']);

/** `@keyframes`, `@-webkit-keyframes`, `animation:` and vendor-prefixed forms. */
const ANIMATION_RE = /@(?:-[a-z]+-)?keyframes\b|(?:^|[;{\s])(?:-[a-z]+-)?animation\s*:/i;

/** Any mention of the reduced-motion media feature. */
const REDUCED_MOTION_RE = /prefers-reduced-motion/i;

/** Strip block comments so commented-out rules cannot trigger the guard. */
function stripComments(css) {
  return css.replace(/\/\*[\s\S]*?\*\//g, '');
}

/** Normalise a path for stable, platform-independent failure messages. */
function toPosix(path) {
  return path.split(sep).join('/');
}

/**
 * Recursively collect `*.css` files, sorted by path so the result is
 * independent of filesystem enumeration order.
 */
function listCssFiles(dir, skipDirs = SKIP_DIRS) {
  const found = [];
  const walk = (current) => {
    const entries = readdirSync(current, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0,
    );

    for (const entry of entries) {
      const full = join(current, entry.name);
      if (entry.isDirectory()) {
        if (!skipDirs.has(entry.name)) walk(full);
      } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.css')) {
        found.push(full);
      }
    }
  };

  walk(dir);
  return found;
}

/**
 * Core guard, pure and in-memory so it can be exercised without touching the
 * real stylesheets. `stylesheets` is `[{ id, css }]`; returns the sorted ids of
 * files that animate without a reduced-motion fallback.
 */
function findViolations(stylesheets) {
  return stylesheets
    .filter(({ css }) => {
      const code = stripComments(css);
      return ANIMATION_RE.test(code) && !REDUCED_MOTION_RE.test(code);
    })
    .map(({ id }) => id)
    .sort();
}

/** Read the real stylesheets and hand them to the guard. */
function scanRepoStylesheets() {
  return listCssFiles(SRC_DIR).map((file) => ({
    id: toPosix(relative(REPO_ROOT, file)),
    css: readFileSync(file, 'utf8'),
  }));
}

// --- The guard itself must actually detect problems (in-memory fixtures) ---

test('guard flags a stylesheet with @keyframes but no reduced-motion block', () => {
  const violations = findViolations([
    {
      id: 'src/bad.css',
      css: '@keyframes spin { to { transform: rotate(1turn); } }\n.spinner { animation: spin 2s linear infinite; }',
    },
  ]);

  assert.deepEqual(violations, ['src/bad.css']);
});

test('guard flags a stylesheet that only uses the animation shorthand', () => {
  const violations = findViolations([
    { id: 'src/only-shorthand.css', css: '.pulse { animation: pulse 1.2s ease-in-out infinite; }' },
  ]);

  assert.deepEqual(violations, ['src/only-shorthand.css']);
});

test('guard flags vendor-prefixed animation declarations too', () => {
  const violations = findViolations([
    { id: 'src/vendor.css', css: '.legacy { -webkit-animation: fade 1s linear; }' },
  ]);

  assert.deepEqual(violations, ['src/vendor.css']);
});

test('guard accepts a stylesheet that animates and declares a fallback', () => {
  const violations = findViolations([
    {
      id: 'src/good.css',
      css: [
        '@keyframes spin { to { transform: rotate(1turn); } }',
        '.spinner { animation: spin 2s linear infinite; }',
        '@media (prefers-reduced-motion: reduce) {',
        '  .spinner { animation: none; }',
        '}',
      ].join('\n'),
    },
  ]);

  assert.deepEqual(violations, []);
});

test('guard ignores stylesheets with no animation at all', () => {
  const violations = findViolations([
    { id: 'src/static.css', css: '.card { transition: transform 160ms ease; }' },
    { id: 'src/empty.css', css: '' },
  ]);

  assert.deepEqual(violations, []);
});

test('guard ignores animation declarations that are commented out', () => {
  const violations = findViolations([
    { id: 'src/commented.css', css: '/* .x { animation: spin 1s; } */ .x { color: red; }' },
  ]);

  assert.deepEqual(violations, []);
});

// --- The real repository must stay compliant ---

test('scan finds stylesheets under src/ (guards against a false green)', () => {
  const stylesheets = scanRepoStylesheets();

  assert.ok(
    stylesheets.length > 0,
    'expected at least one CSS file under src/; the scan root is wrong',
  );
});

test('every src/ stylesheet that animates has a prefers-reduced-motion fallback', () => {
  const violations = findViolations(scanRepoStylesheets());

  assert.deepEqual(
    violations,
    [],
    [
      'CSS animation without a prefers-reduced-motion fallback:',
      ...violations.map((file) => `  - ${file}`),
      'Add an @media (prefers-reduced-motion: reduce) block that disables/downgrades the animation.',
    ].join('\n'),
  );
});
