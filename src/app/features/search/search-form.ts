import { ChangeDetectionStrategy, Component, computed, output, signal } from '@angular/core';

import type { CabinClass, FlightSearchCriteria } from '../../core/api/models';
import { CABIN_LABELS } from '../../core/api/models';
import { AirportCombobox } from './airport-combobox';

type TripType = 'one_way' | 'round_trip';

/** Campos que podem ter erro próprio, ligados ao input por aria-describedby. */
type FieldKey = 'origin' | 'destination' | 'departure' | 'return';

/** Ordem de leitura do resumo de erros — a mesma ordem visual do formulário. */
const FIELD_ORDER: FieldKey[] = ['origin', 'destination', 'departure', 'return'];

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
          [invalid]="hasError('origin')"
          [errorId]="errorId('origin')"
          [(value)]="origin"
        />

        <fs-airport-combobox
          label="Destino"
          inputId="destination"
          [invalid]="hasError('destination')"
          [errorId]="errorId('destination')"
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
            [attr.aria-invalid]="hasError('departure') ? 'true' : null"
            [attr.aria-describedby]="errorId('departure')"
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
              [attr.aria-invalid]="hasError('return') ? 'true' : null"
              [attr.aria-describedby]="errorId('return')"
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

      @if (showErrors() && errorList().length) {
        <div class="errors" role="alert">
          <p>Corrija antes de buscar:</p>
          <ul>
            @for (error of errorList(); track error.field) {
              <!-- O id aqui é o alvo do aria-describedby do campo correspondente:
                   é o que faz o leitor de tela ler o motivo junto com "inválido". -->
              <li [id]="error.id">{{ error.message }}</li>
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

  /**
   * Data de hoje no fuso do usuário, não em UTC.
   *
   * `toISOString().slice(0, 10)` devolveria a data UTC: às 21h de São Paulo já
   * seria o dia seguinte, e o formulário bloquearia a busca de um voo que parte
   * ainda hoje de madrugada. `en-CA` formata como YYYY-MM-DD, que é o formato
   * que o input `type=date` espera.
   */
  protected readonly today = new Date().toLocaleDateString('en-CA');

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

  /**
   * Erros indexados pelo campo que os causou.
   *
   * Indexar por campo, e não só acumular uma lista, é o que permite ligar cada
   * mensagem ao seu input por `aria-describedby`. Sem esse vínculo, quem usa
   * leitor de tela ouve "inválido" ao tabular e precisa caçar o motivo no bloco
   * de erros lá embaixo.
   */
  protected readonly fieldErrors = computed<Partial<Record<FieldKey, string>>>(() => {
    const errors: Partial<Record<FieldKey, string>> = {};

    if (!this.origin()) {
      errors.origin = 'Escolha o aeroporto de origem.';
    }

    if (!this.destination()) {
      errors.destination = 'Escolha o aeroporto de destino.';
    } else if (this.sameAirport()) {
      errors.destination = 'A origem e o destino precisam ser diferentes.';
    }

    if (!this.departureDate()) {
      errors.departure = 'Escolha a data de ida.';
    } else if (this.departureDate() < this.today) {
      // O input `type=date` aceita digitação e o formulário é `novalidate`, então
      // o atributo `min` sozinho não impede o envio. Sem esta checagem a API
      // devolveria 422 — uma ida e volta à rede por algo verificável aqui.
      errors.departure = 'A ida precisa ser hoje ou uma data futura.';
    }

    if (this.tripType() === 'round_trip') {
      if (!this.returnDate()) {
        errors.return = 'Escolha a data de volta.';
      } else if (this.departureDate() && this.returnDate() < this.departureDate()) {
        errors.return = 'A volta precisa ser depois da ida.';
      }
    }

    return errors;
  });

  /** Os mesmos erros em ordem de leitura, para o resumo do topo. */
  protected readonly errorList = computed(() =>
    FIELD_ORDER.filter((field) => this.fieldErrors()[field]).map((field) => ({
      field,
      id: `error-${field}`,
      message: this.fieldErrors()[field] as string,
    })),
  );

  protected hasError(field: FieldKey): boolean {
    return this.showErrors() && Boolean(this.fieldErrors()[field]);
  }

  /** Id da mensagem deste campo, ou null quando ele não tem erro visível. */
  protected errorId(field: FieldKey): string | null {
    return this.hasError(field) ? `error-${field}` : null;
  }

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

    if (this.errorList().length > 0) return;

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
