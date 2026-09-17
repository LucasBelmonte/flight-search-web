import { provideZonelessChangeDetection } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ThemeService } from './theme.service';

/**
 * Controla `prefers-color-scheme` para que os testes possam simular um sistema
 * em tema escuro sem depender de como a máquina que roda a suíte está
 * configurada.
 */
function mockSystemTheme(prefersDark: boolean): { change: (dark: boolean) => void } {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  let matches = prefersDark;

  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('dark') ? matches : false,
    media: query,
    addEventListener: (_: string, fn: (e: MediaQueryListEvent) => void) => listeners.push(fn),
    removeEventListener: () => undefined,
  }));

  return {
    change(dark: boolean) {
      matches = dark;
      listeners.forEach((fn) => fn({ matches: dark } as MediaQueryListEvent));
    },
  };
}

const create = (): ThemeService => {
  TestBed.configureTestingModule({ providers: [provideZonelessChangeDetection()] });
  return TestBed.inject(ThemeService);
};

describe('ThemeService', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.removeAttribute('data-theme');
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('preferência do sistema', () => {
    it('abre em escuro quando o sistema está em escuro', () => {
      mockSystemTheme(true);
      const theme = create();

      expect(theme.preference()).toBe('system');
      expect(theme.resolved()).toBe('dark');
    });

    it('abre em claro quando o sistema está em claro', () => {
      mockSystemTheme(false);
      const theme = create();

      expect(theme.resolved()).toBe('light');
    });

    /**
     * Quem alterna o tema do sistema ao anoitecer espera que o site acompanhe
     * sem precisar recarregar a página.
     */
    it('acompanha a mudança do sistema em tempo real', () => {
      const system = mockSystemTheme(false);
      const theme = create();

      expect(theme.resolved()).toBe('light');

      system.change(true);

      expect(theme.resolved()).toBe('dark');
    });
  });

  describe('escolha do usuário', () => {
    it('sobrepõe a preferência do sistema', () => {
      mockSystemTheme(true);
      const theme = create();

      theme.set('light');

      expect(theme.resolved()).toBe('light');
      expect(document.documentElement.getAttribute('data-theme')).toBe('light');
    });

    it('ignora a mudança do sistema enquanto houver escolha explícita', () => {
      const system = mockSystemTheme(false);
      const theme = create();

      theme.set('light');
      system.change(true);

      expect(theme.resolved()).toBe('light');
    });

    it('volta a seguir o sistema ao escolher "sistema"', () => {
      const system = mockSystemTheme(false);
      const theme = create();

      theme.set('dark');
      expect(theme.resolved()).toBe('dark');

      theme.set('system');
      expect(theme.resolved()).toBe('light');

      system.change(true);
      expect(theme.resolved()).toBe('dark');
    });

    /**
     * O atributo precisa sumir no modo `system`: o CSS usa
     * `:root:not([data-theme='light'])` para deixar a media query decidir, e um
     * atributo remanescente travaria o tema.
     */
    it('remove o atributo data-theme ao voltar para "sistema"', () => {
      mockSystemTheme(true);
      const theme = create();

      theme.set('light');
      expect(document.documentElement.hasAttribute('data-theme')).toBe(true);

      theme.set('system');
      expect(document.documentElement.hasAttribute('data-theme')).toBe(false);
    });
  });

  describe('persistência', () => {
    it('lembra a escolha entre sessões', () => {
      mockSystemTheme(false);
      create().set('dark');

      TestBed.resetTestingModule();
      const reopened = create();

      expect(reopened.preference()).toBe('dark');
      expect(reopened.resolved()).toBe('dark');
    });

    it('não persiste "sistema", para que ele continue seguindo o sistema', () => {
      mockSystemTheme(false);
      const theme = create();

      theme.set('dark');
      theme.set('system');

      expect(localStorage.getItem('fs-theme')).toBeNull();
    });

    it('funciona quando o armazenamento está bloqueado', () => {
      mockSystemTheme(true);
      const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('bloqueado');
      });

      const theme = create();

      // Não lança, e o tema ainda muda nesta sessão.
      expect(() => theme.set('light')).not.toThrow();
      expect(theme.resolved()).toBe('light');

      setItem.mockRestore();
    });
  });

  it('mantém a meta theme-color em acordo com o tema', () => {
    const meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);

    mockSystemTheme(false);
    const theme = create();

    expect(meta.getAttribute('content')).toBe('#FFFFFF');

    theme.set('dark');
    expect(meta.getAttribute('content')).toBe('#0D0D0D');

    meta.remove();
  });
});
