/**
 * Row shapes for the tables in supabase/migrations. Confined to the data layer:
 * components work with the domain types in types/media.ts.
 *
 * This file is generated schema shapes plus deliberate application-level
 * restrictions, not raw generator output. The `search_*` objects come from
 * `supabase gen types typescript --schema public`; the restrictions are:
 *  - `media_type` stays a `"movie" | "tv"` union (the generator emits `string`);
 *  - `Insert`/`Update: never` (or a narrowed `Update`) encode which writes
 *    clients are actually granted. `search_history.Insert` and `.Update` are
 *    `never` on purpose: clients cannot write it, only `record_search` can.
 *
 * Regenerating? Diff-review the output against this file; never replace it
 * wholesale, or those restrictions are silently lost.
 */
export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        // Clients may only change display_name (column-level grant).
        Insert: never;
        Update: { display_name?: string | null };
        Relationships: [];
      };
      watchlist_items: {
        Row: {
          id: string;
          user_id: string;
          tmdb_id: number;
          media_type: "movie" | "tv";
          created_at: string;
        };
        // user_id defaults to the caller in the database, so it is never sent.
        Insert: {
          tmdb_id: number;
          media_type: "movie" | "tv";
        };
        Update: never;
        Relationships: [];
      };
      search_history: {
        Row: {
          query: string;
          scope: string;
          searched_at: string;
          user_id: string;
        };
        // No INSERT/UPDATE grant: rows are written only by record_search.
        Insert: never;
        Update: never;
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      record_search: {
        Args: { p_query: string; p_result_count: number; p_scope: string };
        Returns: undefined;
      };
      trending_searches: {
        Args: { p_limit?: number };
        Returns: {
          query: string;
          search_count: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
