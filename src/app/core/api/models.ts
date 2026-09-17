/**
 * Aliases dos tipos gerados do contrato.
 *
 * `types.ts` é GERADO por `npm run sync:api-types` a partir do openapi.yaml do
 * repo da API. Nunca edite aquele arquivo à mão — a próxima sincronia desfaz a
 * edição e esconde a divergência real entre os dois repositórios.
 *
 * Este arquivo existe só para dar nomes curtos ao que vem de lá. Se um tipo que
 * você precisa não existe aqui nem no gerado, o contrato está incompleto:
 * corrija o openapi.yaml, não crie uma interface paralela.
 */

import type { components, operations } from './types';

type Schemas = components['schemas'];

export type FlightSearchCriteria = Schemas['FlightSearchCriteria'];
export type FlightOffer = Schemas['FlightOffer'];
export type Itinerary = Schemas['Itinerary'];
export type Segment = Schemas['Segment'];
export type SearchMeta = Schemas['SearchMeta'];
export type Airport = Schemas['Airport'];
export type CabinClass = Schemas['CabinClass'];
export type User = Schemas['User'];
export type Favorite = Schemas['Favorite'];
export type RecentSearch = Schemas['RecentSearch'];
export type ApiError = Schemas['Error'];

/**
 * Envelopes de resposta, derivados das operações do contrato.
 *
 * Escrever `{ data, meta }` à mão compilaria igual hoje e deixaria de compilar
 * em silêncio amanhã: se a API acrescentar paginação em /airports, um tipo local
 * não referenciado pela operação continua verde e a divergência só aparece em
 * runtime. Derivar da operação faz o erro surgir no build, que é onde ele serve.
 */
export type FlightSearchResponse =
  operations['searchFlights']['responses'][200]['content']['application/json'];

export type AirportSearchResponse =
  operations['searchAirports']['responses'][200]['content']['application/json'];

/** Códigos de erro que a API pode devolver. Ver openapi.yaml, schema Error. */
export type ApiErrorCode = ApiError['error']['code'];

/** Rótulos de cabine para exibição. */
export const CABIN_LABELS: Record<CabinClass, string> = {
  economy: 'Econômica',
  premium_economy: 'Econômica premium',
  business: 'Executiva',
  first: 'Primeira classe',
};
