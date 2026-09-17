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
// Tokens semânticos — devem espelhar src/styles/_tokens.scss
//
// Os dois temas usam os MESMOS nomes com valores diferentes. É isso que permite
// declarar cada par uma vez e medi-lo nos dois: se o escuro não fosse validado
// junto, ele poderia regredir sem que nada acusasse.
// --------------------------------------------------------------------------
const THEMES = {
  claro: {
    surface: '#FFFFFF',
    'surface-raised': '#FFFFFF',
    'surface-sunken': '#F7F7F7',
    text: '#000000',
    'text-muted': '#4A4A4A',
    'text-accent': '#077A47',
    'accent-surface': '#0BC977',
    'accent-surface-hover': '#09A561',
    'on-accent': '#000000',
    'border-subtle': '#D4D4D4',
    'border-interactive': '#09A561',
    'focus-color': '#077A47',
    danger: '#B3261E',
    'danger-surface': '#FDF2F1',
  },

  escuro: {
    surface: '#0D0D0D',
    'surface-raised': '#1E1E1E',
    'surface-sunken': '#000000',
    text: '#EDEDED',
    'text-muted': '#B0B0B0',
    // No escuro a cor da marca vira texto válido; o #077A47 do claro reprovaria.
    'text-accent': '#0BC977',
    'accent-surface': '#0BC977',
    'accent-surface-hover': '#09A561',
    'on-accent': '#000000',
    'border-subtle': '#333333',
    'border-interactive': '#757575',
    'focus-color': '#0BC977',
    danger: '#FFB4AB',
    'danger-surface': '#2A1614',
  },
};

/**
 * Cada par que o design usa de fato, medido nos dois temas.
 *
 * Par não declarado aqui não é validado — e o que não é validado regride. Ao
 * criar uma combinação nova, registre-a.
 *
 * `bg` deve ser a superfície REAL sobre a qual o elemento aparece: um input
 * dentro de um card está sobre `surface-raised`, não sobre `surface`.
 *
 * kind: 'text' (4.5:1) | 'large' (3:1) | 'ui' (3:1)
 */
const PAIRS = [
  { name: 'texto padrão sobre o fundo', fg: 'text', bg: 'surface', kind: 'text' },
  { name: 'texto padrão sobre card', fg: 'text', bg: 'surface-raised', kind: 'text' },
  { name: 'texto secundário sobre o fundo', fg: 'text-muted', bg: 'surface', kind: 'text' },
  { name: 'texto secundário sobre card', fg: 'text-muted', bg: 'surface-raised', kind: 'text' },
  { name: 'texto em seção rebaixada', fg: 'text-muted', bg: 'surface-sunken', kind: 'text' },

  { name: 'label de botão primário', fg: 'on-accent', bg: 'accent-surface', kind: 'text' },
  {
    name: 'label de botão primário em hover',
    fg: 'on-accent',
    bg: 'accent-surface-hover',
    kind: 'text',
  },

  { name: 'link e texto de destaque', fg: 'text-accent', bg: 'surface', kind: 'text' },
  { name: 'texto de destaque sobre card', fg: 'text-accent', bg: 'surface-raised', kind: 'text' },

  { name: 'anel de foco sobre o fundo', fg: 'focus-color', bg: 'surface', kind: 'ui' },
  { name: 'anel de foco sobre card', fg: 'focus-color', bg: 'surface-raised', kind: 'ui' },

  { name: 'borda de input', fg: 'border-interactive', bg: 'surface-raised', kind: 'ui' },

  { name: 'mensagem de erro', fg: 'danger', bg: 'surface-raised', kind: 'text' },
  { name: 'texto do bloco de erro', fg: 'text', bg: 'danger-surface', kind: 'text' },
  { name: 'borda do bloco de erro', fg: 'danger', bg: 'danger-surface', kind: 'ui' },
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

let checks = 0;

for (const [themeName, tokens] of Object.entries(THEMES)) {
  say(`Tema ${themeName}\n`);

  for (const pair of PAIRS) {
    const fg = tokens[pair.fg];
    const bg = tokens[pair.bg];

    if (!fg || !bg) {
      failures.push(
        `[${themeName}] Token inexistente no par "${pair.name}": ${!fg ? pair.fg : pair.bg}`,
      );
      continue;
    }

    const ratio = contrast(fg, bg);
    const min = THRESHOLD[pair.kind];
    const ok = ratio >= min;
    checks++;

    say(
      `  ${ok ? 'OK  ' : 'FALHA'}  ${ratio.toFixed(2).padStart(5)}:1  (min ${min}:1)  ` +
        `${pair.name} — ${pair.fg} sobre ${pair.bg}`,
    );

    if (!ok) {
      failures.push(
        `[${themeName}] "${pair.name}": ${fg} sobre ${bg} = ${ratio.toFixed(2)}:1, ` +
          `abaixo do mínimo de ${min}:1`,
      );
    }
  }

  say('');
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
    '\nLembrete: componente nunca usa --brand-* direto, porque as regras do verde\n' +
      'se invertem entre os temas. Use os tokens semânticos:\n' +
      '  --text-accent        texto e link de destaque (o valor certo por tema)\n' +
      '  --accent-surface     fundo de botão, sempre com --on-accent por cima\n' +
      '  --border-interactive borda de controle, garante 3:1 nos dois temas\n' +
      '  --focus-color        anel de foco\n',
  );
  process.exit(1);
}

if (!quiet) console.log(lines.join('\n'));
console.log(
  `\n${checks} verificações passam em WCAG AA ` +
    `(${PAIRS.length} pares × ${Object.keys(THEMES).length} temas).`,
);
