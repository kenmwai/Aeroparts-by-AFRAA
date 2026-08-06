export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      account_categories: {
        Row: {
          commission_rate: number | null
          created_at: string
          currency: string
          description: string | null
          id: string
          is_public: boolean
          name: string
          plan_type: Database["public"]["Enums"]["seller_plan"]
          slug: string
          sort_order: number
          subscription_amount: number | null
          updated_at: string
        }
        Insert: {
          commission_rate?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name: string
          plan_type?: Database["public"]["Enums"]["seller_plan"]
          slug: string
          sort_order?: number
          subscription_amount?: number | null
          updated_at?: string
        }
        Update: {
          commission_rate?: number | null
          created_at?: string
          currency?: string
          description?: string | null
          id?: string
          is_public?: boolean
          name?: string
          plan_type?: Database["public"]["Enums"]["seller_plan"]
          slug?: string
          sort_order?: number
          subscription_amount?: number | null
          updated_at?: string
        }
        Relationships: []
      }
      certificates: {
        Row: {
          cert_type: string | null
          created_at: string
          id: string
          issued_at: string | null
          issued_by: string | null
          name: string
          part_id: string
          public_url: string
          storage_path: string
        }
        Insert: {
          cert_type?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          name: string
          part_id: string
          public_url: string
          storage_path: string
        }
        Update: {
          cert_type?: string | null
          created_at?: string
          id?: string
          issued_at?: string | null
          issued_by?: string | null
          name?: string
          part_id?: string
          public_url?: string
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          buyer_id: string
          buyer_snapshot: Json
          commission_amount: number
          commission_rate: number
          currency: string
          id: string
          invoice_number: string
          issued_at: string
          part_snapshot: Json
          rfq_id: string
          sell_price: number
          seller_id: string
          seller_snapshot: Json
          status: string
        }
        Insert: {
          buyer_id: string
          buyer_snapshot: Json
          commission_amount: number
          commission_rate?: number
          currency: string
          id?: string
          invoice_number: string
          issued_at?: string
          part_snapshot: Json
          rfq_id: string
          sell_price: number
          seller_id: string
          seller_snapshot: Json
          status?: string
        }
        Update: {
          buyer_id?: string
          buyer_snapshot?: Json
          commission_amount?: number
          commission_rate?: number
          currency?: string
          id?: string
          invoice_number?: string
          issued_at?: string
          part_snapshot?: Json
          rfq_id?: string
          sell_price?: number
          seller_id?: string
          seller_snapshot?: Json
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_rfq_id_fkey"
            columns: ["rfq_id"]
            isOneToOne: false
            referencedRelation: "quote_requests"
            referencedColumns: ["id"]
          },
        ]
      }
      part_images: {
        Row: {
          created_at: string
          id: string
          part_id: string
          public_url: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          created_at?: string
          id?: string
          part_id: string
          public_url: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          created_at?: string
          id?: string
          part_id?: string
          public_url?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "part_images_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      parts: {
        Row: {
          aircraft_model: string | null
          ata_chapter: string | null
          condition: Database["public"]["Enums"]["part_condition"]
          country_of_origin: string | null
          cover_image_url: string | null
          created_at: string
          currency: string
          description: string | null
          documentation_status: Database["public"]["Enums"]["part_doc_status"]
          eccn: string | null
          id: string
          location: string | null
          manufacturer: string | null
          part_number: string
          price: number | null
          quantity: number
          search_tsv: unknown
          seller_id: string
          serial_number: string | null
          status: Database["public"]["Enums"]["part_status"]
          title: string
          updated_at: string
        }
        Insert: {
          aircraft_model?: string | null
          ata_chapter?: string | null
          condition?: Database["public"]["Enums"]["part_condition"]
          country_of_origin?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documentation_status?: Database["public"]["Enums"]["part_doc_status"]
          eccn?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          part_number: string
          price?: number | null
          quantity?: number
          search_tsv?: unknown
          seller_id: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["part_status"]
          title: string
          updated_at?: string
        }
        Update: {
          aircraft_model?: string | null
          ata_chapter?: string | null
          condition?: Database["public"]["Enums"]["part_condition"]
          country_of_origin?: string | null
          cover_image_url?: string | null
          created_at?: string
          currency?: string
          description?: string | null
          documentation_status?: Database["public"]["Enums"]["part_doc_status"]
          eccn?: string | null
          id?: string
          location?: string | null
          manufacturer?: string | null
          part_number?: string
          price?: number | null
          quantity?: number
          search_tsv?: unknown
          seller_id?: string
          serial_number?: string | null
          status?: Database["public"]["Enums"]["part_status"]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      platform_settings: {
        Row: {
          commission_rate: number
          id: boolean
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          commission_rate?: number
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          commission_rate?: number
          id?: boolean
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          avatar_url: string | null
          city: string | null
          company_name: string | null
          country: string | null
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          postal_code: string | null
          tax_id: string | null
          updated_at: string
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          avatar_url?: string | null
          city?: string | null
          company_name?: string | null
          country?: string | null
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          postal_code?: string | null
          tax_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      quote_requests: {
        Row: {
          buyer_confirmed_at: string | null
          buyer_id: string
          contact_email: string
          contact_phone: string | null
          created_at: string
          final_price: number | null
          id: string
          message: string | null
          part_id: string
          quantity: number
          quote_number: string | null
          quote_snapshot: Json | null
          quoted_price: number | null
          responded_at: string | null
          seller_id: string
          seller_response: string | null
          status: Database["public"]["Enums"]["rfq_status"]
        }
        Insert: {
          buyer_confirmed_at?: string | null
          buyer_id: string
          contact_email: string
          contact_phone?: string | null
          created_at?: string
          final_price?: number | null
          id?: string
          message?: string | null
          part_id: string
          quantity?: number
          quote_number?: string | null
          quote_snapshot?: Json | null
          quoted_price?: number | null
          responded_at?: string | null
          seller_id: string
          seller_response?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
        }
        Update: {
          buyer_confirmed_at?: string | null
          buyer_id?: string
          contact_email?: string
          contact_phone?: string | null
          created_at?: string
          final_price?: number | null
          id?: string
          message?: string | null
          part_id?: string
          quantity?: number
          quote_number?: string | null
          quote_snapshot?: Json | null
          quoted_price?: number | null
          responded_at?: string | null
          seller_id?: string
          seller_response?: string | null
          status?: Database["public"]["Enums"]["rfq_status"]
        }
        Relationships: [
          {
            foreignKeyName: "quote_requests_part_id_fkey"
            columns: ["part_id"]
            isOneToOne: false
            referencedRelation: "parts"
            referencedColumns: ["id"]
          },
        ]
      }
      seller_billing: {
        Row: {
          category_id: string | null
          commission_rate: number | null
          created_at: string
          currency: string
          listing_active: boolean
          notes: string | null
          plan_type: Database["public"]["Enums"]["seller_plan"]
          seller_id: string
          subscription_amount: number | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          category_id?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string
          listing_active?: boolean
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["seller_plan"]
          seller_id: string
          subscription_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          category_id?: string | null
          commission_rate?: number | null
          created_at?: string
          currency?: string
          listing_active?: boolean
          notes?: string | null
          plan_type?: Database["public"]["Enums"]["seller_plan"]
          seller_id?: string
          subscription_amount?: number | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "seller_billing_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "account_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      public_profiles: {
        Row: {
          avatar_url: string | null
          company_name: string | null
          country: string | null
          full_name: string | null
          id: string | null
        }
        Insert: {
          avatar_url?: string | null
          company_name?: string | null
          country?: string | null
          full_name?: string | null
          id?: string | null
        }
        Update: {
          avatar_url?: string | null
          company_name?: string | null
          country?: string | null
          full_name?: string | null
          id?: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      admin_list_accounts: {
        Args: never
        Returns: {
          city: string
          company_name: string
          country: string
          email: string
          full_name: string
          id: string
          is_admin: boolean
        }[]
      }
      admin_set_admin_by_email: {
        Args: { _email: string; _make_admin: boolean }
        Returns: string
      }
      confirm_deal: { Args: { _rfq_id: string }; Returns: string }
      effective_commission_rate: {
        Args: { _seller_id: string }
        Returns: number
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      seller_listing_active: { Args: { _seller_id: string }; Returns: boolean }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      submit_quote: {
        Args: {
          _message: string
          _price: number
          _rfq_id: string
          _valid_days?: number
        }
        Returns: string
      }
    }
    Enums: {
      app_role: "admin" | "moderator" | "user"
      part_condition: "NE" | "NS" | "SV" | "AR" | "OH" | "RP" | "AS-IS"
      part_doc_status: "undocumented" | "documented"
      part_status: "active" | "sold" | "draft" | "archived"
      rfq_status: "pending" | "responded" | "closed" | "declined" | "confirmed"
      seller_plan: "subscription" | "commission"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      app_role: ["admin", "moderator", "user"],
      part_condition: ["NE", "NS", "SV", "AR", "OH", "RP", "AS-IS"],
      part_doc_status: ["undocumented", "documented"],
      part_status: ["active", "sold", "draft", "archived"],
      rfq_status: ["pending", "responded", "closed", "declined", "confirmed"],
      seller_plan: ["subscription", "commission"],
    },
  },
} as const
