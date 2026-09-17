---
name: angular-feature
description: Receita para criar tela ou componente na SPA Angular 22 do Flight Search - standalone, signals, httpResource, control flow novo e checklist de acessibilidade. Use ao criar ou alterar componente, rota, formulário ou serviço no repo flight-search-web.
---

# Feature na SPA do Flight Search

Angular 22, standalone, signals, SCSS. Sem `NgModule` no projeto.

## Esqueleto de componente

```ts
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  output,
  signal,
} from '@angular/core';

@Component({
  selector: 'fs-flight-results',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section aria-labelledby="results-heading">
      <h2 id="results-heading">Voos encontrados</h2>

      <p role="status" aria-live="polite">
        {{ announcement() }}
      </p>

      @if (offers.isLoading()) {
        <fs-skeleton-list [count]="5" />
      } @else if (offers.error()) {
        <fs-error-state (retry)="offers.reload()" />
      } @else {
        <ul class="results">
          @for (offer of offers.value(); track offer.id) {
            <li><fs-offer-card [offer]="offer" (select)="selected.emit(offer)" /></li>
          } @empty {
            <li class="empty">Nenhum voo para esta rota e data.</li>
          }
        </ul>
      }
    </section>
  `,
})
export class FlightResultsComponent {
  readonly criteria = input.required<FlightSearchCriteria>();
  readonly selected = output<FlightOffer>();

  private readonly api = inject(FlightSearchService);

  readonly offers = this.api.searchResource(this.criteria);

  readonly announcement = computed(() => {
    if (this.offers.isLoading()) return 'Buscando voos...';
    const n = this.offers.value()?.length ?? 0;
    return n === 0
      ? 'Nenhum voo encontrado.'
      : `${n} ${n === 1 ? 'voo encontrado' : 'voos encontrados'}.`;
  });
}
```

## Regras que não se negociam

- `input()` / `output()` como funções — nunca `@Input()` / `@Output()`.
- `@if` / `@for` / `@switch` — nunca `*ngIf` / `*ngFor`. `track` é obrigatório no `@for`.
- `OnPush` em todo componente.
- `inject()` no lugar de injeção por construtor.
- Signals para estado. `BehaviorSubject` para estado de componente é proibido.
- `httpResource()` / `resource()` para dados assíncronos — expõem `.value()`, `.isLoading()`, `.error()`
  como signals, sem `async` pipe nem desinscrição manual.
- `@defer` para o que está abaixo da dobra (mapa, detalhes pesados).

## Tipos vêm do contrato

```bash
npm run sync:api-types     # baixa openapi.yaml da API e gera src/app/core/api/types.ts
```

Nunca escreva à mão uma interface espelhando resposta da API. Se o tipo não existe, o contrato está
desatualizado — resolva lá, não aqui.

## Autenticação

Sanctum modo SPA com cookie httpOnly. O interceptor envia `withCredentials: true`, e `/sanctum/csrf-cookie`
precede o login. **Nunca** toque em token no `localStorage` ou `sessionStorage` — é decisão de segurança.

## Cores

Só variáveis CSS, nunca hex literal:

```scss
.btn-primary {
  background: var(--brand-500);
  color: var(--ink); // preto sobre verde = 9.64:1
  &:hover {
    background: var(--brand-600);
  }
  &:focus-visible {
    outline: 3px solid var(--brand-700);
    outline-offset: 2px;
  }
}

.link {
  color: var(--brand-700);
  text-decoration: underline;
} // 5.41:1
```

Nunca texto branco sobre `--brand-500`, nunca `--brand-500` como texto ou borda sobre branco. Detalhes na
skill `design-tokens`.

## Acessibilidade — checklist de entrega

- Todo input com `<label>` associado por `for`/`id`. `placeholder` não é label.
- Erro do campo ligado por `aria-describedby` + `aria-invalid="true"`.
- Campos relacionados em `<fieldset>` com `<legend>` (ida/volta, passageiros).
- Autocomplete de aeroporto como **combobox ARIA completo**: `role="combobox"`, `aria-expanded`,
  `aria-controls`, `aria-activedescendant`; teclado ↑ ↓ Enter Esc, com Esc devolvendo foco ao input.
- Contagem de resultados anunciada por `aria-live="polite"`.
- Um `<h1>` por página, hierarquia sem pular nível.
- Alvo de toque ≥ 44×44px. Funciona com zoom de 200%.
- Estado nunca só por cor.

## Teste junto do componente

```ts
it('anuncia a quantidade de voos encontrados', async () => {
  await render(FlightResultsComponent, { inputs: { criteria: gruLis() } });

  expect(await screen.findByRole('status')).toHaveTextContent('2 voos encontrados');
});
```

Teste comportamento observável — `getByRole`, texto na tela — nunca estado interno do componente.

## Fechamento

```bash
npx prettier --write . && npx eslint . --fix
npm run test
node scripts/check-contrast.mjs
npx playwright test
```
