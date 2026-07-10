export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5";
  };
  public: {
    Tables: {
      bills: {
        Row: {
          amount_cents: number;
          created_at: string;
          id: string;
          label: string | null;
          note: string | null;
          period_id: string;
          type: string;
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          id?: string;
          label?: string | null;
          note?: string | null;
          period_id: string;
          type: string;
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          id?: string;
          label?: string | null;
          note?: string | null;
          period_id?: string;
          type?: string;
        };
        Relationships: [
          {
            foreignKeyName: "bills_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
        ];
      };
      events: {
        Row: {
          created_at: string;
          id: string;
          payload: Json;
          type: string | null;
          update_id: number | null;
        };
        Insert: {
          created_at?: string;
          id?: string;
          payload: Json;
          type?: string | null;
          update_id?: number | null;
        };
        Update: {
          created_at?: string;
          id?: string;
          payload?: Json;
          type?: string | null;
          update_id?: number | null;
        };
        Relationships: [];
      };
      members: {
        Row: {
          active: boolean;
          created_at: string;
          id: string;
          is_admin: boolean;
          name: string;
          telegram_user_id: number | null;
        };
        Insert: {
          active?: boolean;
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          name: string;
          telegram_user_id?: number | null;
        };
        Update: {
          active?: boolean;
          created_at?: string;
          id?: string;
          is_admin?: boolean;
          name?: string;
          telegram_user_id?: number | null;
        };
        Relationships: [];
      };
      periods: {
        Row: {
          announce_message_id: number | null;
          announced_at: string | null;
          created_at: string;
          end_date: string;
          id: string;
          label: string;
          start_date: string;
          status: Database["public"]["Enums"]["period_status"];
        };
        Insert: {
          announce_message_id?: number | null;
          announced_at?: string | null;
          created_at?: string;
          end_date: string;
          id?: string;
          label: string;
          start_date: string;
          status?: Database["public"]["Enums"]["period_status"];
        };
        Update: {
          announce_message_id?: number | null;
          announced_at?: string | null;
          created_at?: string;
          end_date?: string;
          id?: string;
          label?: string;
          start_date?: string;
          status?: Database["public"]["Enums"]["period_status"];
        };
        Relationships: [];
      };
      settings: {
        Row: {
          key: string;
          updated_at: string;
          value: Json;
        };
        Insert: {
          key: string;
          updated_at?: string;
          value: Json;
        };
        Update: {
          key?: string;
          updated_at?: string;
          value?: Json;
        };
        Relationships: [];
      };
      shares: {
        Row: {
          amount_cents: number;
          created_at: string;
          id: string;
          member_id: string;
          paid_at: string | null;
          paid_via: Database["public"]["Enums"]["paid_via"] | null;
          period_id: string;
          status: Database["public"]["Enums"]["share_status"];
        };
        Insert: {
          amount_cents: number;
          created_at?: string;
          id?: string;
          member_id: string;
          paid_at?: string | null;
          paid_via?: Database["public"]["Enums"]["paid_via"] | null;
          period_id: string;
          status?: Database["public"]["Enums"]["share_status"];
        };
        Update: {
          amount_cents?: number;
          created_at?: string;
          id?: string;
          member_id?: string;
          paid_at?: string | null;
          paid_via?: Database["public"]["Enums"]["paid_via"] | null;
          period_id?: string;
          status?: Database["public"]["Enums"]["share_status"];
        };
        Relationships: [
          {
            foreignKeyName: "shares_member_id_fkey";
            columns: ["member_id"];
            isOneToOne: false;
            referencedRelation: "members";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shares_period_id_fkey";
            columns: ["period_id"];
            isOneToOne: false;
            referencedRelation: "periods";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      paid_via: "button" | "reply" | "reaction" | "admin";
      period_status: "open" | "announced" | "closed";
      share_status: "pending" | "paid";
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  public: {
    Enums: {
      paid_via: ["button", "reply", "reaction", "admin"],
      period_status: ["open", "announced", "closed"],
      share_status: ["pending", "paid"],
    },
  },
} as const;
