import { InjectionToken } from '@angular/core';

export interface ApiConfig {
  /** Base da API. Em dev com Herd: http://flight-search-api.test */
  readonly baseUrl: string;

  /**
   * Serve ofertas de exemplo locais em vez de chamar a API.
   *
   * Existe para que a SPA possa ser desenvolvida e demonstrada antes do backend
   * estar de pé. Quando ligado, a interface mostra um aviso visível — dado de
   * exemplo nunca deve ser confundido com preço real.
   */
  readonly useSampleData: boolean;
}

export const API_CONFIG = new InjectionToken<ApiConfig>('API_CONFIG');

export const apiConfig: ApiConfig = {
  baseUrl: 'http://flight-search-api.test',
  useSampleData: true,
};
