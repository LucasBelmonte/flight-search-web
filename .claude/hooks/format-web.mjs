#!/usr/bin/env node
/**
 * PostToolUse — formata o arquivo recém-editado e, quando for estilo,
 * valida o contraste da paleta.
 *
 * O validador de contraste roda aqui de propósito: contraste insuficiente é o
 * tipo de defeito que ninguém percebe olhando a tela, só medindo. Rodar no
 * momento da edição evita que a regressão chegue ao PR.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const run = (cmd, args, cwd) => {
  try {
    return { ok: true, out: execFileSync(cmd, args, { cwd, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { ok: false, out: `${e.stdout ?? ''}${e.stderr ?? ''}` };
  }
};

const findRoot = (start) => {
  let dir = dirname(resolve(start));
  for (let i = 0; i < 10; i++) {
    if (existsSync(resolve(dir, 'angular.json'))) return dir;
    const up = dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return null;
};

const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx';

let raw = '';
process.stdin.on('data', (c) => (raw += c));
process.stdin.on('end', () => {
  let file = '';
  try {
    const p = JSON.parse(raw);
    file = p?.tool_response?.filePath ?? p?.tool_input?.file_path ?? '';
  } catch {
    process.exit(0);
  }

  if (!/\.(ts|html|scss|css|json|md)$/i.test(file)) process.exit(0);

  const root = findRoot(file);
  if (!root || !existsSync(resolve(root, 'node_modules'))) process.exit(0);

  run(npx, ['prettier', '--write', '--ignore-unknown', file], root);

  if (/\.ts$/i.test(file)) {
    run(npx, ['eslint', '--fix', file], root);
  }

  if (/\.(scss|css)$/i.test(file)) {
    const contrast = run('node', ['scripts/check-contrast.mjs'], root);
    if (!contrast.ok) {
      process.stderr.write(
        `${contrast.out}\n` +
          'O contraste precisa passar em WCAG AA antes de seguir. Consulte a skill design-tokens.\n',
      );
      process.exit(2);
    }
  }

  process.exit(0);
});
