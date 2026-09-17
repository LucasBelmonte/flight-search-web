import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';

import { ThemePreference, ThemeService } from './theme.service';

interface ThemeOption {
  readonly value: ThemePreference;
  readonly label: string;
  readonly icon: string;
}

const OPTIONS: ThemeOption[] = [
  { value: 'light', label: 'Claro', icon: '☀' },
  { value: 'dark', label: 'Escuro', icon: '☾' },
  { value: 'system', label: 'Sistema', icon: '🖵' },
];

/**
 * Seletor de tema com três opções.
 *
 * É um radiogroup, e não um botão que alterna, porque "seguir o sistema" é uma
 * escolha legítima que precisa continuar acessível: com dois estados, quem
 * clica uma vez fica preso a um tema fixo para sempre.
 *
 * Teclado segue o padrão ARIA de radiogroup: Tab entra e sai do grupo inteiro
 * (só a opção ativa fica na ordem de tabulação) e as setas movem entre opções.
 */
@Component({
  selector: 'fs-theme-toggle',
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './theme-toggle.scss',
  template: `
    <div role="radiogroup" aria-label="Tema da interface" class="group">
      @for (option of options; track option.value) {
        <button
          type="button"
          role="radio"
          [attr.aria-checked]="preference() === option.value"
          [attr.tabindex]="preference() === option.value ? 0 : -1"
          [class.selected]="preference() === option.value"
          [title]="titleFor(option)"
          (click)="choose(option.value)"
          (keydown)="onKeydown($event)"
        >
          <span class="icon" aria-hidden="true">{{ option.icon }}</span>
          <span class="label">{{ option.label }}</span>
        </button>
      }
    </div>

    <!-- A mudança de tema é puramente visual, então quem usa leitor de tela não
         percebe que algo aconteceu. Este anúncio é a única confirmação. -->
    <p class="sr-only" role="status" aria-live="polite">{{ announcement() }}</p>
  `,
})
export class ThemeToggle {
  protected readonly options = OPTIONS;

  private readonly theme = inject(ThemeService);

  protected readonly preference = this.theme.preference;

  protected readonly announcement = computed(() => {
    const pref = this.theme.preference();
    const resolved = this.theme.resolved() === 'dark' ? 'escuro' : 'claro';

    return pref === 'system'
      ? `Tema seguindo o sistema: ${resolved}.`
      : `Tema ${resolved} selecionado.`;
  });

  protected titleFor(option: ThemeOption): string {
    return option.value === 'system' ? 'Seguir a preferência do sistema' : `Tema ${option.label}`;
  }

  protected choose(value: ThemePreference): void {
    this.theme.set(value);
  }

  protected onKeydown(event: KeyboardEvent): void {
    const keys = ['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'];
    if (!keys.includes(event.key)) return;

    event.preventDefault();

    const current = OPTIONS.findIndex((o) => o.value === this.preference());
    const forward = event.key === 'ArrowRight' || event.key === 'ArrowDown';
    const next = (current + (forward ? 1 : -1) + OPTIONS.length) % OPTIONS.length;

    this.choose(OPTIONS[next].value);

    // Num radiogroup o foco acompanha a seleção, senão o usuário de teclado
    // perde a referência de onde está.
    const buttons = (event.currentTarget as HTMLElement).parentElement?.querySelectorAll('button');
    (buttons?.[next] as HTMLElement | undefined)?.focus();
  }
}
