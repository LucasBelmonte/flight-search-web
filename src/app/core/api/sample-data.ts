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

export function searchSampleAirports(term: string, limit = 10): Airport[] {
  const q = term.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

  if (q.length < 2) return [];

  const normalize = (s: string): string => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

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
    }:00-03:00`;

    const arrival = new Date(new Date(depIso).getTime() + legMinutes * 60_000);
    const arrIso = arrival.toISOString().replace('Z', '-03:00');

    const outbound = {
      duration_minutes: legMinutes,
      segments: buildSegments(
        criteria.origin,
        criteria.destination,
        depIso,
        arrIso,
        stops,
        carrier,
        legMinutes,
        i,
      ),
    };

    const itineraries = [outbound];

    if (roundTrip && criteria.return_date) {
      const retHour = 8 + ((seed + i * 5) % 12);
      const retDep = `${criteria.return_date}T${String(retHour).padStart(2, '0')}:20:00-03:00`;
      const retArr = new Date(new Date(retDep).getTime() + legMinutes * 60_000)
        .toISOString()
        .replace('Z', '-03:00');

      itineraries.push({
        duration_minutes: legMinutes,
        segments: buildSegments(
          criteria.destination,
          criteria.origin,
          retDep,
          retArr,
          stops,
          carrier,
          legMinutes,
          i + 1,
        ),
      });
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

function buildSegments(
  origin: string,
  destination: string,
  departIso: string,
  arriveIso: string,
  stops: number,
  carrier: { code: string; name: string },
  totalMinutes: number,
  salt: number,
): FlightOffer['itineraries'][number]['segments'] {
  const HUBS = ['GRU', 'CNF', 'LIS', 'MAD', 'PTY'].filter((h) => h !== origin && h !== destination);

  if (stops === 0) {
    return [
      {
        origin,
        destination,
        departure_at: departIso,
        arrival_at: arriveIso,
        carrier_code: carrier.code,
        carrier_name: carrier.name,
        flight_number: String(1000 + ((salt * 37) % 8000)),
        aircraft: 'Airbus A320',
        duration_minutes: totalMinutes,
      },
    ];
  }

  const waypoints = [origin, ...HUBS.slice(0, stops), destination];
  const legMinutes = Math.floor(totalMinutes / (waypoints.length - 1));
  const start = new Date(departIso).getTime();

  return waypoints.slice(0, -1).map((from, idx) => {
    const legStart = new Date(start + idx * (legMinutes + 55) * 60_000);
    const legEnd = new Date(legStart.getTime() + legMinutes * 60_000);

    return {
      origin: from,
      destination: waypoints[idx + 1],
      departure_at: legStart.toISOString().replace('Z', '-03:00'),
      arrival_at: legEnd.toISOString().replace('Z', '-03:00'),
      carrier_code: carrier.code,
      carrier_name: carrier.name,
      flight_number: String(1000 + ((salt * 37 + idx * 11) % 8000)),
      aircraft: idx % 2 ? 'Boeing 737' : 'Airbus A320',
      duration_minutes: legMinutes,
    };
  });
}
