#!/usr/bin/env node
/**
 * Stop — roda os testes unitários quando o agente termina o turno.
 *
 * Roda em background (async). Playwright fica de fora de propósito: e2e é lento
 * demais para um hook de turno e pertence ao CI e ao fluxo de PR.
 */

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = process.cwd();
const quiet = () => process.exit(0);

if (!existsSync(resolve(root, 'node_modules'))) quiet();

const npm = process.platform === 'win32' ? 'npm.cmd' : 'npm';

try {
  execFileSync(npm, ['run', 'test'], { cwd: root, encoding: 'utf8', stdio: 'pipe' });
  quiet();
} catch (e) {
  const out = `${e.stdout ?? ''}${e.stderr ?? ''}`;
  const failed = out.match(/Tests\s+.*failed.*/i)?.[0] ?? 'a suíte falhou';
  process.stdout.write(
    JSON.stringify({
      systemMessage: `Testes do frontend falhando — ${failed}. Rode: npm run test`,
    }),
  );
  process.exit(0);
}
