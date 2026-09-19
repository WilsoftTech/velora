/**
 * Row shapes for the tables in supabase/migrations. Maintained by hand while the
 * schema is this small; regenerate with `supabase gen types typescript` once the
 * CLI is part of the workflow. Confined to the data layer: components work with
 * the domain types in types/media.ts.
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
    };
    Views: { [_ in never]: never };
    Functions: { [_ in never]: never };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};
