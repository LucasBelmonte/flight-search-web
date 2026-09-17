---
name: design-tokens
description: Paleta e regras de contraste WCAG AA do Flight Search - onde cada tom do verde da marca pode aparecer, valores medidos e o validador automático. Use ao escrever qualquer CSS, SCSS, escolher cor, estilizar componente ou ajustar tema.
---

# Design tokens — Flight Search

A marca é `#0BC977`, `#FFFFFF` e `#000000`, e o sistema precisa cumprir **WCAG 2.1 AA**.

## O problema que define estas regras

`#0BC977` sobre `#FFFFFF` dá **2.18:1**. O mínimo é 4.5:1 para texto e 3:1 para borda ou componente de
interface. Então o verde da marca **não pode ser texto nem borda sobre branco**.

Onde ele brilha é como **fundo com texto preto**: 9.64:1, bem acima do exigido. Para os casos em que o
verde precisa ser texto ou contorno, o projeto usa dois tons mais escuros do mesmo matiz.

## A paleta

```css
:root {
  --brand-500: #0bc977; /* fundo de botão, badge, barra. Texto em cima: SEMPRE preto  */
  --brand-600: #09a561; /* borda, anel de foco, ícone decorativo sobre branco          */
  --brand-700: #077a47; /* texto verde, link, ícone informativo sobre branco           */

  --ink: #000000;
  --surface: #ffffff;

  --ink-muted: #4a4a4a; /* 8.9:1 sobre branco — texto secundário                    */
  --border-subtle: #d4d4d4; /* separador não-informativo (isento de contraste)          */
  --danger: #b3261e; /* 7.0:1 sobre branco                                       */
}
```

| Par                       | Contraste | Veredito               |
| ------------------------- | --------- | ---------------------- |
| `#000000` sobre `#0BC977` | 9.64:1    | ✅ AA e AAA            |
| `#077A47` sobre `#FFFFFF` | 5.41:1    | ✅ AA texto            |
| `#09A561` sobre `#FFFFFF` | 3.20:1    | ✅ só componente/borda |
| `#000000` sobre `#FFFFFF` | 21:1      | ✅                     |
| `#FFFFFF` sobre `#0BC977` | 2.18:1    | ❌ proibido            |
| `#0BC977` sobre `#FFFFFF` | 2.18:1    | ❌ proibido            |

## Regras de uso

**Botão primário** — fundo `--brand-500`, texto `--ink`. Hover escurece para `--brand-600` mantendo texto
preto (6.57:1, ainda AA).

**Link** — `--brand-700`, com sublinhado. Cor sozinha não distingue link de texto (WCAG 1.4.1).

**Anel de foco** — `outline: 3px solid var(--brand-700); outline-offset: 2px`. Nunca `outline: none` sem
substituto de contraste suficiente.

**Estado e badge** — nunca comunique só por cor. O badge "mais barato" leva ícone **e** texto além do
fundo verde.

**Sempre a variável.** Hex literal no componente burla o validador automático e é achado de revisão.

## Validador

`scripts/check-contrast.mjs` no repo web varre os tokens e os pares declarados, e **falha o build** se
algum reprovar. Ele roda no hook de PostToolUse de todo arquivo de estilo e no CI.

```bash
node scripts/check-contrast.mjs
```

Ao adicionar um par de cores novo, registre-o na lista `PAIRS` do script — par não declarado não é
validado, e o que não é validado regride.

## Conferindo um par à mão

```bash
node -e '
const lin=c=>{c/=255;return c<=0.03928?c/12.92:Math.pow((c+0.055)/1.055,2.4)};
const L=h=>{const n=parseInt(h.slice(1),16);return 0.2126*lin(n>>16&255)+0.7152*lin(n>>8&255)+0.0722*lin(n&255)};
const C=(a,b)=>{const x=L(a),y=L(b),[hi,lo]=x>y?[x,y]:[y,x];return ((hi+0.05)/(lo+0.05)).toFixed(2)};
console.log(C("#077A47","#FFFFFF"));
'
```

Limiares AA: **4.5:1** texto normal · **3:1** texto grande (≥24px, ou ≥18.66px em negrito) · **3:1**
componentes de interface e gráficos.
