import { describe, expect, it } from 'vitest';

import {
  formatDuration,
  formatDurationAccessible,
  formatLocalTime,
  formatStops,
  stopCount,
} from './format';

describe('formatDuration', () => {
  it('mostra horas e minutos', () => {
    expect(formatDuration(225)).toBe('3h 45min');
  });

  it('omite os minutos quando são zero', () => {
    expect(formatDuration(180)).toBe('3h');
  });

  it('omite as horas em voos curtos', () => {
    expect(formatDuration(45)).toBe('45min');
  });
});

describe('formatDurationAccessible', () => {
  it('escreve por extenso para leitura em voz', () => {
    expect(formatDurationAccessible(225)).toBe('3 horas e 45 minutos');
  });

  it('usa o singular quando é uma hora só', () => {
    expect(formatDurationAccessible(61)).toBe('1 hora e 1 minuto');
  });
});

describe('formatLocalTime', () => {
  /**
   * Este é o teste que protege contra o bug mais provável da tela. As datas vêm
   * com o offset do aeroporto de origem, e é essa hora que está no bilhete.
   * Se o código deixasse o Date reinterpretar no fuso do navegador, o horário
   * exibido mudaria conforme quem está olhando.
   */
  it('mostra a hora local do aeroporto, não a do navegador', () => {
    expect(formatLocalTime('2026-10-15T08:15:00-03:00')).toBe('08:15');
    expect(formatLocalTime('2026-10-15T23:50:00+01:00')).toBe('23:50');
  });

  it('devolve vazio quando a data não tem hora', () => {
    expect(formatLocalTime('2026-10-15')).toBe('');
  });
});

describe('contagem de conexões', () => {
  it('trata um segmento como voo direto', () => {
    expect(stopCount(1)).toBe(0);
    expect(formatStops(0)).toBe('Direto');
  });

  it('conta conexões como segmentos menos um', () => {
    expect(stopCount(3)).toBe(2);
    expect(formatStops(1)).toBe('1 conexão');
    expect(formatStops(2)).toBe('2 conexões');
  });
});
