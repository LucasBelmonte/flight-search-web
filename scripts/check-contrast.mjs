#!/usr/bin/env node
/**
 * Validador de contraste WCAG 2.1 AA — Flight Search
 *
 * 1. Verifica cada par de cores declarado em PAIRS contra o limiar exigido.
 * 2. Varre os fontes em busca de hex literal da marca fora do arquivo de tokens
 *    (hex literal burla esta validação, então ele próprio é uma violação).
 *
 * Sai com código 1 se algo reprovar — serve para hook de PostToolUse e para CI.
 *
 * Uso:  node scripts/check-contrast.mjs [--quiet]
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, sep } from 'node:path';

// --------------------------------------------------------------------------
// Tokens — devem espelhar src/styles/_tokens.scss
// --------------------------------------------------------------------------
const TOKENS = {
  'brand-500': '#0BC977', // só fundo; texto em cima sempre preto
  'brand-600': '#09A561', // borda, foco, ícone decorativo sobre branco
  'brand-700': '#077A47', // texto verde, link sobre branco
  ink: '#000000',
  surface: '#FFFFFF',
  'ink-muted': '#4A4A4A',
  danger: '#B3261E',
};

/**
 * Cada par que o design usa de fato. Par não declarado aqui não é validado —
 * e o que não é validado regride. Ao criar uma combinação nova, registre-a.
 *
 * kind: 'text' (4.5:1) | 'large' (3:1) | 'ui' (3:1)
 */
const PAIRS = [
  { name: 'texto padrão sobre fundo', fg: 'ink', bg: 'surface', kind: 'text' },
  { name: 'texto secundário sobre fundo', fg: 'ink-muted', bg: 'surface', kind: 'text' },
  { name: 'label de botão primário', fg: 'ink', bg: 'brand-500', kind: 'text' },
  { name: 'label de botão primário em hover', fg: 'ink', bg: 'brand-600', kind: 'text' },
  { name: 'link e texto verde', fg: 'brand-700', bg: 'surface', kind: 'text' },
  { name: 'anel de foco', fg: 'brand-700', bg: 'surface', kind: 'ui' },
  { name: 'borda de input e ícone decorativo', fg: 'brand-600', bg: 'surface', kind: 'ui' },
  { name: 'mensagem de erro', fg: 'danger', bg: 'surface', kind: 'text' },
];

/** Combinações proibidas por medição — se aparecerem no código, é bug. */
const FORBIDDEN_HEX_OUTSIDE_TOKENS = ['#0BC977', '#09A561', '#077A47'];

/**
 * Exceções: lugares onde o hex literal é a única forma possível.
 *
 * Cada entrada precisa de uma razão técnica, não de conveniência. Uma exceção
 * sem motivo real é o começo do fim de qualquer regra automatizada.
 */
const LITERAL_EXCEPTIONS = [
  {
    // <meta name="theme-color"> é lido pelo navegador antes do CSS existir,
    // então var(--brand-500) não resolveria. É cor de chrome do navegador,
    // não de conteúdo, e não participa de contraste de texto.
    test: (file, line) => file.endsWith('index.html') && line.includes('theme-color'),
    why: 'meta theme-color não aceita var()',
  },
];

const THRESHOLD = { text: 4.5, large: 3, ui: 3 };
const SOURCE_DIRS = ['src'];
const SOURCE_EXTS = new Set(['.scss', '.css', '.html', '.ts']);
const TOKEN_FILE_HINT = '_tokens.scss';

// --------------------------------------------------------------------------
// WCAG 2.1 — luminância relativa e razão de contraste
// --------------------------------------------------------------------------
const channel = (c) => {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
};

const luminance = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return (
    0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255)
  );
};

const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)];
  const [hi, lo] = x > y ? [x, y] : [y, x];
  return (hi + 0.05) / (lo + 0.05);
};

// --------------------------------------------------------------------------
const quiet = process.argv.includes('--quiet');
const failures = [];
const lines = [];

const say = (s) => lines.push(s);

say('Contraste WCAG 2.1 AA — Flight Search\n');

for (const pair of PAIRS) {
  const fg = TOKENS[pair.fg];
  const bg = TOKENS[pair.bg];

  if (!fg || !bg) {
    failures.push(`Token inexistente no par "${pair.name}": ${!fg ? pair.fg : pair.bg}`);
    continue;
  }

  const ratio = contrast(fg, bg);
  const min = THRESHOLD[pair.kind];
  const ok = ratio >= min;

  say(
    `  ${ok ? 'OK  ' : 'FALHA'}  ${ratio.toFixed(2).padStart(5)}:1  (min ${min}:1)  ` +
      `${pair.name} — ${pair.fg} sobre ${pair.bg}`,
  );

  if (!ok) {
    failures.push(
      `"${pair.name}": ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1, abaixo do mínimo de ${min}:1`,
    );
  }
}

// --------------------------------------------------------------------------
// Hex literal da marca fora do arquivo de tokens
// --------------------------------------------------------------------------
const walk = (dir, out = []) => {
  let entries;
  try {
    entries = readdirSync(dir);
  } catch {
    return out;
  }
  for (const entry of entries) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (SOURCE_EXTS.has(extname(full))) out.push(full);
  }
  return out;
};

const literals = [];

for (const dir of SOURCE_DIRS) {
  for (const file of walk(dir)) {
    if (file.endsWith(TOKEN_FILE_HINT)) continue;

    const posix = file.split(sep).join('/');
    const content = readFileSync(file, 'utf8').split('\n');

    content.forEach((line, i) => {
      for (const hex of FORBIDDEN_HEX_OUTSIDE_TOKENS) {
        if (!line.toLowerCase().includes(hex.toLowerCase())) continue;

        const exception = LITERAL_EXCEPTIONS.find((e) => e.test(posix, line));
        if (exception) {
          say(`  nota  ${posix}:${i + 1} usa ${hex} literal — permitido: ${exception.why}`);
          continue;
        }

        literals.push(`${posix}:${i + 1} usa ${hex} literal — use var(--...)`);
      }
    });
  }
}

if (literals.length) {
  say('\nHex literal da marca fora dos tokens:\n');
  for (const l of literals) say(`  FALHA  ${l}`);
  failures.push(...literals);
}

// --------------------------------------------------------------------------
if (failures.length) {
  console.error(lines.join('\n'));
  console.error(`\n${failures.length} violação(ões) de contraste:\n`);
  for (const f of failures) console.error(`  • ${f}`);
  console.error(
    '\nLembrete: #0BC977 sobre branco dá 2.18:1. Ele é fundo com texto preto (9.64:1).\n' +
      'Para texto verde use --brand-700 (5.41:1); para borda e foco, --brand-600 (3.20:1).\n',
  );
  process.exit(1);
}

if (!quiet) console.log(lines.join('\n'));
console.log(`\nTodos os ${PAIRS.length} pares passam em WCAG AA.`);
