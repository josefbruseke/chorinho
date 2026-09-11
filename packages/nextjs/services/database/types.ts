/**
 * GERADO a partir do schema da Supabase — não edite à mão.
 *
 * Para regenerar: `bun db:types` (exige SUPABASE_ACCESS_TOKEN, criado em
 * Account > Access Tokens no painel). Sem o token, use o MCP da Supabase.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: { PostgrestVersion: "14.5" };
  public: {
    Tables: {
      establishment_members: {
        Row: {
          active: boolean;
          created_at: string;
          establishment_id: string;
          id: string;
          operator_wallet: string | null;
          profile_id: string;
          role: Database["public"]["Enums"]["papel_membro"];
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          establishment_id: string;
          id?: string;
          operator_wallet?: string | null;
          profile_id: string;
          role?: Database["public"]["Enums"]["papel_membro"];
        };
        Update: {
          active?: boolean;
          created_at?: string;
          establishment_id?: string;
          id?: string;
          operator_wallet?: string | null;
          profile_id?: string;
          role?: Database["public"]["Enums"]["papel_membro"];
        };
        Relationships: [];
      };
      establishments: {
        Row: {
          address_line: string | null;
          category: number;
          city: string | null;
          cover_path: string | null;
          created_at: string;
          description: string | null;
          featured: boolean;
          geog: unknown;
          id: string;
          logo_path: string | null;
          metadata_hash: string | null;
          name: string;
          neighborhood: string | null;
          onchain_id: number | null;
          onchain_tx_hash: string | null;
          opening_hours: Json;
          owner_profile_id: string | null;
          phone: string | null;
          pos_limit: number;
          postal_code: string | null;
          slug: string;
          state: string | null;
          status: Database["public"]["Enums"]["status_estabelecimento"];
          updated_at: string;
          whatsapp: string | null;
        };
        Insert: {
          address_line?: string | null;
          category?: number;
          city?: string | null;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          geog?: unknown;
          id?: string;
          logo_path?: string | null;
          metadata_hash?: string | null;
          name: string;
          neighborhood?: string | null;
          onchain_id?: number | null;
          onchain_tx_hash?: string | null;
          opening_hours?: Json;
          owner_profile_id?: string | null;
          phone?: string | null;
          pos_limit?: number;
          postal_code?: string | null;
          slug: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["status_estabelecimento"];
          updated_at?: string;
          whatsapp?: string | null;
        };
        Update: {
          address_line?: string | null;
          category?: number;
          city?: string | null;
          cover_path?: string | null;
          created_at?: string;
          description?: string | null;
          featured?: boolean;
          geog?: unknown;
          id?: string;
          logo_path?: string | null;
          metadata_hash?: string | null;
          name?: string;
          neighborhood?: string | null;
          onchain_id?: number | null;
          onchain_tx_hash?: string | null;
          opening_hours?: Json;
          owner_profile_id?: string | null;
          phone?: string | null;
          pos_limit?: number;
          postal_code?: string | null;
          slug?: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["status_estabelecimento"];
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [];
      };
      pass_nonces: {
        Row: {
          created_at: string;
          expires_at: string;
          nonce: string;
          profile_id: string;
          short_code: string;
          used_at: string | null;
        };
        Insert: {
          created_at?: string;
          expires_at: string;
          nonce?: string;
          profile_id: string;
          short_code: string;
          used_at?: string | null;
        };
        Update: {
          created_at?: string;
          expires_at?: string;
          nonce?: string;
          profile_id?: string;
          short_code?: string;
          used_at?: string | null;
        };
        Relationships: [];
      };
      platform_admins: {
        Row: { created_at: string; profile_id: string };
        Insert: { created_at?: string; profile_id: string };
        Update: { created_at?: string; profile_id?: string };
        Relationships: [];
      };
      pos_terminals: {
        Row: {
          created_at: string;
          created_by: string | null;
          device_label: string | null;
          establishment_id: string;
          id: string;
          last_seen_at: string | null;
          name: string;
          paired_at: string | null;
          pairing_code: string | null;
          pairing_expires_at: string | null;
          revoked_at: string | null;
          token_hash: string | null;
        };
        Insert: {
          created_at?: string;
          created_by?: string | null;
          device_label?: string | null;
          establishment_id: string;
          id?: string;
          last_seen_at?: string | null;
          name: string;
          paired_at?: string | null;
          pairing_code?: string | null;
          pairing_expires_at?: string | null;
          revoked_at?: string | null;
          token_hash?: string | null;
        };
        Update: {
          created_at?: string;
          created_by?: string | null;
          device_label?: string | null;
          establishment_id?: string;
          id?: string;
          last_seen_at?: string | null;
          name?: string;
          paired_at?: string | null;
          pairing_code?: string | null;
          pairing_expires_at?: string | null;
          revoked_at?: string | null;
          token_hash?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          accepted_privacy_version: string | null;
          accepted_terms_version: string | null;
          avatar_path: string | null;
          created_at: string;
          display_name: string | null;
          id: string;
          locale: string;
          updated_at: string;
          wallet_address: string | null;
        };
        Insert: {
          accepted_privacy_version?: string | null;
          accepted_terms_version?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id: string;
          locale?: string;
          updated_at?: string;
          wallet_address?: string | null;
        };
        Update: {
          accepted_privacy_version?: string | null;
          accepted_terms_version?: string | null;
          avatar_path?: string | null;
          created_at?: string;
          display_name?: string | null;
          id?: string;
          locale?: string;
          updated_at?: string;
          wallet_address?: string | null;
        };
        Relationships: [];
      };
      redemptions: {
        Row: {
          claim_ref: string;
          confirmed_at: string | null;
          created_at: string;
          customer_profile_id: string | null;
          customer_wallet: string;
          erro: string | null;
          establishment_id: string;
          id: string;
          operator_profile_id: string | null;
          points_burned: number | null;
          pos_terminal_id: string | null;
          reward_id: string;
          stamps_burned: number | null;
          status: Database["public"]["Enums"]["status_venda"];
          tx_hash: string | null;
        };
        Insert: {
          claim_ref: string;
          confirmed_at?: string | null;
          created_at?: string;
          customer_profile_id?: string | null;
          customer_wallet: string;
          erro?: string | null;
          establishment_id: string;
          id?: string;
          operator_profile_id?: string | null;
          points_burned?: number | null;
          pos_terminal_id?: string | null;
          reward_id: string;
          stamps_burned?: number | null;
          status?: Database["public"]["Enums"]["status_venda"];
          tx_hash?: string | null;
        };
        Update: {
          claim_ref?: string;
          confirmed_at?: string | null;
          created_at?: string;
          customer_profile_id?: string | null;
          customer_wallet?: string;
          erro?: string | null;
          establishment_id?: string;
          id?: string;
          operator_profile_id?: string | null;
          points_burned?: number | null;
          pos_terminal_id?: string | null;
          reward_id?: string;
          stamps_burned?: number | null;
          status?: Database["public"]["Enums"]["status_venda"];
          tx_hash?: string | null;
        };
        Relationships: [];
      };
      rewards: {
        Row: {
          active: boolean;
          created_at: string;
          description: string | null;
          ends_at: string | null;
          establishment_id: string;
          id: string;
          image_path: string | null;
          max_redemptions: number;
          onchain_id: number | null;
          point_cost: number;
          point_type_id: number;
          redeemed: number;
          stamp_cost: number;
          starts_at: string | null;
          title: string;
          updated_at: string;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          establishment_id: string;
          id?: string;
          image_path?: string | null;
          max_redemptions?: number;
          onchain_id?: number | null;
          point_cost?: number;
          point_type_id?: number;
          redeemed?: number;
          stamp_cost?: number;
          starts_at?: string | null;
          title: string;
          updated_at?: string;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          description?: string | null;
          ends_at?: string | null;
          establishment_id?: string;
          id?: string;
          image_path?: string | null;
          max_redemptions?: number;
          onchain_id?: number | null;
          point_cost?: number;
          point_type_id?: number;
          redeemed?: number;
          stamp_cost?: number;
          starts_at?: string | null;
          title?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      sales: {
        Row: {
          amount_cents: number;
          confirmed_at: string | null;
          created_at: string;
          customer_profile_id: string | null;
          customer_wallet: string;
          erro: string | null;
          establishment_id: string;
          id: string;
          operator_profile_id: string | null;
          points_issued: number | null;
          pos_terminal_id: string | null;
          products: Json;
          sale_ref: string;
          stamps_issued: number | null;
          status: Database["public"]["Enums"]["status_venda"];
          tx_hash: string | null;
        };
        Insert: {
          amount_cents: number;
          confirmed_at?: string | null;
          created_at?: string;
          customer_profile_id?: string | null;
          customer_wallet: string;
          erro?: string | null;
          establishment_id: string;
          id?: string;
          operator_profile_id?: string | null;
          points_issued?: number | null;
          pos_terminal_id?: string | null;
          products?: Json;
          sale_ref: string;
          stamps_issued?: number | null;
          status?: Database["public"]["Enums"]["status_venda"];
          tx_hash?: string | null;
        };
        Update: {
          amount_cents?: number;
          confirmed_at?: string | null;
          created_at?: string;
          customer_profile_id?: string | null;
          customer_wallet?: string;
          erro?: string | null;
          establishment_id?: string;
          id?: string;
          operator_profile_id?: string | null;
          points_issued?: number | null;
          pos_terminal_id?: string | null;
          products?: Json;
          sale_ref?: string;
          stamps_issued?: number | null;
          status?: Database["public"]["Enums"]["status_venda"];
          tx_hash?: string | null;
        };
        Relationships: [];
      };
      stamp_balances_cache: {
        Row: {
          balance: number;
          establishment_id: string;
          last_visit_at: string | null;
          lifetime: number;
          streak_best: number;
          streak_current: number;
          updated_at: string;
          wallet: string;
        };
        Insert: {
          balance?: number;
          establishment_id: string;
          last_visit_at?: string | null;
          lifetime?: number;
          streak_best?: number;
          streak_current?: number;
          updated_at?: string;
          wallet: string;
        };
        Update: {
          balance?: number;
          establishment_id?: string;
          last_visit_at?: string | null;
          lifetime?: number;
          streak_best?: number;
          streak_current?: number;
          updated_at?: string;
          wallet?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      establishments_in_bounds: {
        Args: { cats?: number[]; lim?: number; max_lat: number; max_lng: number; min_lat: number; min_lng: number };
        Returns: {
          category: number;
          city: string;
          cover_path: string;
          description: string;
          featured: boolean;
          id: string;
          lat_out: number;
          lng_out: number;
          logo_path: string;
          name: string;
          neighborhood: string;
          slug: string;
        }[];
      };
      nearby_establishments: {
        Args: { cats?: number[]; lat: number; lim?: number; lng: number; radius_m?: number };
        Returns: {
          category: number;
          city: string;
          cover_path: string;
          description: string;
          distance_m: number;
          featured: boolean;
          id: string;
          lat_out: number;
          lng_out: number;
          logo_path: string;
          name: string;
          neighborhood: string;
          slug: string;
        }[];
      };
    };
    Enums: {
      papel_membro: "owner" | "manager" | "operator";
      status_estabelecimento: "rascunho" | "pendente" | "ativo" | "suspenso";
      status_venda: "na_fila" | "enviada" | "confirmada" | "falhou";
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type DefaultSchema = Database["public"];

export type Tables<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Row"];
export type TablesInsert<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Insert"];
export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> = DefaultSchema["Tables"][T]["Update"];
export type Enums<T extends keyof DefaultSchema["Enums"]> = DefaultSchema["Enums"][T];

/** Linha devolvida pelas funções de mapa — o formato que o front consome. */
export type EstabelecimentoNoMapa = DefaultSchema["Functions"]["establishments_in_bounds"]["Returns"][number];

export const Constants = {
  public: {
    Enums: {
      papel_membro: ["owner", "manager", "operator"],
      status_estabelecimento: ["rascunho", "pendente", "ativo", "suspenso"],
      status_venda: ["na_fila", "enviada", "confirmada", "falhou"],
    },
  },
} as const;
