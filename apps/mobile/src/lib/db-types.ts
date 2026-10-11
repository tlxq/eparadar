import type { Database } from '@/lib/database.types';

export type DbTables = Database['public']['Tables'];

export type DbRow<T extends keyof DbTables> = DbTables[T]['Row'];

type DbFunctions = Database['public']['Functions'];

export type RpcRow<F extends keyof DbFunctions> = DbFunctions[F]['Returns'] extends (infer R)[]
  ? R
  : never;
