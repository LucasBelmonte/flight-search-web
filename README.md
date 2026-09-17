# Flight Search — Web

SPA de busca de passagens aéreas. Angular 22, standalone components, signals, SCSS.

Consome a [Flight Search API](https://github.com/LucasBelmonte/flight-search-api). Cumpre
**WCAG 2.1 nível AA** nos temas claro e escuro.

## Status

> A interface está no ar, mas com **dados de exemplo**: o backend ainda não foi implementado, e a tela
> avisa isso a quem visita. Os preços são fictícios.

**Pronto:** busca completa (origem, destino, ida e volta, passageiros, cabine) · autocomplete de aeroporto
como combobox ARIA · resultados ordenáveis · temas claro e escuro seguindo o sistema · 30 verificações de
contraste nos dois temas · 42 testes · CI e deploy automáticos.

**Pendente:** conectar à API real (trocar `useSampleData` para `false` quando o backend existir) ·
autenticação e favoritos, já especificados no contrato · testes end-to-end com Playwright e axe-core.

O backend é o caminho crítico: veja o status dele no
[repositório da API](https://github.com/LucasBelmonte/flight-search-api).

## Rodando

```bash
npm install
npm start          # http://localhost:4200
```

A aplicação abre em **modo de dados de exemplo**, então funciona antes da API existir. Um aviso visível na
tela deixa claro que os preços são fictícios. Para apontar para a API real, edite
`src/app/core/api/api.config.ts`:

```ts
export const apiConfig: ApiConfig = {
  baseUrl: 'http://flight-search-api.test',
  useSampleData: false,
};
```

**Node 24.15.0 ou superior** — o Angular 22 não roda em versões anteriores.

## Comandos

```bash
npm run verify           # format + lint + contraste + testes + build. Rode antes de abrir PR.

npm start                # servidor de desenvolvimento
npm run build            # build de produção
npm run test             # testes unitários (Vitest)
npm run test:watch       # em modo observação
npm run test:coverage    # com relatório de cobertura
npm run lint             # ESLint, com regras de acessibilidade como erro
npm run format           # Prettier
npm run check:contrast   # validador WCAG da paleta
npm run sync:api-types   # regenera os tipos a partir do openapi.yaml da API
```

## Tipos vêm do contrato, não da mão

`src/app/core/api/types.ts` é **gerado** do `openapi.yaml` do repositório da API:

```bash
npm run sync:api-types
```

Nunca escreva à mão uma interface que espelhe resposta da API, e nunca edite `types.ts` — a próxima
sincronia desfaz a edição e esconde a divergência real entre os dois repositórios. Se um tipo que você
precisa não existe, o contrato está incompleto: corrija-o lá.

> O script roda o gerador via `npx` isolado de propósito. O `openapi-typescript` ainda declara peer
> dependency de TypeScript 5, e este projeto usa TypeScript 6 — rodar isolado evita forçar
> `--legacy-peer-deps` no projeto inteiro por causa de uma ferramenta que só produz um arquivo.

## Temas

A aplicação tem tema claro e escuro. Ao abrir pela primeira vez ela **segue a preferência do sistema**
(`prefers-color-scheme`), e o seletor no cabeçalho oferece três opções: Claro, Escuro e Sistema.

"Sistema" é uma opção de primeira classe, não a ausência de escolha: quem alterna o tema do sistema ao
anoitecer continua acompanhado, e a tela muda sem recarregar. A escolha explícita fica no `localStorage`;
"sistema" não persiste nada, justamente para voltar a seguir o sistema.

Um script inline no `index.html` aplica o tema antes de o CSS pintar. Sem ele, quem tem o sistema em claro
mas escolheu o escuro veria a tela branca até o bundle carregar.

## Cores e contraste

A marca é `#0BC977`, `#FFFFFF` e `#000000`. O ponto central é que **as regras do verde se invertem entre
os temas**:

|                         | tema claro                   | tema escuro                  |
| ----------------------- | ---------------------------- | ---------------------------- |
| `#0BC977` sobre o fundo | 2,18:1 ❌ não pode ser texto | 8,92:1 ✅ **pode ser texto** |
| `#077A47` sobre o fundo | 5,41:1 ✅ é o texto verde    | 3,46:1 ❌ reprova            |

Por isso os componentes usam **tokens semânticos**, nunca a escala `--brand-*`:

| Token                  | Para quê                 | Claro     | Escuro    |
| ---------------------- | ------------------------ | --------- | --------- |
| `--surface`            | Fundo da página          | `#FFFFFF` | `#0D0D0D` |
| `--surface-raised`     | Card, dropdown, campo    | `#FFFFFF` | `#1E1E1E` |
| `--text`               | Texto padrão             | `#000000` | `#EDEDED` |
| `--text-muted`         | Texto secundário         | `#4A4A4A` | `#B0B0B0` |
| `--text-accent`        | Texto e link de destaque | `#077A47` | `#0BC977` |
| `--accent-surface`     | Fundo de botão primário  | `#0BC977` | `#0BC977` |
| `--on-accent`          | Texto sobre accent       | `#000000` | `#000000` |
| `--border-interactive` | Borda de campo           | `#09A561` | `#757575` |
| `--focus-color`        | Anel de foco             | `#077A47` | `#0BC977` |
| `--danger`             | Erro                     | `#B3261E` | `#FFB4AB` |

`npm run check:contrast` mede cada par declarado **nos dois temas** — 30 verificações — e falha o build se
alguma reprovar. Ele também acusa hex literal fora de `src/styles/_tokens.scss`, porque hex literal burla
a própria validação. O hook de PostToolUse roda isso a cada arquivo de estilo salvo.

Ao criar uma combinação nova de cores, registre-a em `PAIRS` dentro de `scripts/check-contrast.mjs` — par
não declarado não é validado, e o que não é validado regride. O fundo declarado precisa ser a superfície
real: um input dentro de um card está sobre `--surface-raised`, não sobre `--surface`.

## Acessibilidade

Não é revisão posterior, é parte da entrega. O lint trata regras de template de acessibilidade como
**erro**, não aviso.

O que já está implementado: link "pular para o conteúdo"; marcos semânticos (`header`, `main`, `footer`);
combobox de aeroporto seguindo o padrão ARIA completo, com `aria-expanded`, `aria-controls`,
`aria-activedescendant` e o ciclo ↑ ↓ Enter Esc Home End; contagem de resultados anunciada por região
`aria-live`; descrição por extenso de cada trecho para leitor de tela; foco visível em tudo que é focável;
alvos de toque de 44px; `prefers-reduced-motion` respeitado.

## Desenvolvendo com agentes

O diretório `.claude/` é **versionado**: ao clonar, você já recebe os agentes, as skills e os hooks. Com o
Claude Code aberto neste repositório, tudo carrega sozinho.

**Agentes** (`.claude/agents/`) — `planner` decide o escopo e muda o contrato antes do código;
`frontend-coder` implementa; `test-engineer` cobre; `a11y-guardian` audita acessibilidade; `code-reviewer`
revisa o diff; `git-publisher` abre o PR. Você não precisa chamá-los pelo nome: descreva a tarefa e o
agente certo é acionado.

**Skills** (`.claude/skills/`) — `angular-feature`, `design-tokens`, `api-contract` e `ship-pr` carregam
sozinhas quando o trabalho toca a área correspondente, e também podem ser invocadas com `/design-tokens`.

**Hooks** (`.claude/settings.json`) — bloqueiam leitura e escrita de `.env`, `git push --force`,
`--no-verify` e commit direto na `main`; rodam Prettier e ESLint a cada arquivo salvo e, em arquivo de
estilo, o validador de contraste, interrompendo se algum par reprovar.

O guia completo da arquitetura, incluindo a cadeia de provedores e o fluxo entre os dois repositórios,
está no README do diretório que contém os dois repos.

## Estrutura

```
src/app/
  core/api/            contrato gerado, modelos, formatação, serviço, dados de exemplo
  features/search/     formulário, combobox, card de oferta, página de resultados
  app.ts               shell com cabeçalho, main e rodapé
src/styles/_tokens.scss     a paleta — única fonte de cor do projeto
scripts/check-contrast.mjs  validador WCAG
.claude/agents/             os agentes de desenvolvimento e revisão
.claude/skills/             as receitas carregadas por contexto
.claude/settings.json       hooks de qualidade e segurança
```
