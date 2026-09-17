/**
 * Formatação compartilhada entre as telas.
 *
 * Fica separado dos componentes porque preço e duração aparecem no card de
 * resultado, no detalhe da oferta e na lista de favoritos — três lugares que
 * precisam concordar entre si.
 */

/** "3h 45min" a partir de minutos. Sempre com unidade explícita: leitor de tela lê isso. */
export function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h === 0) return `${m}min`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}min`;
}

/** Versão por extenso, para aria-label — "3 horas e 45 minutos". */
export function formatDurationAccessible(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h} ${h === 1 ? 'hora' : 'horas'}`);
  if (m > 0) parts.push(`${m} ${m === 1 ? 'minuto' : 'minutos'}`);

  return parts.join(' e ') || '0 minutos';
}

export function formatPrice(value: number, currency = 'BRL'): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency,
    minimumFractionDigits: 2,
  }).format(value);
}

/**
 * Hora local do aeroporto — "08:15".
 *
 * As datas do contrato vêm em ISO 8601 com o offset do aeroporto de origem, e é
 * essa hora que o passageiro vê no bilhete. Converter para o fuso do navegador
 * mostraria um horário que não existe em lugar nenhum, então extraímos a hora
 * direto da string em vez de deixar o Date reinterpretar.
 */
export function formatLocalTime(iso: string): string {
  const match = /T(\d{2}):(\d{2})/.exec(iso);
  return match ? `${match[1]}:${match[2]}` : '';
}

/** "qua, 15 out" — data curta para cabeçalho de itinerário. */
export function formatShortDate(iso: string): string {
  const date = iso.slice(0, 10);
  const [y, m, d] = date.split('-').map(Number);

  return new Intl.DateTimeFormat('pt-BR', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(y, m - 1, d)));
}

/** Quantas conexões um itinerário tem. */
export function stopCount(segmentCount: number): number {
  return Math.max(0, segmentCount - 1);
}

export function formatStops(stops: number): string {
  if (stops === 0) return 'Direto';
  return stops === 1 ? '1 conexão' : `${stops} conexões`;
}
