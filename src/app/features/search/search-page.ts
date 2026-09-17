import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { FlightSearchService } from '../../core/api/flight-search.service';
import type { FlightSearchCriteria } from '../../core/api/models';
import { OfferCard } from './offer-card';
import { SearchForm } from './search-form';

type SortKey = 'price' | 'duration' | 'departure';

/**
 * Página de busca: formulário, ordenação e lista de resultados.
 *
 * Enquanto `criteria()` for undefined nenhuma requisição sai — a tela abre em
 * repouso e só busca quando o usuário submete critérios válidos.
 */
@Component({
  selector: 'fs-search-page',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SearchForm, OfferCard],
  styleUrl: './search-page.scss',
  template: `
    <h1>Busque sua passagem</h1>
    <p class="lead">Escolha origem, destino e data para comparar voos.</p>

    @if (usingSampleData) {
      <p class="sample-warning" role="note">
        <strong>Dados de exemplo.</strong>
        A API ainda não está conectada, então estes preços são fictícios e servem apenas para
        demonstrar a interface.
      </p>
    }

    <fs-search-form (searchSubmit)="onSearch($event)" />

    <!-- Região viva: quem usa leitor de tela precisa saber que a lista mudou,
         já que o conteúdo aparece longe do botão que disparou a busca. -->
    <p class="status" role="status" aria-live="polite">{{ announcement() }}</p>

    @if (criteria()) {
      <section aria-labelledby="results-heading" class="results">
        <div class="results-header">
          <h2 id="results-heading">
            {{ resultsHeading() }}
          </h2>

          @if (offers().length > 1) {
            <div class="sort">
              <label for="sort">Ordenar por</label>
              <select id="sort" [value]="sortKey()" (change)="onSort($event)">
                <option value="price">Menor preço</option>
                <option value="duration">Menor duração</option>
                <option value="departure">Partida mais cedo</option>
              </select>
            </div>
          }
        </div>

        @if (results.isLoading()) {
          <p class="feedback">Buscando voos…</p>
        } @else if (results.error()) {
          <div class="feedback error" role="alert">
            <p>Não foi possível consultar voos no momento.</p>
            <button type="button" (click)="results.reload()">Tentar novamente</button>
          </div>
        } @else {
          <ul class="offers">
            @for (offer of offers(); track offer.id; let i = $index) {
              <li>
                <fs-offer-card
                  [offer]="offer"
                  [cheapest]="offer.id === cheapestId()"
                  [passengers]="passengerCount()"
                />
              </li>
            } @empty {
              <li class="feedback">
                Nenhum voo encontrado para esta rota e data. Tente outra data.
              </li>
            }
          </ul>
        }
      </section>
    }
  `,
})
export class SearchPage {
  private readonly api = inject(FlightSearchService);

  protected readonly usingSampleData = this.api.usingSampleData;

  protected readonly criteria = signal<FlightSearchCriteria | undefined>(undefined);
  protected readonly sortKey = signal<SortKey>('price');

  protected readonly results = this.api.searchResource(this.criteria);

  private readonly rawOffers = computed(() => this.results.value()?.data ?? []);

  protected readonly offers = computed(() => {
    const list = [...this.rawOffers()];

    switch (this.sortKey()) {
      case 'duration':
        return list.sort((a, b) => totalDuration(a) - totalDuration(b));
      case 'departure':
        return list.sort((a, b) =>
          a.itineraries[0].segments[0].departure_at.localeCompare(
            b.itineraries[0].segments[0].departure_at,
          ),
        );
      default:
        return list.sort((a, b) => a.price - b.price);
    }
  });

  /**
   * O menor preço é calculado sobre a lista bruta, não sobre a ordenada: a
   * oferta mais barata continua sendo a mais barata mesmo ordenando por duração.
   */
  protected readonly cheapestId = computed(() => {
    const list = this.rawOffers();
    if (list.length === 0) return null;
    return list.reduce((min, o) => (o.price < min.price ? o : min), list[0]).id;
  });

  protected readonly passengerCount = computed(() => {
    const c = this.criteria();
    return c ? c.adults + (c.children ?? 0) : 1;
  });

  protected readonly resultsHeading = computed(() => {
    const c = this.criteria();
    if (!c) return 'Resultados';

    const trip = c.return_date ? 'ida e volta' : 'somente ida';
    return `${c.origin} → ${c.destination} · ${trip}`;
  });

  protected readonly announcement = computed(() => {
    if (!this.criteria()) return '';
    if (this.results.isLoading()) return 'Buscando voos…';
    if (this.results.error()) return 'A busca falhou. Tente novamente.';

    const n = this.offers().length;
    if (n === 0) return 'Nenhum voo encontrado.';
    return n === 1 ? '1 voo encontrado.' : `${n} voos encontrados.`;
  });

  protected onSearch(criteria: FlightSearchCriteria): void {
    this.criteria.set(criteria);
  }

  protected onSort(event: Event): void {
    this.sortKey.set((event.target as HTMLSelectElement).value as SortKey);
  }
}

function totalDuration(offer: { itineraries: { duration_minutes: number }[] }): number {
  return offer.itineraries.reduce((sum, leg) => sum + leg.duration_minutes, 0);
}
