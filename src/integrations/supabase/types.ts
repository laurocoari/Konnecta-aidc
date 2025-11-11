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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      clients: {
        Row: {
          cep: string
          cidade: string
          cnpj: string
          contato_principal: string
          created_at: string
          email: string
          endereco: string
          estado: string
          exclusive_partner_id: string | null
          exclusivity_expires_at: string | null
          exclusivity_status:
            | Database["public"]["Enums"]["exclusivity_status"]
            | null
          id: string
          ie: string | null
          nome: string
          observacoes: string | null
          origin_partner_id: string | null
          telefone: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cep: string
          cidade: string
          cnpj: string
          contato_principal: string
          created_at?: string
          email: string
          endereco: string
          estado: string
          exclusive_partner_id?: string | null
          exclusivity_expires_at?: string | null
          exclusivity_status?:
            | Database["public"]["Enums"]["exclusivity_status"]
            | null
          id?: string
          ie?: string | null
          nome: string
          observacoes?: string | null
          origin_partner_id?: string | null
          telefone: string
          tipo?: string
          updated_at?: string
        }
        Update: {
          cep?: string
          cidade?: string
          cnpj?: string
          contato_principal?: string
          created_at?: string
          email?: string
          endereco?: string
          estado?: string
          exclusive_partner_id?: string | null
          exclusivity_expires_at?: string | null
          exclusivity_status?:
            | Database["public"]["Enums"]["exclusivity_status"]
            | null
          id?: string
          ie?: string | null
          nome?: string
          observacoes?: string | null
          origin_partner_id?: string | null
          telefone?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "clients_exclusive_partner_id_fkey"
            columns: ["exclusive_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_origin_partner_id_fkey"
            columns: ["origin_partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      opportunities: {
        Row: {
          anexos: Json | null
          approved_at: string | null
          approved_by: string | null
          client_id: string
          created_at: string
          data_registro: string
          data_validade_exclusividade: string | null
          feedback_comercial: string | null
          id: string
          is_exclusive: boolean
          observacoes: string | null
          partner_id: string
          product_name: string
          status: Database["public"]["Enums"]["opportunity_status"]
          tipo_oportunidade: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          anexos?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          client_id: string
          created_at?: string
          data_registro?: string
          data_validade_exclusividade?: string | null
          feedback_comercial?: string | null
          id?: string
          is_exclusive?: boolean
          observacoes?: string | null
          partner_id: string
          product_name: string
          status?: Database["public"]["Enums"]["opportunity_status"]
          tipo_oportunidade: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          anexos?: Json | null
          approved_at?: string | null
          approved_by?: string | null
          client_id?: string
          created_at?: string
          data_registro?: string
          data_validade_exclusividade?: string | null
          feedback_comercial?: string | null
          id?: string
          is_exclusive?: boolean
          observacoes?: string | null
          partner_id?: string
          product_name?: string
          status?: Database["public"]["Enums"]["opportunity_status"]
          tipo_oportunidade?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opportunities_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partner_proposals: {
        Row: {
          client_id: string
          created_at: string
          id: string
          observacoes: string | null
          opportunity_id: string
          partner_id: string
          pdf_url: string | null
          products: Json
          status: string
          updated_at: string
        }
        Insert: {
          client_id: string
          created_at?: string
          id?: string
          observacoes?: string | null
          opportunity_id: string
          partner_id: string
          pdf_url?: string | null
          products?: Json
          status?: string
          updated_at?: string
        }
        Update: {
          client_id?: string
          created_at?: string
          id?: string
          observacoes?: string | null
          opportunity_id?: string
          partner_id?: string
          pdf_url?: string | null
          products?: Json
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "partner_proposals_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_proposals_opportunity_id_fkey"
            columns: ["opportunity_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "partner_proposals_partner_id_fkey"
            columns: ["partner_id"]
            isOneToOne: false
            referencedRelation: "partners"
            referencedColumns: ["id"]
          },
        ]
      }
      partners: {
        Row: {
          cidade: string
          cnpj: string
          comissao_percentual: number
          created_at: string
          email: string
          estado: string
          id: string
          nome_fantasia: string
          razao_social: string
          status: string
          telefone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          cidade: string
          cnpj: string
          comissao_percentual?: number
          created_at?: string
          email: string
          estado: string
          id?: string
          nome_fantasia: string
          razao_social: string
          status?: string
          telefone: string
          updated_at?: string
          user_id: string
        }
        Update: {
          cidade?: string
          cnpj?: string
          comissao_percentual?: number
          created_at?: string
          email?: string
          estado?: string
          id?: string
          nome_fantasia?: string
          razao_social?: string
          status?: string
          telefone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      product_movements: {
        Row: {
          created_at: string
          created_by: string | null
          destino: string | null
          id: string
          observacao: string | null
          origem: string | null
          product_id: string
          quantidade: number
          tipo: string
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          destino?: string | null
          id?: string
          observacao?: string | null
          origem?: string | null
          product_id: string
          quantidade: number
          tipo: string
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          destino?: string | null
          id?: string
          observacao?: string | null
          origem?: string | null
          product_id?: string
          quantidade?: number
          tipo?: string
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          categoria: string
          cfop: string | null
          codigo: string
          cofins: number | null
          created_at: string
          cst: string | null
          custo_medio: number | null
          descricao: string | null
          ean: string | null
          estoque: number | null
          fornecedores_vinculados: Json | null
          galeria: Json | null
          icms: number | null
          id: string
          imagem_principal: string | null
          ipi: number | null
          localizacao: string | null
          margem_lucro: number | null
          ncm: string | null
          nome: string
          observacoes_fiscais: string | null
          origem: string | null
          pis: number | null
          status: string
          tipo: string
          ultima_compra: string | null
          unidade: string | null
          updated_at: string
          valor_locacao: number | null
          valor_venda: number | null
        }
        Insert: {
          categoria: string
          cfop?: string | null
          codigo: string
          cofins?: number | null
          created_at?: string
          cst?: string | null
          custo_medio?: number | null
          descricao?: string | null
          ean?: string | null
          estoque?: number | null
          fornecedores_vinculados?: Json | null
          galeria?: Json | null
          icms?: number | null
          id?: string
          imagem_principal?: string | null
          ipi?: number | null
          localizacao?: string | null
          margem_lucro?: number | null
          ncm?: string | null
          nome: string
          observacoes_fiscais?: string | null
          origem?: string | null
          pis?: number | null
          status?: string
          tipo: string
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
          valor_locacao?: number | null
          valor_venda?: number | null
        }
        Update: {
          categoria?: string
          cfop?: string | null
          codigo?: string
          cofins?: number | null
          created_at?: string
          cst?: string | null
          custo_medio?: number | null
          descricao?: string | null
          ean?: string | null
          estoque?: number | null
          fornecedores_vinculados?: Json | null
          galeria?: Json | null
          icms?: number | null
          id?: string
          imagem_principal?: string | null
          ipi?: number | null
          localizacao?: string | null
          margem_lucro?: number | null
          ncm?: string | null
          nome?: string
          observacoes_fiscais?: string | null
          origem?: string | null
          pis?: number | null
          status?: string
          tipo?: string
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
          valor_locacao?: number | null
          valor_venda?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string
          id: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name: string
          id: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string
          id?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      proposal_items: {
        Row: {
          codigo: string | null
          created_at: string
          desconto: number | null
          descricao: string
          estoque: number | null
          id: string
          imagem_url: string | null
          margem: number | null
          preco_unitario: number
          product_id: string | null
          proposal_id: string
          quantidade: number
          total: number
          unidade: string | null
        }
        Insert: {
          codigo?: string | null
          created_at?: string
          desconto?: number | null
          descricao: string
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          margem?: number | null
          preco_unitario: number
          product_id?: string | null
          proposal_id: string
          quantidade: number
          total: number
          unidade?: string | null
        }
        Update: {
          codigo?: string | null
          created_at?: string
          desconto?: number | null
          descricao?: string
          estoque?: number | null
          id?: string
          imagem_url?: string | null
          margem?: number | null
          preco_unitario?: number
          product_id?: string | null
          proposal_id?: string
          quantidade?: number
          total?: number
          unidade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposal_items_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      proposal_templates: {
        Row: {
          cabecalho_html: string | null
          condicoes_comerciais: string | null
          created_at: string
          created_by: string
          estrutura_tabela: Json | null
          id: string
          logotipo_secundario: string | null
          nome: string
          observacoes_internas: string | null
          rodape_html: string | null
          status: string
          tipo: string
          updated_at: string
        }
        Insert: {
          cabecalho_html?: string | null
          condicoes_comerciais?: string | null
          created_at?: string
          created_by: string
          estrutura_tabela?: Json | null
          id?: string
          logotipo_secundario?: string | null
          nome: string
          observacoes_internas?: string | null
          rodape_html?: string | null
          status?: string
          tipo: string
          updated_at?: string
        }
        Update: {
          cabecalho_html?: string | null
          condicoes_comerciais?: string | null
          created_at?: string
          created_by?: string
          estrutura_tabela?: Json | null
          id?: string
          logotipo_secundario?: string | null
          nome?: string
          observacoes_internas?: string | null
          rodape_html?: string | null
          status?: string
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      proposals: {
        Row: {
          aprovado_em: string | null
          cliente_id: string
          codigo: string
          condicoes_comerciais: Json | null
          created_at: string
          data_proposta: string
          desconto_total: number | null
          despesas_adicionais: number | null
          id: string
          introducao: string | null
          link_publico: string | null
          modelo_id: string | null
          motivo_revisao: string | null
          observacoes_internas: string | null
          oportunidade_id: string | null
          pdf_url: string | null
          status: string
          token_publico: string | null
          total_geral: number
          total_itens: number
          updated_at: string
          validade: string
          vendedor_id: string
          versao: number
        }
        Insert: {
          aprovado_em?: string | null
          cliente_id: string
          codigo: string
          condicoes_comerciais?: Json | null
          created_at?: string
          data_proposta?: string
          desconto_total?: number | null
          despesas_adicionais?: number | null
          id?: string
          introducao?: string | null
          link_publico?: string | null
          modelo_id?: string | null
          motivo_revisao?: string | null
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          status?: string
          token_publico?: string | null
          total_geral?: number
          total_itens?: number
          updated_at?: string
          validade: string
          vendedor_id: string
          versao?: number
        }
        Update: {
          aprovado_em?: string | null
          cliente_id?: string
          codigo?: string
          condicoes_comerciais?: Json | null
          created_at?: string
          data_proposta?: string
          desconto_total?: number | null
          despesas_adicionais?: number | null
          id?: string
          introducao?: string | null
          link_publico?: string | null
          modelo_id?: string | null
          motivo_revisao?: string | null
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          status?: string
          token_publico?: string | null
          total_geral?: number
          total_itens?: number
          updated_at?: string
          validade?: string
          vendedor_id?: string
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "proposals_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "proposal_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "proposals_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          created_at: string | null
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_client_exclusivity: {
        Args: { p_cnpj: string }
        Returns: {
          client_exists: boolean
          client_id: string
          exclusivity_expires_at: string
          is_active: boolean
          partner_id: string
          partner_name: string
        }[]
      }
      check_low_stock: {
        Args: never
        Returns: {
          codigo: string
          estoque_atual: number
          estoque_minimo: number
          nome: string
          product_id: string
          status: string
        }[]
      }
      generate_proposal_token: { Args: never; Returns: string }
      get_user_role: {
        Args: { _user_id: string }
        Returns: Database["public"]["Enums"]["user_role"]
      }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["user_role"]
          _user_id: string
        }
        Returns: boolean
      }
    }
    Enums: {
      exclusivity_status: "ativa" | "expirada" | "suspensa"
      opportunity_status:
        | "em_analise"
        | "aprovada"
        | "em_negociacao"
        | "convertida"
        | "perdida"
        | "devolvida"
      user_role: "admin" | "comercial" | "revendedor" | "financeiro"
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
      exclusivity_status: ["ativa", "expirada", "suspensa"],
      opportunity_status: [
        "em_analise",
        "aprovada",
        "em_negociacao",
        "convertida",
        "perdida",
        "devolvida",
      ],
      user_role: ["admin", "comercial", "revendedor", "financeiro"],
    },
  },
} as const
