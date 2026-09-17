import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  model,
  signal,
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
        [attr.aria-describedby]="describedBy()"
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
            <!-- role="presentation": "nenhum resultado" não é uma opção
                 escolhível. Como role="option" o leitor de tela anunciaria
                 "opção 1 de 1" e ofereceria para seleção algo que não existe. -->
            <li role="presentation" class="empty">Nenhum aeroporto encontrado.</li>
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

  /**
   * Id da mensagem de erro que descreve este campo, quando houver.
   *
   * Sem isso, marcar o campo como `aria-invalid` anuncia "inválido" e mais nada:
   * quem usa leitor de tela ouve que errou, mas não o quê.
   */
  readonly errorId = input<string | null>(null);

  /** Código IATA escolhido. Vazio enquanto o usuário não escolher uma opção. */
  readonly value = model<string>('');

  private readonly api = inject(FlightSearchService);

  /** O que está digitado. Só vira `value` quando uma opção é de fato escolhida. */
  private readonly term = signal('');
  private readonly chosen = signal<Airport | undefined>(undefined);

  /**
   * "Popup aberto" é estado próprio, separado de "input tem foco".
   *
   * Derivar a abertura do foco parece natural e está errado: escolher uma opção
   * e apertar Esc fecham a lista sem que o input perca o foco de verdade, então
   * um `focused` compartilhado ficaria preso em false e a lista nunca reabriria
   * quando o usuário voltasse a digitar.
   */
  private readonly open = signal(false);

  protected readonly activeIndex = signal(-1);

  private readonly airports = this.api.airportResource(this.term);

  protected readonly options = computed<Airport[]>(() => this.airports.value()?.data ?? []);

  protected readonly isOpen = computed(
    () => this.open() && this.term().trim().length >= 2 && !this.chosen(),
  );

  protected readonly displayValue = computed(() => {
    const picked = this.chosen();
    return picked ? `${picked.city} (${picked.iata_code})` : this.term();
  });

  protected readonly listboxId = computed(() => `${this.inputId()}-listbox`);
  protected readonly hintId = computed(() => `${this.inputId()}-hint`);

  /**
   * A dica sempre descreve o campo; o erro entra na frente quando existe, porque
   * é a informação mais urgente para quem acabou de tentar enviar o formulário.
   */
  protected readonly describedBy = computed(() =>
    [this.errorId(), this.hintId()].filter(Boolean).join(' '),
  );

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

    // Digitar sempre reabre: é o gesto de quem quer trocar o aeroporto já escolhido.
    this.open.set(true);
  }

  protected onFocus(): void {
    this.open.set(true);
  }

  protected onBlur(): void {
    // mousedown na opção dispara antes do blur, então a escolha já aconteceu aqui.
    this.open.set(false);
    this.activeIndex.set(-1);

    // Texto digitado sem escolher opção não pode ficar na tela: o campo mostraria
    // "GRU" enquanto o valor está vazio, e o usuário leria "escolha a origem" sem
    // entender o motivo. Limpar mantém uma só fonte de verdade.
    if (!this.chosen()) {
      this.term.set('');
    }
  }

  protected choose(airport: Airport, event?: Event): void {
    event?.preventDefault(); // impede o blur que fecharia a lista antes do clique
    this.chosen.set(airport);
    this.value.set(airport.iata_code);
    this.term.set('');
    this.activeIndex.set(-1);
    this.open.set(false);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const total = this.options().length;

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();

        // Com a lista fechada, ↓ abre — é o que o padrão ARIA APG exige, e sem
        // isso quem apertou Esc fica sem forma de reabrir usando só o teclado.
        if (!this.isOpen()) {
          this.open.set(true);
          this.activeIndex.set(0);
          return;
        }

        if (total === 0) return;
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
          this.open.set(false);
          this.activeIndex.set(-1);
          // O foco nunca saiu do input — fechar a lista não o move. Digitar de
          // novo, ou ↓, reabre.
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
