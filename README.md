# Flight Search — Web

SPA de busca de passagens aéreas. Angular 22, standalone components, signals, SCSS.

Consome a [Flight Search API](../flight-search-api). Cumpre **WCAG 2.1 nível AA**.

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

## Cores e contraste

A marca é `#0BC977`, `#FFFFFF` e `#000000`. O verde sobre branco dá **2.18:1**, abaixo do mínimo de 4.5:1
para texto e de 3:1 para bordas — então ele **não pode ser texto nem contorno sobre branco**. Como fundo
com texto preto ele vai muito bem: 9.64:1.

| Token         | Hex       | Onde pode aparecer                    | Contraste |
| ------------- | --------- | ------------------------------------- | --------- |
| `--brand-500` | `#0BC977` | Só fundo. Texto em cima sempre preto  | 9.64:1    |
| `--brand-600` | `#09A561` | Borda, anel de foco, ícone decorativo | 3.20:1    |
| `--brand-700` | `#077A47` | Texto verde, link, ícone informativo  | 5.41:1    |
| `--ink`       | `#000000` | Texto padrão                          | 21:1      |
| `--surface`   | `#FFFFFF` | Fundo                                 | —         |

`npm run check:contrast` mede cada par declarado e falha o build se algum reprovar. Ele também acusa hex
literal fora de `src/styles/_tokens.scss`, porque hex literal burla a própria validação. O hook de
PostToolUse roda isso a cada arquivo de estilo salvo.

Ao criar uma combinação nova de cores, registre-a em `PAIRS` dentro de `scripts/check-contrast.mjs` — par
não declarado não é validado, e o que não é validado regride.

## Acessibilidade

Não é revisão posterior, é parte da entrega. O lint trata regras de template de acessibilidade como
**erro**, não aviso.

O que já está implementado: link "pular para o conteúdo"; marcos semânticos (`header`, `main`, `footer`);
combobox de aeroporto seguindo o padrão ARIA completo, com `aria-expanded`, `aria-controls`,
`aria-activedescendant` e o ciclo ↑ ↓ Enter Esc Home End; contagem de resultados anunciada por região
`aria-live`; descrição por extenso de cada trecho para leitor de tela; foco visível em tudo que é focável;
alvos de toque de 44px; `prefers-reduced-motion` respeitado.

## Estrutura

```
src/app/
  core/api/            contrato gerado, modelos, formatação, serviço, dados de exemplo
  features/search/     formulário, combobox, card de oferta, página de resultados
  app.ts               shell com cabeçalho, main e rodapé
src/styles/_tokens.scss     a paleta — única fonte de cor do projeto
scripts/check-contrast.mjs  validador WCAG
.claude/                    agents, hooks e configuração de qualidade
```
