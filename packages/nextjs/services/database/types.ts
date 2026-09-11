/**
 * GERADO a partir do schema da Supabase — não edite à mão.
 * Para regenerar, veja services/database/README.md.
 */
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
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
        Relationships: [
          {
            foreignKeyName: "establishment_members_establishment_id_fkey";
            columns: ["establishment_id"];
            isOneToOne: false;
            referencedRelation: "establishments";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "establishment_members_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
          postal_code?: string | null;
          slug?: string;
          state?: string | null;
          status?: Database["public"]["Enums"]["status_estabelecimento"];
          updated_at?: string;
          whatsapp?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "establishments_owner_profile_id_fkey";
            columns: ["owner_profile_id"];
            isOneToOne: false;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
      };
      platform_admins: {
        Row: { created_at: string; profile_id: string };
        Insert: { created_at?: string; profile_id: string };
        Update: { created_at?: string; profile_id?: string };
        Relationships: [
          {
            foreignKeyName: "platform_admins_profile_id_fkey";
            columns: ["profile_id"];
            isOneToOne: true;
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
        ];
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
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      establishments_in_bounds: {
        Args: {
          cats?: number[];
          lim?: number;
          max_lat: number;
          max_lng: number;
          min_lat: number;
          min_lng: number;
        };
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
    };
    CompositeTypes: {
      [_ in never]: never;
    };
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
    },
  },
} as const;
