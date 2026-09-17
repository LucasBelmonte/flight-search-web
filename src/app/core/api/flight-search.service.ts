import { httpResource } from '@angular/common/http';
import { computed, inject, Injectable, Signal, signal } from '@angular/core';

import { API_CONFIG } from './api.config';
import type { Airport, FlightSearchCriteria, FlightSearchResponse } from './models';
import { buildSampleOffers, searchSampleAirports } from './sample-data';

/**
 * A parte de um recurso que os componentes de fato consomem.
 *
 * Declarar isto não é burocracia: é o que garante, em tempo de compilação, que o
 * modo de dados de exemplo e o modo real sejam intercambiáveis. Se um dos dois
 * deixar de oferecer `reload`, por exemplo, o erro aparece aqui e não na tela.
 */
export interface ReadonlyResource<T> {
  readonly value: Signal<T | undefined>;
  readonly isLoading: Signal<boolean>;
  readonly error: Signal<unknown>;
  reload(): boolean;
}

/**
 * Acesso à API de busca de voos.
 *
 * A API decide sozinha de qual provider externo os dados vieram (Skyscanner,
 * Duffel ou o gerador interno) e faz failover quando um deles estoura o rate
 * limit. A SPA nunca escolhe provider — só lê `meta.provider` para exibir a
 * origem do dado quando isso for relevante.
 */
@Injectable({ providedIn: 'root' })
export class FlightSearchService {
  private readonly config = inject(API_CONFIG);

  readonly usingSampleData = this.config.useSampleData;

  /**
   * Recurso de busca. Enquanto `criteria()` for `undefined` nenhuma requisição
   * sai — é assim que a tela evita buscar antes do usuário preencher o formulário.
   */
  searchResource(
    criteria: Signal<FlightSearchCriteria | undefined>,
  ): ReadonlyResource<FlightSearchResponse> {
    if (this.config.useSampleData) {
      return this.sampleSearchResource(criteria);
    }

    return httpResource<FlightSearchResponse>(() => {
      const c = criteria();
      if (!c) return undefined;

      return {
        url: `${this.config.baseUrl}/api/v1/flights/search`,
        method: 'POST',
        body: c,
        withCredentials: true, // sessão Sanctum via cookie httpOnly
      };
    });
  }

  /**
   * Autocomplete de aeroporto.
   *
   * A busca é feita na tabela local da API, não em provider externo, então pode
   * ser chamada a cada tecla sem consumir quota paga.
   */
  airportResource(term: Signal<string>): ReadonlyResource<{ data: Airport[] }> {
    if (this.config.useSampleData) {
      return this.sampleAirportResource(term);
    }

    return httpResource<{ data: Airport[] }>(() => {
      const q = term().trim();
      if (q.length < 2) return undefined;

      return {
        url: `${this.config.baseUrl}/api/v1/airports`,
        params: { q, limit: 10 },
      };
    });
  }

  // -----------------------------------------------------------------------
  // Modo de dados de exemplo
  //
  // Reproduz a mesma superfície do httpResource (value/isLoading/error/reload)
  // para que os componentes não precisem saber em qual modo estão rodando.
  // -----------------------------------------------------------------------

  private sampleSearchResource(
    criteria: Signal<FlightSearchCriteria | undefined>,
  ): ReadonlyResource<FlightSearchResponse> {
    const value = computed<FlightSearchResponse | undefined>(() => {
      const c = criteria();
      return c ? buildSampleOffers(c) : undefined;
    });

    return {
      value,
      isLoading: signal(false).asReadonly(),
      error: signal(undefined).asReadonly(),
      reload: (): boolean => true,
    };
  }

  private sampleAirportResource(term: Signal<string>): ReadonlyResource<{ data: Airport[] }> {
    const value = computed<{ data: Airport[] } | undefined>(() => {
      const q = term().trim();
      return q.length < 2 ? undefined : { data: searchSampleAirports(q) };
    });

    return {
      value,
      isLoading: signal(false).asReadonly(),
      error: signal(undefined).asReadonly(),
      reload: (): boolean => true,
    };
  }
}
