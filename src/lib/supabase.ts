import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

// Supabase URL e chave pública – configuradas via variáveis de ambiente Next.js
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL as string;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase environment variables not set (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY)');
}

// Cliente tipado para o banco definido em src/lib/types.ts
export const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

/**
 * Hook simples para obter a sessão atual do Supabase (auth).
 * Uso: const { data: { session } } = await supabase.auth.getSession();
 */
export const getSession = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw error;
  return data.session;
};

/**
 * Hook para obter o usuário autenticado ou null.
 */
export const getUser = async () => {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  return data.user;
};
