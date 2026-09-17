import {
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
  viewChild,
} from '@angular/core';

import { FlightSearchService } from '../../core/api/flight-search.service';
import type { Airport } from '../../core/api/models';

/**
 * Combobox de aeroporto seguindo o padrão ARIA Authoring Practices.
 *
 * É o componente mais delicado da tela em acessibilidade: um autocomplete feito
 * pela metade deixa quem usa leitor de tela sem saber que apareceram opções, e
 * quem navega por teclado sem conseguir escolher nenhuma. O padrão completo exige
 * aria-expanded, aria-controls, aria-activedescendant e o ciclo ↑ ↓ Enter Esc —
 * nenhum deles é opcional.
 */
@Component({
  selector: 'fs-airport-combobox',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './airport-combobox.scss',
  template: `
    <div class="combobox">
      <label [for]="inputId()">{{ label() }}</label>

      <input
        #inputEl
        [id]="inputId()"
        type="text"
        role="combobox"
        autocomplete="off"
        spellcheck="false"
        [attr.aria-expanded]="isOpen()"
        [attr.aria-controls]="listboxId()"
        [attr.aria-activedescendant]="activeOptionId()"
        [attr.aria-describedby]="hintId()"
        [attr.aria-invalid]="invalid() ? 'true' : null"
        [value]="displayValue()"
        (input)="onType($event)"
        (keydown)="onKeydown($event)"
        (focus)="onFocus()"
        (blur)="onBlur()"
      />

      <p [id]="hintId()" class="hint">Digite a cidade ou o código de três letras, como GRU.</p>

      @if (isOpen()) {
        <ul [id]="listboxId()" role="listbox" [attr.aria-label]="'Aeroportos para ' + label()">
          @for (airport of options(); track airport.iata_code; let i = $index) {
            <li
              [id]="optionId(i)"
              role="option"
              [attr.aria-selected]="i === activeIndex()"
              [class.active]="i === activeIndex()"
              (mousedown)="choose(airport, $event)"
              (mouseenter)="activeIndex.set(i)"
            >
              <span class="code">{{ airport.iata_code }}</span>
              <span class="place">
                <strong>{{ airport.city }}</strong>
                <span class="name">{{ airport.name }}</span>
              </span>
            </li>
          } @empty {
            <li role="option" aria-selected="false" class="empty" aria-disabled="true">
              Nenhum aeroporto encontrado.
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class AirportCombobox {
  readonly label = input.required<string>();
  readonly inputId = input.required<string>();
  readonly invalid = input(false);

  /** Código IATA escolhido. Vazio enquanto o usuário não escolher uma opção. */
  readonly value = model<string>('');

  private readonly api = inject(FlightSearchService);
  private readonly inputEl = viewChild.required<ElementRef<HTMLInputElement>>('inputEl');

  /** O que está digitado. Só vira `value` quando uma opção é de fato escolhida. */
  private readonly term = signal('');
  private readonly focused = signal(false);
  private readonly chosen = signal<Airport | undefined>(undefined);

  protected readonly activeIndex = signal(-1);

  private readonly airports = this.api.airportResource(this.term);

  protected readonly options = computed<Airport[]>(() => this.airports.value()?.data ?? []);

  protected readonly isOpen = computed(
    () => this.focused() && this.term().trim().length >= 2 && !this.chosen(),
  );

  protected readonly displayValue = computed(() => {
    const picked = this.chosen();
    return picked ? `${picked.city} (${picked.iata_code})` : this.term();
  });

  protected readonly listboxId = computed(() => `${this.inputId()}-listbox`);
  protected readonly hintId = computed(() => `${this.inputId()}-hint`);

  /**
   * O leitor de tela lê a opção apontada por aria-activedescendant. Sem isso o
   * foco visual anda pela lista mas o anúncio não acompanha.
   */
  protected readonly activeOptionId = computed(() => {
    const i = this.activeIndex();
    return this.isOpen() && i >= 0 ? this.optionId(i) : null;
  });

  protected optionId(index: number): string {
    return `${this.inputId()}-option-${index}`;
  }

  protected onType(event: Event): void {
    const typed = (event.target as HTMLInputElement).value;
    this.term.set(typed);
    this.chosen.set(undefined);
    this.value.set('');
    this.activeIndex.set(-1);
  }

  protected onFocus(): void {
    this.focused.set(true);
  }

  protected onBlur(): void {
    // mousedown na opção dispara antes do blur, então a escolha já aconteceu aqui.
    this.focused.set(false);
    this.activeIndex.set(-1);
  }

  protected choose(airport: Airport, event?: Event): void {
    event?.preventDefault(); // impede o blur que fecharia a lista antes do clique
    this.chosen.set(airport);
    this.value.set(airport.iata_code);
    this.term.set('');
    this.activeIndex.set(-1);
    this.focused.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const total = this.options().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        if (!this.isOpen() || total === 0) return;
        this.activeIndex.update((i) => (i + 1) % total);
        break;

      case 'ArrowUp':
        event.preventDefault();
        if (!this.isOpen() || total === 0) return;
        this.activeIndex.update((i) => (i <= 0 ? total - 1 : i - 1));
        break;

      case 'Enter': {
        const i = this.activeIndex();
        if (this.isOpen() && i >= 0) {
          event.preventDefault(); // não submete o formulário ao escolher
          this.choose(this.options()[i]);
        }
        break;
      }

      case 'Escape':
        if (this.isOpen()) {
          event.preventDefault();
          this.focused.set(false);
          this.activeIndex.set(-1);
          this.inputEl().nativeElement.focus(); // foco volta ao campo, nunca se perde
        }
        break;

      case 'Home':
        if (this.isOpen() && total > 0) {
          event.preventDefault();
          this.activeIndex.set(0);
        }
        break;

      case 'End':
        if (this.isOpen() && total > 0) {
          event.preventDefault();
          this.activeIndex.set(total - 1);
        }
        break;
    }
  }
}
