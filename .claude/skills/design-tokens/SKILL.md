---
name: design-tokens
description: Paleta, temas claro e escuro, e regras de contraste WCAG AA do Flight Search - qual token usar em cada situação, valores medidos nos dois temas e o validador automático. Use ao escrever qualquer CSS, SCSS, escolher cor, estilizar componente ou mexer no tema.
---

# Design tokens — Flight Search

A marca é `#0BC977`, `#FFFFFF` e `#000000`, e o sistema cumpre **WCAG 2.1 AA nos dois temas**.

## A regra que você precisa saber antes de tudo

**Componente nunca usa `--brand-*` direto.** Use os tokens semânticos.

O motivo é que as regras do verde **se invertem** entre os temas:

|                         | tema claro                   | tema escuro                  |
| ----------------------- | ---------------------------- | ---------------------------- |
| `#0BC977` sobre o fundo | 2,18:1 ❌ não pode ser texto | 8,92:1 ✅ **pode ser texto** |
| `#077A47` sobre o fundo | 5,41:1 ✅ é o texto verde    | 3,46:1 ❌ reprova            |

Se o componente escrevesse `color: var(--brand-700)`, ele estaria certo no claro e errado no escuro. Com
`color: var(--text-accent)`, quem resolve é a troca de tema.

## Os tokens semânticos

| Token                    | Para quê                     | Claro     | Escuro    |
| ------------------------ | ---------------------------- | --------- | --------- |
| `--surface`              | Fundo da página              | `#FFFFFF` | `#0D0D0D` |
| `--surface-raised`       | Card, dropdown, campo        | `#FFFFFF` | `#1E1E1E` |
| `--surface-sunken`       | Rodapé, seção rebaixada      | `#F7F7F7` | `#000000` |
| `--text`                 | Texto padrão                 | `#000000` | `#EDEDED` |
| `--text-muted`           | Texto secundário             | `#4A4A4A` | `#B0B0B0` |
| `--text-accent`          | **Texto e link de destaque** | `#077A47` | `#0BC977` |
| `--accent-surface`       | Fundo de botão primário      | `#0BC977` | `#0BC977` |
| `--accent-surface-hover` | O mesmo, em hover            | `#09A561` | `#09A561` |
| `--on-accent`            | **Texto sobre accent**       | `#000000` | `#000000` |
| `--border-subtle`        | Separador decorativo         | `#D4D4D4` | `#333333` |
| `--border-interactive`   | **Borda de controle**        | `#09A561` | `#757575` |
| `--focus-color`          | Anel de foco                 | `#077A47` | `#0BC977` |
| `--danger`               | Erro                         | `#B3261E` | `#FFB4AB` |
| `--danger-surface`       | Fundo do bloco de erro       | `#FDF2F1` | `#2A1614` |

Três armadilhas que esses nomes evitam:

**`--on-accent` é preto nos dois temas.** O botão continua verde no escuro, e texto claro sobre verde daria
2,2:1. Nunca use `--text` sobre `--accent-surface`.

**`--danger` muda completamente.** O `#B3261E` do claro dá 2,87:1 sobre fundo escuro e reprova.

**`--border-interactive`, não `--border-subtle`, em campo de formulário.** A borda que delimita um controle
é componente de interface e precisa de 3:1 (WCAG 1.4.11). `--border-subtle` é só para separador decorativo,
que é isento.

## Como o tema é escolhido

```scss
:root {
  /* tokens claros */
}

@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    @include dark-theme;
  }
}

:root[data-theme='dark'] {
  @include dark-theme;
}
```

A preferência do sistema vale por padrão; a escolha explícita do usuário vence. No modo "sistema" o
atributo `data-theme` é **removido**, e é isso que deixa a media query decidir.

O `ThemeService` (`core/theme/`) aplica o tema **de forma síncrona**, não por `effect()`: um ciclo de
atraso na inicialização é exatamente o tempo de a tela piscar no tema errado. Um script inline no
`index.html` cobre o intervalo antes de o bundle carregar.

Todo bloco de tema declara `color-scheme`, o que faz o navegador pintar corretamente scrollbars, seletores
de data e outros controles nativos.

## O validador

`scripts/check-contrast.mjs` mede cada par declarado **nos dois temas** e falha o build se algum reprovar.
Roda no hook de PostToolUse de todo arquivo de estilo e no CI.

```bash
node scripts/check-contrast.mjs
```

Ao criar uma combinação nova, registre-a em `PAIRS`. Par não declarado não é medido, e o que não é medido
regride. O `bg` precisa ser a superfície **real**: um input dentro de um card está sobre `--surface-raised`,
não sobre `--surface`.

O script também acusa hex literal da marca fora de `_tokens.scss` — hex literal burla a própria validação,
então é ele mesmo uma violação. Há uma lista de exceções, e cada entrada exige razão técnica; hoje existe
uma só: `<meta name="theme-color">`, que não aceita `var()`.

## Regras de uso

**Botão primário** — `background: var(--accent-surface); color: var(--on-accent);`. Hover troca para
`--accent-surface-hover`, mantendo o texto preto.

**Link** — `color: var(--text-accent)` com sublinhado. Cor sozinha não distingue link de texto (WCAG 1.4.1).

**Foco** — `outline: var(--focus-ring); outline-offset: var(--focus-offset)`. Nunca `outline: none` sem
substituto de contraste suficiente.

**Estado** — nunca comunicado só por cor. O selo "mais barato" leva ícone e texto além do fundo verde.

## Conferindo um par à mão

```bash
node -e '
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{const n=parseInt(h.slice(1),16);return 0.2126*lin(n>>16&255)+0.7152*lin(n>>8&255)+0.0722*lin(n&255)};
const C=(a,b)=>{const x=L(a),y=L(b),[hi,lo]=x>y?[x,y]:[y,x];return ((hi+0.05)/(lo+0.05)).toFixed(2)};
console.log(C("#0BC977","#0D0D0D"));
'
```

Limiares AA: **4,5:1** texto normal · **3:1** texto grande (≥24px, ou ≥18,66px em negrito) · **3:1**
componentes de interface.
