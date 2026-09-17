import { provideZonelessChangeDetection } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { describe, expect, it, beforeEach } from 'vitest';

import { API_CONFIG } from '../../core/api/api.config';
import { AirportCombobox } from './airport-combobox';

/**
 * O combobox é o componente mais delicado da tela em acessibilidade, e a parte
 * mais fácil de quebrar sem perceber é a máquina de estados do popup: fechar a
 * lista sem mover o foco e reabrir ao digitar de novo.
 */
describe('AirportCombobox', () => {
  let fixture: ComponentFixture<AirportCombobox>;
  let input: HTMLInputElement;

  const type = async (value: string): Promise<void> => {
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  };

  const options = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('[role="option"]'));

  const listbox = (): HTMLElement | null => fixture.nativeElement.querySelector('[role="listbox"]');

  const key = async (k: string): Promise<void> => {
    input.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true }));
    await fixture.whenStable();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AirportCombobox],
      providers: [
        provideZonelessChangeDetection(),
        { provide: API_CONFIG, useValue: { baseUrl: '', useSampleData: true } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AirportCombobox);
    fixture.componentRef.setInput('label', 'Origem');
    fixture.componentRef.setInput('inputId', 'origin');
    await fixture.whenStable();

    input = fixture.nativeElement.querySelector('input');
    input.dispatchEvent(new Event('focus'));
    await fixture.whenStable();
  });

  it('só abre a lista a partir de dois caracteres', async () => {
    await type('g');
    expect(listbox()).toBeNull();

    await type('gr');
    expect(listbox()).not.toBeNull();
  });

  it('expõe o estado do popup em aria-expanded', async () => {
    expect(input.getAttribute('aria-expanded')).toBe('false');

    await type('gru');
    expect(input.getAttribute('aria-expanded')).toBe('true');
  });

  /**
   * Regressão: `isOpen` derivava de "input tem foco", e escolher uma opção
   * zerava esse sinal sem que o input perdesse o foco de verdade. O usuário
   * apagava para trocar de aeroporto e a lista nunca mais aparecia.
   */
  it('reabre a lista ao digitar depois de já ter escolhido uma opção', async () => {
    await type('gru');
    options()[0].dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    await fixture.whenStable();

    expect(listbox()).toBeNull();
    expect(fixture.componentInstance.value()).toBe('GRU');

    await type('rec');

    expect(listbox()).not.toBeNull();
    expect(fixture.componentInstance.value()).toBe('');
  });

  it('reabre a lista ao digitar depois de Esc', async () => {
    await type('gru');
    await key('Escape');
    expect(listbox()).toBeNull();

    await type('grua');
    expect(listbox()).not.toBeNull();
  });

  /** O padrão ARIA APG exige que a seta para baixo abra o popup fechado. */
  it('abre a lista com a seta para baixo', async () => {
    await type('gru');
    await key('Escape');
    expect(listbox()).toBeNull();

    await key('ArrowDown');
    expect(listbox()).not.toBeNull();
  });

  it('aponta aria-activedescendant para a opção realçada', async () => {
    await type('sao');
    expect(input.getAttribute('aria-activedescendant')).toBeNull();

    await key('ArrowDown');

    const active = input.getAttribute('aria-activedescendant');
    expect(active).toBe('origin-option-0');
    expect(options()[0].getAttribute('aria-selected')).toBe('true');
  });

  it('dá a volta ao passar do fim da lista', async () => {
    await type('sao');
    const total = options().length;
    expect(total).toBeGreaterThan(1);

    for (let i = 0; i < total; i++) await key('ArrowDown');

    expect(input.getAttribute('aria-activedescendant')).toBe(`origin-option-${total - 1}`);

    await key('ArrowDown');
    expect(input.getAttribute('aria-activedescendant')).toBe('origin-option-0');
  });

  it('escolhe a opção realçada com Enter', async () => {
    await type('gru');
    await key('ArrowDown');
    await key('Enter');

    expect(fixture.componentInstance.value()).toBe('GRU');
    expect(listbox()).toBeNull();
    expect(input.value).toContain('GRU');
  });

  /**
   * Regressão: o texto digitado permanecia na tela com o valor vazio, então o
   * campo mostrava "GRU" enquanto o erro dizia "escolha o aeroporto de origem".
   */
  it('limpa o texto ao sair sem escolher nenhuma opção', async () => {
    await type('gru');
    input.dispatchEvent(new Event('blur'));
    await fixture.whenStable();

    expect(fixture.componentInstance.value()).toBe('');
    expect(input.value).toBe('');
  });

  it('não anuncia o estado vazio como opção selecionável', async () => {
    await type('zzzzz');

    expect(listbox()).not.toBeNull();
    expect(options()).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.empty')?.textContent).toContain(
      'Nenhum aeroporto encontrado',
    );
  });

  it('liga o campo à mensagem de erro quando recebe um id de erro', async () => {
    fixture.componentRef.setInput('errorId', 'error-origin');
    await fixture.whenStable();

    const describedBy = input.getAttribute('aria-describedby') ?? '';

    expect(describedBy).toContain('error-origin');
    expect(describedBy).toContain('origin-hint'); // a dica continua descrevendo o campo
  });
});
