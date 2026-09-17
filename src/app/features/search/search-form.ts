import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import type { CabinClass, FlightSearchCriteria } from '../../core/api/models';
import { CABIN_LABELS } from '../../core/api/models';
import { AirportCombobox } from './airport-combobox';

type TripType = 'one_way' | 'round_trip';

/**
 * Formulário de busca: origem, destino, datas e passageiros.
 *
 * Só emite quando os critérios estão completos e coerentes. Validar aqui evita
 * uma requisição que a API rejeitaria de qualquer forma — e cada busca custa
 * chamada de provider externo.
 */
@Component({
  selector: 'fs-search-form',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [AirportCombobox],
  styleUrl: './search-form.scss',
  template: `
    <form (submit)="submit($event)" novalidate>
      <fieldset class="trip-type">
        <legend>Tipo de viagem</legend>

        <div class="radios">
          <label>
            <input
              type="radio"
              name="trip"
              value="round_trip"
              [checked]="tripType() === 'round_trip'"
              (change)="tripType.set('round_trip')"
            />
            Ida e volta
          </label>

          <label>
            <input
              type="radio"
              name="trip"
              value="one_way"
              [checked]="tripType() === 'one_way'"
              (change)="tripType.set('one_way')"
            />
            Somente ida
          </label>
        </div>
      </fieldset>

      <div class="route">
        <fs-airport-combobox
          label="Origem"
          inputId="origin"
          [invalid]="showErrors() && !origin()"
          [(value)]="origin"
        />

        <fs-airport-combobox
          label="Destino"
          inputId="destination"
          [invalid]="showErrors() && (!destination() || sameAirport())"
          [(value)]="destination"
        />
      </div>

      <div class="dates">
        <div class="field">
          <label for="departure">Ida</label>
          <input
            id="departure"
            type="date"
            [min]="today"
            [value]="departureDate()"
            [attr.aria-invalid]="showErrors() && !departureDate() ? 'true' : null"
            (change)="onDeparture($event)"
          />
        </div>

        @if (tripType() === 'round_trip') {
          <div class="field">
            <label for="return">Volta</label>
            <input
              id="return"
              type="date"
              [min]="departureDate() || today"
              [value]="returnDate()"
              [attr.aria-invalid]="showErrors() && !returnDate() ? 'true' : null"
              (change)="onReturn($event)"
            />
          </div>
        }
      </div>

      <fieldset class="passengers">
        <legend>Passageiros e cabine</legend>

        <div class="field">
          <label for="adults">Adultos</label>
          <input
            id="adults"
            type="number"
            min="1"
            max="9"
            [value]="adults()"
            (change)="adults.set(clamp($event, 1, 9))"
          />
        </div>

        <div class="field">
          <label for="children">Crianças</label>
          <input
            id="children"
            type="number"
            min="0"
            max="8"
            [value]="children()"
            (change)="children.set(clamp($event, 0, 8))"
          />
        </div>

        <div class="field">
          <label for="cabin">Cabine</label>
          <select id="cabin" [value]="cabin()" (change)="onCabin($event)">
            @for (option of cabinOptions; track option.value) {
              <option [value]="option.value">{{ option.label }}</option>
            }
          </select>
        </div>
      </fieldset>

      @if (showErrors() && errors().length) {
        <div class="errors" role="alert">
          <p>Corrija antes de buscar:</p>
          <ul>
            @for (error of errors(); track error) {
              <li>{{ error }}</li>
            }
          </ul>
        </div>
      }

      <button type="submit" class="btn-primary">Buscar voos</button>
    </form>
  `,
})
export class SearchForm {
  /**
   * Não se chama `search` porque `search` é um evento DOM nativo de input — o
   * nome colidiria e tornaria ambíguo quem disparou o quê no template pai.
   */
  readonly searchSubmit = output<FlightSearchCriteria>();

  protected readonly today = new Date().toISOString().slice(0, 10);
  protected readonly cabinOptions = (Object.keys(CABIN_LABELS) as CabinClass[]).map((value) => ({
    value,
    label: CABIN_LABELS[value],
  }));

  protected readonly tripType = signal<TripType>('round_trip');
  protected readonly origin = signal('');
  protected readonly destination = signal('');
  protected readonly departureDate = signal('');
  protected readonly returnDate = signal('');
  protected readonly adults = signal(1);
  protected readonly children = signal(0);
  protected readonly cabin = signal<CabinClass>('economy');

  /** Erros só aparecem depois da primeira tentativa — avisar antes é ruído. */
  protected readonly showErrors = signal(false);

  protected readonly sameAirport = computed(
    () => Boolean(this.origin()) && this.origin() === this.destination(),
  );

  protected readonly errors = computed<string[]>(() => {
    const list: string[] = [];

    if (!this.origin()) list.push('Escolha o aeroporto de origem.');
    if (!this.destination()) list.push('Escolha o aeroporto de destino.');
    if (this.sameAirport()) list.push('A origem e o destino precisam ser diferentes.');
    if (!this.departureDate()) list.push('Escolha a data de ida.');

    if (this.tripType() === 'round_trip') {
      if (!this.returnDate()) {
        list.push('Escolha a data de volta.');
      } else if (this.departureDate() && this.returnDate() < this.departureDate()) {
        list.push('A volta precisa ser depois da ida.');
      }
    }

    return list;
  });

  protected onDeparture(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.departureDate.set(value);

    // Volta anterior à nova ida deixa de fazer sentido — limpar evita que o
    // usuário submeta um intervalo inválido sem perceber.
    if (this.returnDate() && this.returnDate() < value) {
      this.returnDate.set('');
    }
  }

  protected onReturn(event: Event): void {
    this.returnDate.set((event.target as HTMLInputElement).value);
  }

  protected onCabin(event: Event): void {
    this.cabin.set((event.target as HTMLSelectElement).value as CabinClass);
  }

  protected clamp(event: Event, min: number, max: number): number {
    const raw = Number((event.target as HTMLInputElement).value);
    if (Number.isNaN(raw)) return min;
    return Math.min(max, Math.max(min, Math.trunc(raw)));
  }

  protected submit(event: Event): void {
    event.preventDefault();
    this.showErrors.set(true);

    if (this.errors().length > 0) return;

    this.searchSubmit.emit({
      origin: this.origin(),
      destination: this.destination(),
      departure_date: this.departureDate(),
      return_date: this.tripType() === 'round_trip' ? this.returnDate() : null,
      adults: this.adults(),
      children: this.children(),
      cabin: this.cabin(),
      currency: 'BRL',
    });
  }
}
