import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

import {
  formatDuration,
  formatDurationAccessible,
  formatLocalTime,
  formatPrice,
  formatShortDate,
  formatStops,
  stopCount,
} from '../../core/api/format';
import type { FlightOffer } from '../../core/api/models';

/**
 * Card de uma oferta de voo.
 *
 * O destaque "mais barato" carrega ícone e texto além do fundo verde: cor
 * sozinha não comunica estado (WCAG 1.4.1), e quem não distingue o verde
 * precisa da mesma informação.
 */
@Component({
  selector: 'fs-offer-card',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './offer-card.scss',
  template: `
    <article [attr.aria-label]="cardLabel()">
      @if (cheapest()) {
        <p class="badge">
          <span aria-hidden="true">★</span>
          Menor preço
        </p>
      }

      <div class="body">
        <div class="itineraries">
          @for (leg of offer().itineraries; track $index) {
            <div class="leg">
              <p class="leg-label">
                {{ $index === 0 ? 'Ida' : 'Volta' }} ·
                {{ shortDate(leg.segments[0].departure_at) }}
              </p>

              <div class="times">
                <div class="endpoint">
                  <span class="time">{{ time(leg.segments[0].departure_at) }}</span>
                  <span class="iata">{{ leg.segments[0].origin }}</span>
                </div>

                <div class="middle">
                  <span class="duration">{{ duration(leg.duration_minutes) }}</span>
                  <span class="line" aria-hidden="true"></span>
                  <span class="stops">{{ stops(leg.segments.length) }}</span>
                </div>

                <div class="endpoint">
                  <span class="time">{{ time(lastSegment(leg.segments).arrival_at) }}</span>
                  <span class="iata">{{ lastSegment(leg.segments).destination }}</span>
                </div>
              </div>

              <p class="carrier">
                {{ leg.segments[0].carrier_name ?? leg.segments[0].carrier_code }}
                · voo {{ leg.segments[0].carrier_code }}{{ leg.segments[0].flight_number }}
              </p>

              <!-- Descrição por extenso do trecho, só para leitor de tela: a
                   versão visual usa abreviações que não se leem bem em voz. -->
              <p class="sr-only">
                Partida às {{ time(leg.segments[0].departure_at) }} de {{ leg.segments[0].origin }},
                chegada às {{ time(lastSegment(leg.segments).arrival_at) }} em
                {{ lastSegment(leg.segments).destination }}. Duração de
                {{ durationAccessible(leg.duration_minutes) }}. {{ stops(leg.segments.length) }}.
              </p>
            </div>
          }
        </div>

        <div class="price">
          <p class="amount">{{ price() }}</p>
          <p class="note">Total para {{ passengersLabel() }}</p>

          @if (offer().seats_remaining !== null && offer().seats_remaining !== undefined) {
            <p class="scarcity">
              Restam {{ offer().seats_remaining }}
              {{ offer().seats_remaining === 1 ? 'assento' : 'assentos' }}
            </p>
          }

          <button type="button" class="btn-select">Selecionar</button>
        </div>
      </div>
    </article>
  `,
})
export class OfferCard {
  readonly offer = input.required<FlightOffer>();
  readonly cheapest = input(false);
  readonly passengers = input(1);

  /**
   * Nome acessível do cartão: rota, horário e preço.
   *
   * Rotular o artigo apenas pelo preço — que era o caso — faz cada oferta se
   * anunciar como "R$ 1.234,56" quando alguém navega de região em região, sem
   * dizer de que voo se trata antes de entrar no conteúdo.
   */
  protected readonly cardLabel = computed(() => {
    const outbound = this.offer().itineraries[0];
    const first = outbound.segments[0];
    const last = outbound.segments[outbound.segments.length - 1];

    const stops = formatStops(stopCount(outbound.segments.length));

    return (
      `Voo de ${first.origin} para ${last.destination}, ` +
      `partida às ${formatLocalTime(first.departure_at)}, ` +
      `${formatDurationAccessible(outbound.duration_minutes)}, ${stops}, ` +
      `${this.price()}`
    );
  });

  protected readonly price = computed(() => formatPrice(this.offer().price, this.offer().currency));

  protected readonly passengersLabel = computed(() => {
    const n = this.passengers();
    return n === 1 ? '1 passageiro' : `${n} passageiros`;
  });

  protected time = formatLocalTime;
  protected shortDate = formatShortDate;
  protected duration = formatDuration;
  protected durationAccessible = formatDurationAccessible;

  protected stops(segmentCount: number): string {
    return formatStops(stopCount(segmentCount));
  }

  protected lastSegment<T>(segments: T[]): T {
    return segments[segments.length - 1];
  }
}
