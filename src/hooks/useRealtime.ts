import { useRealtimeNFs } from './useRealtimeNFs';
import { useRealtimeRecebimentos } from './useRealtimeRecebimentos';
import { useRealtimePedidos } from './useRealtimePedidos';

/**
 * Ativa todas as subscriptions Supabase Realtime.
 * Chamar uma única vez (ex: dentro do Layout).
 */
export function useRealtime() {
  useRealtimeNFs();
  useRealtimeRecebimentos();
  useRealtimePedidos();
}
