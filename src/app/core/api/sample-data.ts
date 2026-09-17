/**
 * Dados de exemplo para desenvolver a SPA antes do backend existir.
 *
 * Não são preços reais e a interface diz isso ao usuário. Quando a API estiver
 * de pé, basta `useSampleData: false` em api.config.ts — nada mais muda, porque
 * estes objetos obedecem exatamente aos tipos gerados do openapi.yaml.
 */

import type { Airport, FlightOffer, FlightSearchCriteria, FlightSearchResponse } from './models';

export const SAMPLE_AIRPORTS: Airport[] = [
  {
    iata_code: 'GRU',
    name: 'Aeroporto Internacional de São Paulo/Guarulhos',
    city: 'São Paulo',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'CGH',
    name: 'Aeroporto de Congonhas',
    city: 'São Paulo',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'GIG',
    name: 'Aeroporto Internacional do Rio de Janeiro/Galeão',
    city: 'Rio de Janeiro',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'SDU',
    name: 'Aeroporto Santos Dumont',
    city: 'Rio de Janeiro',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'BSB',
    name: 'Aeroporto Internacional de Brasília',
    city: 'Brasília',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'CNF',
    name: 'Aeroporto Internacional de Belo Horizonte/Confins',
    city: 'Belo Horizonte',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'REC',
    name: 'Aeroporto Internacional do Recife/Guararapes',
    city: 'Recife',
    country_code: 'BR',
    timezone: 'America/Recife',
  },
  {
    iata_code: 'SSA',
    name: 'Aeroporto Internacional de Salvador',
    city: 'Salvador',
    country_code: 'BR',
    timezone: 'America/Bahia',
  },
  {
    iata_code: 'FOR',
    name: 'Aeroporto Internacional de Fortaleza',
    city: 'Fortaleza',
    country_code: 'BR',
    timezone: 'America/Fortaleza',
  },
  {
    iata_code: 'POA',
    name: 'Aeroporto Internacional Salgado Filho',
    city: 'Porto Alegre',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'CWB',
    name: 'Aeroporto Internacional Afonso Pena',
    city: 'Curitiba',
    country_code: 'BR',
    timezone: 'America/Sao_Paulo',
  },
  {
    iata_code: 'LIS',
    name: 'Aeroporto Humberto Delgado',
    city: 'Lisboa',
    country_code: 'PT',
    timezone: 'Europe/Lisbon',
  },
  {
    iata_code: 'OPO',
    name: 'Aeroporto Francisco Sá Carneiro',
    city: 'Porto',
    country_code: 'PT',
    timezone: 'Europe/Lisbon',
  },
  {
    iata_code: 'MAD',
    name: 'Aeroporto Adolfo Suárez Madrid-Barajas',
    city: 'Madri',
    country_code: 'ES',
    timezone: 'Europe/Madrid',
  },
  {
    iata_code: 'CDG',
    name: 'Aeroporto Charles de Gaulle',
    city: 'Paris',
    country_code: 'FR',
    timezone: 'Europe/Paris',
  },
  {
    iata_code: 'LHR',
    name: 'Aeroporto de Heathrow',
    city: 'Londres',
    country_code: 'GB',
    timezone: 'Europe/London',
  },
  {
    iata_code: 'JFK',
    name: 'Aeroporto Internacional John F. Kennedy',
    city: 'Nova York',
    country_code: 'US',
    timezone: 'America/New_York',
  },
  {
    iata_code: 'MIA',
    name: 'Aeroporto Internacional de Miami',
    city: 'Miami',
    country_code: 'US',
    timezone: 'America/New_York',
  },
  {
    iata_code: 'EZE',
    name: 'Aeroporto Internacional de Ezeiza',
    city: 'Buenos Aires',
    country_code: 'AR',
    timezone: 'America/Argentina/Buenos_Aires',
  },
  {
    iata_code: 'SCL',
    name: 'Aeroporto Internacional Arturo Merino Benítez',
    city: 'Santiago',
    country_code: 'CL',
    timezone: 'America/Santiago',
  },
];

/**
 * Minúsculas sem acento, para que "brasilia" ache "Brasília".
 *
 * Definida uma vez no módulo de propósito: quando estava repetida inline, mudar
 * a regra num lugar e esquecer o outro fazia o termo digitado deixar de casar
 * com os campos comparados.
 */
