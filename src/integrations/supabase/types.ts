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
      accounts_payable: {
        Row: {
          categoria: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          origem: string | null
          referencia_id: string | null
          status: string
          supplier_id: string | null
          updated_at: string
          valor_pago: number | null
          valor_total: number
        }
        Insert: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          referencia_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          valor_pago?: number | null
          valor_total?: number
        }
        Update: {
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          referencia_id?: string | null
          status?: string
          supplier_id?: string | null
          updated_at?: string
          valor_pago?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_payable_payments: {
        Row: {
          account_payable_id: string
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          valor: number
        }
        Insert: {
          account_payable_id: string
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          valor: number
        }
        Update: {
          account_payable_id?: string
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_payable_payments_account_payable_id_fkey"
            columns: ["account_payable_id"]
            isOneToOne: false
            referencedRelation: "accounts_payable"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          observacoes: string | null
          origem: string | null
          referencia_id: string | null
          status: string
          updated_at: string
          valor_pago: number | null
          valor_total: number
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          referencia_id?: string | null
          status?: string
          updated_at?: string
          valor_pago?: number | null
          valor_total?: number
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          origem?: string | null
          referencia_id?: string | null
          status?: string
          updated_at?: string
          valor_pago?: number | null
          valor_total?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
            referencedColumns: ["id"]
          },
        ]
      }
      accounts_receivable_payments: {
        Row: {
          account_receivable_id: string
          bank_account_id: string | null
          created_at: string
          created_by: string | null
          data_pagamento: string
          forma_pagamento: string | null
          id: string
          observacoes: string | null
          valor: number
        }
        Insert: {
          account_receivable_id: string
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          valor: number
        }
        Update: {
          account_receivable_id?: string
          bank_account_id?: string | null
          created_at?: string
          created_by?: string | null
          data_pagamento?: string
          forma_pagamento?: string | null
          id?: string
          observacoes?: string | null
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "accounts_receivable_payments_account_receivable_id_fkey"
            columns: ["account_receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          agencia: string | null
          conta: string | null
          created_at: string
          descricao: string | null
          id: string
          nome_banco: string
          saldo_atual: number | null
          status: string
          tipo: string | null
          updated_at: string
        }
        Insert: {
          agencia?: string | null
          conta?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_banco: string
          saldo_atual?: number | null
          status?: string
          tipo?: string | null
          updated_at?: string
        }
        Update: {
          agencia?: string | null
          conta?: string | null
          created_at?: string
          descricao?: string | null
          id?: string
          nome_banco?: string
          saldo_atual?: number | null
          status?: string
          tipo?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      bank_transactions: {
        Row: {
          bank_account_id: string
          categoria: string | null
          created_at: string
          created_by: string | null
          data_movimento: string
          descricao: string | null
          id: string
          referencia_id: string | null
          referencia_tipo: string | null
          tipo: string
          valor: number
        }
        Insert: {
          bank_account_id: string
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descricao?: string | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo: string
          valor: number
        }
        Update: {
          bank_account_id?: string
          categoria?: string | null
          created_at?: string
          created_by?: string | null
          data_movimento?: string
          descricao?: string | null
          id?: string
          referencia_id?: string | null
          referencia_tipo?: string | null
          tipo?: string
          valor?: number
        }
        Relationships: [
          {
            foreignKeyName: "bank_transactions_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      brands: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          logo_url: string | null
          nome: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          logo_url?: string | null
          nome?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          descricao: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
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
      commission_rules: {
        Row: {
          ativo: boolean | null
          categoria_produto: string | null
          created_at: string
          id: string
          nome: string
          observacoes: string | null
          percentual: number
          tipo_operacao: string | null
          updated_at: string
          vendedor_id: string | null
        }
        Insert: {
          ativo?: boolean | null
          categoria_produto?: string | null
          created_at?: string
          id?: string
          nome: string
          observacoes?: string | null
          percentual?: number
          tipo_operacao?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Update: {
          ativo?: boolean | null
          categoria_produto?: string | null
          created_at?: string
          id?: string
          nome?: string
          observacoes?: string | null
          percentual?: number
          tipo_operacao?: string | null
          updated_at?: string
          vendedor_id?: string | null
        }
        Relationships: []
      }
      commissions: {
        Row: {
          accounts_payable_id: string | null
          created_at: string
          id: string
          observacoes: string | null
          percentual: number | null
          proposta_id: string | null
          sales_order_id: string | null
          status: string
          updated_at: string
          valor_base: number | null
          valor_comissao: number | null
          vendedor_id: string | null
        }
        Insert: {
          accounts_payable_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          proposta_id?: string | null
          sales_order_id?: string | null
          status?: string
          updated_at?: string
          valor_base?: number | null
          valor_comissao?: number | null
          vendedor_id?: string | null
        }
        Update: {
          accounts_payable_id?: string | null
          created_at?: string
          id?: string
          observacoes?: string | null
          percentual?: number | null
          proposta_id?: string | null
          sales_order_id?: string | null
          status?: string
          updated_at?: string
          valor_base?: number | null
          valor_comissao?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "commissions_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      contacts: {
        Row: {
          created_at: string
          email: string | null
          empresa: string | null
          etapa_funil: string
          id: string
          nome: string
          observacoes: string | null
          origem: string | null
          responsavel_id: string | null
          telefone: string | null
          tipo: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          etapa_funil?: string
          id?: string
          nome: string
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string | null
          empresa?: string | null
          etapa_funil?: string
          id?: string
          nome?: string
          observacoes?: string | null
          origem?: string | null
          responsavel_id?: string | null
          telefone?: string | null
          tipo?: string
          updated_at?: string
        }
        Relationships: []
      }
      contract_attachments: {
        Row: {
          contract_id: string
          created_at: string
          descricao: string | null
          id: string
          nome: string
          ordem: number | null
          tipo: string
          url: string
        }
        Insert: {
          contract_id: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome: string
          ordem?: number | null
          tipo: string
          url: string
        }
        Update: {
          contract_id?: string
          created_at?: string
          descricao?: string | null
          id?: string
          nome?: string
          ordem?: number | null
          tipo?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "contract_attachments_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_items: {
        Row: {
          codigo: string | null
          contract_id: string
          created_at: string
          descricao: string
          id: string
          numero_serie: string | null
          observacoes: string | null
          product_id: string | null
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Insert: {
          codigo?: string | null
          contract_id: string
          created_at?: string
          descricao: string
          id?: string
          numero_serie?: string | null
          observacoes?: string | null
          product_id?: string | null
          quantidade: number
          valor_total: number
          valor_unitario: number
        }
        Update: {
          codigo?: string | null
          contract_id?: string
          created_at?: string
          descricao?: string
          id?: string
          numero_serie?: string | null
          observacoes?: string | null
          product_id?: string | null
          quantidade?: number
          valor_total?: number
          valor_unitario?: number
        }
        Relationships: [
          {
            foreignKeyName: "contract_items_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contract_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_signers: {
        Row: {
          assinatura_data: string | null
          assinatura_tipo: string | null
          assinatura_url: string | null
          cargo: string | null
          contract_id: string
          cpf_rg: string | null
          created_at: string
          email: string | null
          id: string
          nome: string
          tipo: Database["public"]["Enums"]["signer_type"]
        }
        Insert: {
          assinatura_data?: string | null
          assinatura_tipo?: string | null
          assinatura_url?: string | null
          cargo?: string | null
          contract_id: string
          cpf_rg?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome: string
          tipo: Database["public"]["Enums"]["signer_type"]
        }
        Update: {
          assinatura_data?: string | null
          assinatura_tipo?: string | null
          assinatura_url?: string | null
          cargo?: string | null
          contract_id?: string
          cpf_rg?: string | null
          created_at?: string
          email?: string | null
          id?: string
          nome?: string
          tipo?: Database["public"]["Enums"]["signer_type"]
        }
        Relationships: [
          {
            foreignKeyName: "contract_signers_contract_id_fkey"
            columns: ["contract_id"]
            isOneToOne: false
            referencedRelation: "contracts"
            referencedColumns: ["id"]
          },
        ]
      }
      contract_templates: {
        Row: {
          cabecalho_html: string | null
          corpo_html: string
          created_at: string
          created_by: string
          id: string
          nome: string
          observacoes_internas: string | null
          rodape_html: string | null
          status: string
          tipo: Database["public"]["Enums"]["contract_type"]
          updated_at: string
          variaveis_disponiveis: Json | null
        }
        Insert: {
          cabecalho_html?: string | null
          corpo_html: string
          created_at?: string
          created_by: string
          id?: string
          nome: string
          observacoes_internas?: string | null
          rodape_html?: string | null
          status?: string
          tipo: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Update: {
          cabecalho_html?: string | null
          corpo_html?: string
          created_at?: string
          created_by?: string
          id?: string
          nome?: string
          observacoes_internas?: string | null
          rodape_html?: string | null
          status?: string
          tipo?: Database["public"]["Enums"]["contract_type"]
          updated_at?: string
          variaveis_disponiveis?: Json | null
        }
        Relationships: []
      }
      contracts: {
        Row: {
          cliente_id: string
          condicoes_comerciais: Json | null
          created_at: string
          created_by: string
          data_fim: string | null
          data_inicio: string
          id: string
          link_publico: string | null
          modelo_id: string | null
          motivo_revisao: string | null
          numero: string
          observacoes: string | null
          oportunidade_id: string | null
          pdf_url: string | null
          proposta_id: string | null
          status: Database["public"]["Enums"]["contract_status"]
          tipo: Database["public"]["Enums"]["contract_type"]
          token_publico: string | null
          updated_at: string
          valor_mensal: number | null
          valor_total: number
          versao: number
        }
        Insert: {
          cliente_id: string
          condicoes_comerciais?: Json | null
          created_at?: string
          created_by: string
          data_fim?: string | null
          data_inicio: string
          id?: string
          link_publico?: string | null
          modelo_id?: string | null
          motivo_revisao?: string | null
          numero: string
          observacoes?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tipo: Database["public"]["Enums"]["contract_type"]
          token_publico?: string | null
          updated_at?: string
          valor_mensal?: number | null
          valor_total: number
          versao?: number
        }
        Update: {
          cliente_id?: string
          condicoes_comerciais?: Json | null
          created_at?: string
          created_by?: string
          data_fim?: string | null
          data_inicio?: string
          id?: string
          link_publico?: string | null
          modelo_id?: string | null
          motivo_revisao?: string | null
          numero?: string
          observacoes?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          proposta_id?: string | null
          status?: Database["public"]["Enums"]["contract_status"]
          tipo?: Database["public"]["Enums"]["contract_type"]
          token_publico?: string | null
          updated_at?: string
          valor_mensal?: number | null
          valor_total?: number
          versao?: number
        }
        Relationships: [
          {
            foreignKeyName: "contracts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_modelo_id_fkey"
            columns: ["modelo_id"]
            isOneToOne: false
            referencedRelation: "contract_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_oportunidade_id_fkey"
            columns: ["oportunidade_id"]
            isOneToOne: false
            referencedRelation: "opportunities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contracts_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes_compras: {
        Row: {
          cidade_cliente_final: string | null
          cliente_final_id: string | null
          created_at: string
          created_by: string | null
          data_cotacao: string
          distribuidor: string | null
          estado_cliente_final: string | null
          id: string
          moeda: string | null
          nome_cliente_final: string | null
          numero_cotacao: string | null
          observacoes: string | null
          proposta_numero: string | null
          quantidade_itens: number | null
          status: string
          supplier_id: string | null
          tipo_cotacao: string | null
          total_cotacao: number | null
          updated_at: string
          validade: string | null
        }
        Insert: {
          cidade_cliente_final?: string | null
          cliente_final_id?: string | null
          created_at?: string
          created_by?: string | null
          data_cotacao?: string
          distribuidor?: string | null
          estado_cliente_final?: string | null
          id?: string
          moeda?: string | null
          nome_cliente_final?: string | null
          numero_cotacao?: string | null
          observacoes?: string | null
          proposta_numero?: string | null
          quantidade_itens?: number | null
          status?: string
          supplier_id?: string | null
          tipo_cotacao?: string | null
          total_cotacao?: number | null
          updated_at?: string
          validade?: string | null
        }
        Update: {
          cidade_cliente_final?: string | null
          cliente_final_id?: string | null
          created_at?: string
          created_by?: string | null
          data_cotacao?: string
          distribuidor?: string | null
          estado_cliente_final?: string | null
          id?: string
          moeda?: string | null
          nome_cliente_final?: string | null
          numero_cotacao?: string | null
          observacoes?: string | null
          proposta_numero?: string | null
          quantidade_itens?: number | null
          status?: string
          supplier_id?: string | null
          tipo_cotacao?: string | null
          total_cotacao?: number | null
          updated_at?: string
          validade?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_compras_cliente_final_id_fkey"
            columns: ["cliente_final_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_compras_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      cotacoes_compras_itens: {
        Row: {
          codigo_produto: string | null
          cotacao_id: string
          created_at: string
          desconto: number | null
          descricao: string | null
          id: string
          observacoes: string | null
          preco_unitario: number | null
          product_id: string | null
          quantidade: number | null
          total: number | null
        }
        Insert: {
          codigo_produto?: string | null
          cotacao_id: string
          created_at?: string
          desconto?: number | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          preco_unitario?: number | null
          product_id?: string | null
          quantidade?: number | null
          total?: number | null
        }
        Update: {
          codigo_produto?: string | null
          cotacao_id?: string
          created_at?: string
          desconto?: number | null
          descricao?: string | null
          id?: string
          observacoes?: string | null
          preco_unitario?: number | null
          product_id?: string | null
          quantidade?: number | null
          total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "cotacoes_compras_itens_cotacao_id_fkey"
            columns: ["cotacao_id"]
            isOneToOne: false
            referencedRelation: "cotacoes_compras"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cotacoes_compras_itens_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      openai_config: {
        Row: {
          api_key_encrypted: string | null
          created_at: string
          enabled: boolean | null
          id: string
          max_tokens: number | null
          model: string | null
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          api_key_encrypted?: string | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          api_key_encrypted?: string | null
          created_at?: string
          enabled?: boolean | null
          id?: string
          max_tokens?: number | null
          model?: string | null
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
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
      opportunities_crm: {
        Row: {
          contact_id: string | null
          created_at: string
          created_by: string | null
          etapa: string
          id: string
          nome: string
          probabilidade: number | null
          status: string
          updated_at: string
          valor_estimado: number | null
        }
        Insert: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          etapa?: string
          id?: string
          nome: string
          probabilidade?: number | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Update: {
          contact_id?: string | null
          created_at?: string
          created_by?: string | null
          etapa?: string
          id?: string
          nome?: string
          probabilidade?: number | null
          status?: string
          updated_at?: string
          valor_estimado?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "opportunities_crm_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "contacts"
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
      product_supplier_codes: {
        Row: {
          codigo_fornecedor: string
          codigo_principal: boolean | null
          created_at: string
          id: string
          product_id: string
          supplier_id: string
        }
        Insert: {
          codigo_fornecedor: string
          codigo_principal?: boolean | null
          created_at?: string
          id?: string
          product_id: string
          supplier_id: string
        }
        Update: {
          codigo_fornecedor?: string
          codigo_principal?: boolean | null
          created_at?: string
          id?: string
          product_id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_supplier_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_supplier_codes_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          brand_id: string | null
          categoria: string
          cfop: string | null
          codigo: string
          cofins: number | null
          comissao_agenciamento_padrao: number | null
          created_at: string
          cst: string | null
          custo_medio: number | null
          descricao: string | null
          ean: string | null
          especificacoes: Json | null
          estoque_atual: number | null
          estoque_minimo: number | null
          fornecedores_vinculados: Json | null
          galeria: Json | null
          icms: number | null
          id: string
          imagem_principal: string | null
          ipi: number | null
          localizacao: string | null
          margem_lucro: number | null
          margem_lucro_venda: number | null
          ncm: string | null
          nome: string
          observacoes_fiscais: string | null
          origem: string | null
          permite_agenciamento: boolean | null
          pis: number | null
          status: string
          tipo: string
          tipo_disponibilidade:
            | Database["public"]["Enums"]["tipo_disponibilidade"]
            | null
          ultima_compra: string | null
          unidade: string | null
          updated_at: string
          valor_locacao: number | null
          valor_venda: number | null
          vida_util_meses: number | null
          videos: Json | null
        }
        Insert: {
          brand_id?: string | null
          categoria: string
          cfop?: string | null
          codigo: string
          cofins?: number | null
          comissao_agenciamento_padrao?: number | null
          created_at?: string
          cst?: string | null
          custo_medio?: number | null
          descricao?: string | null
          ean?: string | null
          especificacoes?: Json | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedores_vinculados?: Json | null
          galeria?: Json | null
          icms?: number | null
          id?: string
          imagem_principal?: string | null
          ipi?: number | null
          localizacao?: string | null
          margem_lucro?: number | null
          margem_lucro_venda?: number | null
          ncm?: string | null
          nome: string
          observacoes_fiscais?: string | null
          origem?: string | null
          permite_agenciamento?: boolean | null
          pis?: number | null
          status?: string
          tipo: string
          tipo_disponibilidade?:
            | Database["public"]["Enums"]["tipo_disponibilidade"]
            | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
          valor_locacao?: number | null
          valor_venda?: number | null
          vida_util_meses?: number | null
          videos?: Json | null
        }
        Update: {
          brand_id?: string | null
          categoria?: string
          cfop?: string | null
          codigo?: string
          cofins?: number | null
          comissao_agenciamento_padrao?: number | null
          created_at?: string
          cst?: string | null
          custo_medio?: number | null
          descricao?: string | null
          ean?: string | null
          especificacoes?: Json | null
          estoque_atual?: number | null
          estoque_minimo?: number | null
          fornecedores_vinculados?: Json | null
          galeria?: Json | null
          icms?: number | null
          id?: string
          imagem_principal?: string | null
          ipi?: number | null
          localizacao?: string | null
          margem_lucro?: number | null
          margem_lucro_venda?: number | null
          ncm?: string | null
          nome?: string
          observacoes_fiscais?: string | null
          origem?: string | null
          permite_agenciamento?: boolean | null
          pis?: number | null
          status?: string
          tipo?: string
          tipo_disponibilidade?:
            | Database["public"]["Enums"]["tipo_disponibilidade"]
            | null
          ultima_compra?: string | null
          unidade?: string | null
          updated_at?: string
          valor_locacao?: number | null
          valor_venda?: number | null
          vida_util_meses?: number | null
          videos?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "products_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
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
          comissao_percentual: number | null
          created_at: string
          custo_unitario: number | null
          desconto: number | null
          descricao: string
          estoque: number | null
          fornecedor_id: string | null
          id: string
          imagem_url: string | null
          lucro_subtotal: number | null
          margem: number | null
          periodo_locacao_meses: number | null
          preco_unitario: number
          product_id: string | null
          proposal_id: string
          quantidade: number
          total: number
          unidade: string | null
          valor_unitario: number | null
        }
        Insert: {
          codigo?: string | null
          comissao_percentual?: number | null
          created_at?: string
          custo_unitario?: number | null
          desconto?: number | null
          descricao: string
          estoque?: number | null
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          lucro_subtotal?: number | null
          margem?: number | null
          periodo_locacao_meses?: number | null
          preco_unitario: number
          product_id?: string | null
          proposal_id: string
          quantidade: number
          total: number
          unidade?: string | null
          valor_unitario?: number | null
        }
        Update: {
          codigo?: string | null
          comissao_percentual?: number | null
          created_at?: string
          custo_unitario?: number | null
          desconto?: number | null
          descricao?: string
          estoque?: number | null
          fornecedor_id?: string | null
          id?: string
          imagem_url?: string | null
          lucro_subtotal?: number | null
          margem?: number | null
          periodo_locacao_meses?: number | null
          preco_unitario?: number
          product_id?: string | null
          proposal_id?: string
          quantidade?: number
          total?: number
          unidade?: string | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "proposal_items_fornecedor_id_fkey"
            columns: ["fornecedor_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
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
          custo_total: number | null
          data_proposta: string
          desconto_total: number | null
          despesas_adicionais: number | null
          id: string
          introducao: string | null
          link_publico: string | null
          lucro_total: number | null
          margem_percentual_total: number | null
          modelo_id: string | null
          motivo_revisao: string | null
          observacoes_internas: string | null
          oportunidade_id: string | null
          pdf_url: string | null
          status: string
          tipo_operacao: Database["public"]["Enums"]["tipo_operacao"] | null
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
          custo_total?: number | null
          data_proposta?: string
          desconto_total?: number | null
          despesas_adicionais?: number | null
          id?: string
          introducao?: string | null
          link_publico?: string | null
          lucro_total?: number | null
          margem_percentual_total?: number | null
          modelo_id?: string | null
          motivo_revisao?: string | null
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          status?: string
          tipo_operacao?: Database["public"]["Enums"]["tipo_operacao"] | null
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
          custo_total?: number | null
          data_proposta?: string
          desconto_total?: number | null
          despesas_adicionais?: number | null
          id?: string
          introducao?: string | null
          link_publico?: string | null
          lucro_total?: number | null
          margem_percentual_total?: number | null
          modelo_id?: string | null
          motivo_revisao?: string | null
          observacoes_internas?: string | null
          oportunidade_id?: string | null
          pdf_url?: string | null
          status?: string
          tipo_operacao?: Database["public"]["Enums"]["tipo_operacao"] | null
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
      purchase_order_items: {
        Row: {
          codigo_fornecedor: string | null
          created_at: string
          desconto_percentual: number | null
          id: string
          preco_unitario: number
          product_id: string | null
          purchase_order_id: string
          quantidade: number
        }
        Insert: {
          codigo_fornecedor?: string | null
          created_at?: string
          desconto_percentual?: number | null
          id?: string
          preco_unitario?: number
          product_id?: string | null
          purchase_order_id: string
          quantidade?: number
        }
        Update: {
          codigo_fornecedor?: string | null
          created_at?: string
          desconto_percentual?: number | null
          id?: string
          preco_unitario?: number
          product_id?: string | null
          purchase_order_id?: string
          quantidade?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_purchase_order_id_fkey"
            columns: ["purchase_order_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string
          created_by: string | null
          data_emissao: string
          data_entrega_prevista: string | null
          id: string
          observacoes: string | null
          status: string
          supplier_id: string | null
          total_geral: number | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_entrega_prevista?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          supplier_id?: string | null
          total_geral?: number | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          data_emissao?: string
          data_entrega_prevista?: string | null
          id?: string
          observacoes?: string | null
          status?: string
          supplier_id?: string | null
          total_geral?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      quote_settings: {
        Row: {
          created_at: string
          id: string
          margem_padrao: number | null
          observacoes: string | null
          prazo_validade_dias: number | null
          updated_at: string
          updated_by: string | null
          valor_dolar_atual: number | null
        }
        Insert: {
          created_at?: string
          id?: string
          margem_padrao?: number | null
          observacoes?: string | null
          prazo_validade_dias?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_dolar_atual?: number | null
        }
        Update: {
          created_at?: string
          id?: string
          margem_padrao?: number | null
          observacoes?: string | null
          prazo_validade_dias?: number | null
          updated_at?: string
          updated_by?: string | null
          valor_dolar_atual?: number | null
        }
        Relationships: []
      }
      rental_receipt_items: {
        Row: {
          created_at: string
          descricao: string
          id: string
          product_id: string | null
          quantidade: number | null
          rental_receipt_id: string
          valor_total: number | null
          valor_unitario: number | null
        }
        Insert: {
          created_at?: string
          descricao: string
          id?: string
          product_id?: string | null
          quantidade?: number | null
          rental_receipt_id: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Update: {
          created_at?: string
          descricao?: string
          id?: string
          product_id?: string | null
          quantidade?: number | null
          rental_receipt_id?: string
          valor_total?: number | null
          valor_unitario?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_receipt_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_receipt_items_rental_receipt_id_fkey"
            columns: ["rental_receipt_id"]
            isOneToOne: false
            referencedRelation: "rental_receipts"
            referencedColumns: ["id"]
          },
        ]
      }
      rental_receipts: {
        Row: {
          account_receivable_id: string | null
          bank_account_id: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          data_emissao: string | null
          id: string
          numero_recibo: string
          observacoes: string | null
          pdf_url: string | null
          periodo_fim: string | null
          periodo_inicio: string | null
          proposta_id: string | null
          sales_order_id: string | null
          updated_at: string
          valor_total: number | null
        }
        Insert: {
          account_receivable_id?: string | null
          bank_account_id?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          id?: string
          numero_recibo: string
          observacoes?: string | null
          pdf_url?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          proposta_id?: string | null
          sales_order_id?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Update: {
          account_receivable_id?: string | null
          bank_account_id?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          data_emissao?: string | null
          id?: string
          numero_recibo?: string
          observacoes?: string | null
          pdf_url?: string | null
          periodo_fim?: string | null
          periodo_inicio?: string | null
          proposta_id?: string | null
          sales_order_id?: string | null
          updated_at?: string
          valor_total?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "rental_receipts_account_receivable_id_fkey"
            columns: ["account_receivable_id"]
            isOneToOne: false
            referencedRelation: "accounts_receivable"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_receipts_bank_account_id_fkey"
            columns: ["bank_account_id"]
            isOneToOne: false
            referencedRelation: "bank_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_receipts_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "rental_receipts_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      roi_simulations: {
        Row: {
          created_at: string
          created_by: string
          custo_operacional_mensal: number
          duracao_contrato_meses: number
          id: string
          investimento_total: number
          lucro_apos_roi: number
          lucro_mensal_estimado: number
          lucro_total_contrato: number
          nome_simulacao: string | null
          observacoes: string | null
          prazo_roi_meses: number
          proposal_id: string | null
          rentabilidade_percentual: number
          retorno_mensal: number
        }
        Insert: {
          created_at?: string
          created_by: string
          custo_operacional_mensal: number
          duracao_contrato_meses: number
          id?: string
          investimento_total: number
          lucro_apos_roi: number
          lucro_mensal_estimado: number
          lucro_total_contrato: number
          nome_simulacao?: string | null
          observacoes?: string | null
          prazo_roi_meses: number
          proposal_id?: string | null
          rentabilidade_percentual: number
          retorno_mensal: number
        }
        Update: {
          created_at?: string
          created_by?: string
          custo_operacional_mensal?: number
          duracao_contrato_meses?: number
          id?: string
          investimento_total?: number
          lucro_apos_roi?: number
          lucro_mensal_estimado?: number
          lucro_total_contrato?: number
          nome_simulacao?: string | null
          observacoes?: string | null
          prazo_roi_meses?: number
          proposal_id?: string | null
          rentabilidade_percentual?: number
          retorno_mensal?: number
        }
        Relationships: [
          {
            foreignKeyName: "roi_simulations_proposal_id_fkey"
            columns: ["proposal_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_items: {
        Row: {
          created_at: string
          desconto: number | null
          descricao: string
          id: string
          preco_unitario: number
          product_id: string | null
          quantidade: number
          sales_order_id: string
          total: number
        }
        Insert: {
          created_at?: string
          desconto?: number | null
          descricao: string
          id?: string
          preco_unitario?: number
          product_id?: string | null
          quantidade?: number
          sales_order_id: string
          total?: number
        }
        Update: {
          created_at?: string
          desconto?: number | null
          descricao?: string
          id?: string
          preco_unitario?: number
          product_id?: string | null
          quantidade?: number
          sales_order_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_order_items_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_order_logs: {
        Row: {
          created_at: string
          created_by: string | null
          dados_anteriores: Json | null
          dados_novos: Json | null
          descricao: string | null
          id: string
          sales_order_id: string
          tipo: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          id?: string
          sales_order_id: string
          tipo: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          dados_anteriores?: Json | null
          dados_novos?: Json | null
          descricao?: string | null
          id?: string
          sales_order_id?: string
          tipo?: string
        }
        Relationships: [
          {
            foreignKeyName: "sales_order_logs_sales_order_id_fkey"
            columns: ["sales_order_id"]
            isOneToOne: false
            referencedRelation: "sales_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      sales_orders: {
        Row: {
          cliente_id: string | null
          condicoes_pagamento: string | null
          created_at: string
          created_by: string | null
          data_entrega: string | null
          data_pedido: string | null
          desconto_total: number | null
          forma_pagamento: string | null
          id: string
          numero_pedido: string
          observacoes: string | null
          proposta_id: string | null
          status: string
          total_geral: number | null
          updated_at: string
          valor_total: number | null
          vendedor_id: string | null
        }
        Insert: {
          cliente_id?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          desconto_total?: number | null
          forma_pagamento?: string | null
          id?: string
          numero_pedido: string
          observacoes?: string | null
          proposta_id?: string | null
          status?: string
          total_geral?: number | null
          updated_at?: string
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Update: {
          cliente_id?: string | null
          condicoes_pagamento?: string | null
          created_at?: string
          created_by?: string | null
          data_entrega?: string | null
          data_pedido?: string | null
          desconto_total?: number | null
          forma_pagamento?: string | null
          id?: string
          numero_pedido?: string
          observacoes?: string | null
          proposta_id?: string | null
          status?: string
          total_geral?: number | null
          updated_at?: string
          valor_total?: number | null
          vendedor_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "sales_orders_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sales_orders_proposta_id_fkey"
            columns: ["proposta_id"]
            isOneToOne: false
            referencedRelation: "proposals"
            referencedColumns: ["id"]
          },
        ]
      }
      supplier_brands: {
        Row: {
          brand_id: string
          created_at: string
          id: string
          supplier_id: string
        }
        Insert: {
          brand_id: string
          created_at?: string
          id?: string
          supplier_id: string
        }
        Update: {
          brand_id?: string
          created_at?: string
          id?: string
          supplier_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "fk_supplier_brands_brand"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_supplier_brands_supplier"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_brands_brand_id_fkey"
            columns: ["brand_id"]
            isOneToOne: false
            referencedRelation: "brands"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          categoria: string | null
          cep: string | null
          cidade: string | null
          cnpj: string
          contato_principal: string | null
          created_at: string
          email: string | null
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          status: string
          telefone: string | null
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj: string
          contato_principal?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          cep?: string | null
          cidade?: string | null
          cnpj?: string
          contato_principal?: string | null
          created_at?: string
          email?: string | null
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          status?: string
          telefone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      tasks: {
        Row: {
          categoria: string | null
          concluido_em: string | null
          created_at: string
          created_by: string | null
          data_vencimento: string | null
          descricao: string | null
          id: string
          prioridade: string | null
          referencia_id: string | null
          referencia_tipo: string | null
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          concluido_em?: string | null
          created_at?: string
          created_by?: string | null
          data_vencimento?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string | null
          referencia_id?: string | null
          referencia_tipo?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: []
      }
      ticket_comments: {
        Row: {
          conteudo: string
          created_at: string
          created_by: string | null
          id: string
          ticket_id: string
        }
        Insert: {
          conteudo: string
          created_at?: string
          created_by?: string | null
          id?: string
          ticket_id: string
        }
        Update: {
          conteudo?: string
          created_at?: string
          created_by?: string | null
          id?: string
          ticket_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ticket_comments_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      tickets: {
        Row: {
          categoria: string | null
          cliente_id: string | null
          created_at: string
          created_by: string | null
          descricao: string | null
          id: string
          prioridade: string | null
          resolvido_em: string | null
          responsavel_id: string | null
          status: string
          titulo: string
          updated_at: string
        }
        Insert: {
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string | null
          resolvido_em?: string | null
          responsavel_id?: string | null
          status?: string
          titulo: string
          updated_at?: string
        }
        Update: {
          categoria?: string | null
          cliente_id?: string | null
          created_at?: string
          created_by?: string | null
          descricao?: string | null
          id?: string
          prioridade?: string | null
          resolvido_em?: string | null
          responsavel_id?: string | null
          status?: string
          titulo?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tickets_cliente_id_fkey"
            columns: ["cliente_id"]
            isOneToOne: false
            referencedRelation: "clients"
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
      warehouses: {
        Row: {
          cep: string | null
          cidade: string | null
          created_at: string
          endereco: string | null
          estado: string | null
          id: string
          nome: string
          observacoes: string | null
          responsavel: string | null
          status: string
          token_publico: string | null
          updated_at: string
        }
        Insert: {
          cep?: string | null
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string
          token_publico?: string | null
          updated_at?: string
        }
        Update: {
          cep?: string | null
          cidade?: string | null
          created_at?: string
          endereco?: string | null
          estado?: string | null
          id?: string
          nome?: string
          observacoes?: string | null
          responsavel?: string | null
          status?: string
          token_publico?: string | null
          updated_at?: string
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
      generate_contract_number: { Args: never; Returns: string }
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
      contract_status:
        | "rascunho"
        | "em_analise"
        | "aprovado"
        | "assinado"
        | "ativo"
        | "encerrado"
        | "rescindido"
      contract_type: "locacao" | "venda" | "comodato" | "servico"
      exclusivity_status: "ativa" | "expirada" | "suspensa"
      opportunity_status:
        | "em_analise"
        | "aprovada"
        | "em_negociacao"
        | "convertida"
        | "perdida"
        | "devolvida"
      signer_type: "locador" | "locatario" | "testemunha"
      tipo_disponibilidade: "venda" | "locacao" | "ambos"
      tipo_operacao:
        | "venda_direta"
        | "venda_agenciada"
        | "locacao_direta"
        | "locacao_agenciada"
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
      contract_status: [
        "rascunho",
        "em_analise",
        "aprovado",
        "assinado",
        "ativo",
        "encerrado",
        "rescindido",
      ],
      contract_type: ["locacao", "venda", "comodato", "servico"],
      exclusivity_status: ["ativa", "expirada", "suspensa"],
      opportunity_status: [
        "em_analise",
        "aprovada",
        "em_negociacao",
        "convertida",
        "perdida",
        "devolvida",
      ],
      signer_type: ["locador", "locatario", "testemunha"],
      tipo_disponibilidade: ["venda", "locacao", "ambos"],
      tipo_operacao: [
        "venda_direta",
        "venda_agenciada",
        "locacao_direta",
        "locacao_agenciada",
      ],
      user_role: ["admin", "comercial", "revendedor", "financeiro"],
    },
  },
} as const
