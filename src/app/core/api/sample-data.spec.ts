import { describe, expect, it } from 'vitest';

import { formatLocalTime } from './format';
import type { FlightSearchCriteria } from './models';
import { buildSampleOffers, searchSampleAirports } from './sample-data';

const criteria = (over: Partial<FlightSearchCriteria> = {}): FlightSearchCriteria => ({
  origin: 'GRU',
  destination: 'REC',
  departure_date: '2026-10-15',
  return_date: null,
  adults: 1,
  children: 0,
  cabin: 'economy',
  currency: 'BRL',
  ...over,
});

describe('searchSampleAirports', () => {
  it('ignora acentos na busca', () => {
    const found = searchSampleAirports('brasilia');
    expect(found.map((a) => a.iata_code)).toContain('BSB');
  });

  it('coloca o código IATA exato em primeiro', () => {
    // "GRU" também casa com outros aeroportos de São Paulo pelo nome da cidade;
    // quem digitou o código quer aquele aeroporto, não a lista toda.
    expect(searchSampleAirports('gru')[0].iata_code).toBe('GRU');
  });

  it('não busca com menos de dois caracteres', () => {
    expect(searchSampleAirports('g')).toEqual([]);
  });
});

describe('buildSampleOffers', () => {
  it('é determinístico: a mesma busca devolve os mesmos preços', () => {
    const a = buildSampleOffers(criteria());
    const b = buildSampleOffers(criteria());

    expect(a.data.map((o) => o.price)).toEqual(b.data.map((o) => o.price));
  });

  /**
   * Regressão do bug mais escorregadio do gerador.
   *
   * `toISOString().replace('Z', '-03:00')` rotulava a hora UTC com o fuso errado,
   * somando 3 horas: um voo das 21h aparecia chegando na madrugada do dia
   * seguinte. Como a tela lê a string literalmente — e faz certo —, o erro só
   * aparecia como um horário impossível no card.
   */
  it('não desloca o horário de partida ao formatar o fuso', () => {
    const offers = buildSampleOffers(criteria());

    for (const offer of offers.data) {
      const first = offer.itineraries[0].segments[0];

      // A data de partida do primeiro segmento é a data buscada, não a seguinte.
      expect(first.departure_at.slice(0, 10)).toBe('2026-10-15');

      // E a hora exibida é a hora da string, entre 05:00 e 22:00 pela geração.
      const hour = Number(formatLocalTime(first.departure_at).slice(0, 2));
      expect(hour).toBeGreaterThanOrEqual(5);
      expect(hour).toBeLessThanOrEqual(22);
    }
  });

  /**
   * A duração no meio do card precisa bater com a diferença entre as pontas.
   * Antes, ela declarava só o tempo de voo e ignorava a espera em conexão, então
   * um itinerário mostrava "5h" entre 08:05 e 14:55.
   */
  it('declara duração coerente com partida e chegada, inclusive com conexões', () => {
    const offers = buildSampleOffers(criteria());

    for (const offer of offers.data) {
      for (const leg of offer.itineraries) {
        const first = leg.segments[0];
        const last = leg.segments[leg.segments.length - 1];

        const real = (Date.parse(last.arrival_at) - Date.parse(first.departure_at)) / 60_000;

        expect(leg.duration_minutes).toBe(Math.round(real));
      }
    }
  });

  it('encadeia os segmentos: cada um parte de onde o anterior chegou', () => {
    const withStops = buildSampleOffers(criteria()).data.find(
      (o) => o.itineraries[0].segments.length > 1,
    );

    expect(withStops).toBeDefined();

    const segments = withStops!.itineraries[0].segments;
    for (let i = 1; i < segments.length; i++) {
      expect(segments[i].origin).toBe(segments[i - 1].destination);
      expect(Date.parse(segments[i].departure_at)).toBeGreaterThan(
        Date.parse(segments[i - 1].arrival_at),
      );
    }
  });

  it('devolve dois itinerários em ida e volta, e um em somente ida', () => {
    expect(buildSampleOffers(criteria()).data[0].itineraries).toHaveLength(1);
    expect(
      buildSampleOffers(criteria({ return_date: '2026-10-22' })).data[0].itineraries,
    ).toHaveLength(2);
  });

  it('ordena por preço crescente', () => {
    const prices = buildSampleOffers(criteria()).data.map((o) => o.price);
    expect([...prices].sort((a, b) => a - b)).toEqual(prices);
  });
});