function normalize(text: string): string {
  return text.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

export function searchSampleAirports(term: string, limit = 10): Airport[] {
  const q = normalize(term.trim());

  if (q.length < 2) return [];

  return (
    SAMPLE_AIRPORTS.filter(
      (a) =>
        normalize(a.iata_code).includes(q) ||
        normalize(a.city).includes(q) ||
        normalize(a.name).includes(q),
    )
      // Código IATA exato primeiro: quem digita "GRU" quer Guarulhos, não a lista toda de SP.
      .sort((a, b) => {
        const aExact = normalize(a.iata_code) === q ? 0 : 1;
        const bExact = normalize(b.iata_code) === q ? 0 : 1;
        return aExact - bExact;
      })
      .slice(0, limit)
  );
}

/** Fuso fictício dos voos de exemplo: horário de Brasília. */
const OFFSET_LABEL = '-03:00';
const OFFSET_MINUTES = -180;

/** Espera em conexão, em minutos. */
const LAYOVER_MINUTES = 55;

/**
 * Formata um instante como ISO 8601 já no fuso `OFFSET_LABEL`.
 *
 * `toISOString().replace('Z', '-03:00')` parece fazer isso e faz o oposto: pega
 * a hora em UTC e apenas a rotula com outro fuso, adiantando tudo em 3 horas —
 * o suficiente para um voo das 21h aparecer chegando no dia seguinte. É preciso
 * deslocar o instante antes de formatar.
 */
function isoInOffset(epochMs: number): string {
  return new Date(epochMs + OFFSET_MINUTES * 60_000).toISOString().slice(0, 19) + OFFSET_LABEL;
}

const CARRIERS = [
  { code: 'LA', name: 'LATAM Airlines' },
  { code: 'G3', name: 'GOL' },
  { code: 'AD', name: 'Azul' },
  { code: 'TP', name: 'TAP Air Portugal' },
  { code: 'AF', name: 'Air France' },
  { code: 'IB', name: 'Iberia' },
];

/**
 * Gera ofertas determinísticas para os critérios dados.
 *
 * Determinístico de propósito: a mesma busca devolve sempre o mesmo resultado,
 * então dá para conferir a tela sem que os números dancem a cada recarga.
 */
export function buildSampleOffers(criteria: FlightSearchCriteria): FlightSearchResponse {
  const seed = [...`${criteria.origin}${criteria.destination}${criteria.departure_date}`].reduce(
    (acc, ch) => acc + ch.charCodeAt(0),
    0,
  );

  const pseudo = (n: number): number => ((seed * (n + 7)) % 97) / 97;

  const roundTrip = Boolean(criteria.return_date);
  const passengers = criteria.adults + (criteria.children ?? 0);

  const offers: FlightOffer[] = Array.from({ length: 8 }, (_, i) => {
    const carrier = CARRIERS[(seed + i) % CARRIERS.length];
    const stops = i % 3 === 0 ? 0 : i % 3 === 1 ? 1 : 2;
    const basePrice = 480 + pseudo(i) * 2600 + stops * -90 + i * 55;
    const legMinutes = Math.round(95 + pseudo(i + 3) * 540 + stops * 110);

    const depHour = 5 + ((seed + i * 3) % 17);
    const depIso = `${criteria.departure_date}T${String(depHour).padStart(2, '0')}:${
      i % 2 ? '35' : '05'
    }:00${OFFSET_LABEL}`;

    const itineraries = [
      buildLeg(criteria.origin, criteria.destination, depIso, stops, legMinutes, carrier, i),
    ];

    if (roundTrip && criteria.return_date) {
      const retHour = 8 + ((seed + i * 5) % 12);
      const retDep = `${criteria.return_date}T${String(retHour).padStart(2, '0')}:20:00${OFFSET_LABEL}`;

      itineraries.push(
        buildLeg(criteria.destination, criteria.origin, retDep, stops, legMinutes, carrier, i + 1),
      );
    }

    return {
      id: `sample-${criteria.origin}-${criteria.destination}-${i}`,
      price:
        Math.round((basePrice * (roundTrip ? 1.75 : 1) * passengers + Number.EPSILON) * 100) / 100,
      currency: criteria.currency ?? 'BRL',
      seats_remaining: i % 4 === 0 ? 2 : null,
      cabin: criteria.cabin ?? 'economy',
      itineraries,
    };
  }).sort((a, b) => a.price - b.price);

  return {
    data: offers,
    meta: {
      provider: 'fake',
      cached: false,
      total: offers.length,
      currency: criteria.currency ?? 'BRL',
    },
  };
}

/**
 * Monta um trecho completo e deriva a duração dos próprios segmentos.
 *
 * Declarar a duração separadamente, como era antes, produzia cards onde o tempo
 * no meio não batia com a diferença entre as pontas — em voo com conexão a
 * espera no aeroporto ficava de fora da conta.
 */
function buildLeg(
  origin: string,
  destination: string,
  departIso: string,
  stops: number,
  flightMinutes: number,
  carrier: { code: string; name: string },
  salt: number,
): FlightOffer['itineraries'][number] {
  const hubs = ['GRU', 'CNF', 'LIS', 'MAD', 'PTY'].filter((h) => h !== origin && h !== destination);
  const waypoints = [origin, ...hubs.slice(0, stops), destination];
  const legs = waypoints.length - 1;

  const perLeg = Math.floor(flightMinutes / legs);
  const start = Date.parse(departIso);

  const segments = waypoints.slice(0, -1).map((from, idx) => {
    const legStart = start + idx * (perLeg + LAYOVER_MINUTES) * 60_000;
    const legEnd = legStart + perLeg * 60_000;

    return {
      origin: from,
      destination: waypoints[idx + 1],
      departure_at: isoInOffset(legStart),
      arrival_at: isoInOffset(legEnd),
      carrier_code: carrier.code,
      carrier_name: carrier.name,
      flight_number: String(1000 + ((salt * 37 + idx * 11) % 8000)),
      aircraft: idx % 2 ? 'Boeing 737' : 'Airbus A320',
      duration_minutes: perLeg,
    };
  });

  const first = segments[0];
  const last = segments[segments.length - 1];

  return {
    duration_minutes: Math.round(
      (Date.parse(last.arrival_at) - Date.parse(first.departure_at)) / 60_000,
    ),
    segments,
  };
}
