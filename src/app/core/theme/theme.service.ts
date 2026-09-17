import { computed, Injectable, signal } from '@angular/core';

/**
 * Preferência do usuário.
 *
 * `system` é um estado de primeira classe, não a ausência de escolha: quem
 * alterna o tema do sistema ao anoitecer espera que o site acompanhe. Um botão
 * com apenas claro/escuro tira essa possibilidade depois do primeiro clique.
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/** O tema que está de fato pintado na tela. */
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'fs-theme';

/** Cor da barra do navegador em cada tema — precisa casar com --surface. */
const THEME_COLOR: Record<ResolvedTheme, string> = {
  light: '#FFFFFF',
  dark: '#0D0D0D',
};

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly query = matchMediaSafe('(prefers-color-scheme: dark)');

  /** O que o sistema operacional está pedindo, acompanhado em tempo real. */
  private readonly systemPrefersDark = signal(this.query?.matches ?? false);

  readonly preference = signal<ThemePreference>(readStoredPreference());

  /** O tema efetivo: a escolha do usuário, ou a do sistema quando ele não escolheu. */
  readonly resolved = computed<ResolvedTheme>(() => {
    const pref = this.preference();
    if (pref !== 'system') return pref;
    return this.systemPrefersDark() ? 'dark' : 'light';
  });

  constructor() {
    // Se o usuário mudar o tema do sistema com o site aberto e a preferência
    // for `system`, a tela acompanha sem recarregar.
    this.query?.addEventListener('change', (event) => {
      this.systemPrefersDark.set(event.matches);
      this.apply();
    });

    this.apply();
  }

  set(preference: ThemePreference): void {
    this.preference.set(preference);
    this.apply();

    try {
      if (preference === 'system') {
        localStorage.removeItem(STORAGE_KEY);
      } else {
        localStorage.setItem(STORAGE_KEY, preference);
      }
    } catch {
      // Modo privado ou armazenamento bloqueado: o tema ainda funciona nesta
      // sessão, só não é lembrado na próxima. Não é motivo para quebrar a tela.
    }
  }

  /**
   * Escreve o tema no DOM.
   *
   * Chamado direto, e não por `effect()`, de propósito: efeito só roda no
   * próximo ciclo de detecção, e um ciclo de atraso na inicialização é
   * exatamente o tempo de a tela piscar no tema errado.
   */
  private apply(): void {
    const preference = this.preference();
    const resolved = this.resolved();
    const root = document.documentElement;

    // `system` não estampa atributo: assim o seletor
    // `:not([data-theme='light'])` do CSS deixa a media query decidir.
    if (preference === 'system') {
      root.removeAttribute('data-theme');
    } else {
      root.setAttribute('data-theme', preference);
    }

    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute('content', THEME_COLOR[resolved]);
  }
}

function readStoredPreference(): ThemePreference {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  } catch {
    return 'system';
  }
}

/**
 * `matchMedia` não existe em ambiente de teste sem DOM completo, e o serviço é
 * instanciado por qualquer componente que use tema — então a ausência dele não
 * pode derrubar a suíte.
 */
function matchMediaSafe(query: string): MediaQueryList | null {
  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia(query)
    : null;
}
