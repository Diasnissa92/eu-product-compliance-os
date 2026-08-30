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
      audit_events: {
        Row: {
          action: string
          created_at: string
          entity_id: string | null
          entity_type: string
          id: number
          org_id: string
          payload: Json
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          entity_id?: string | null
          entity_type: string
          id?: never
          org_id: string
          payload?: Json
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          entity_id?: string | null
          entity_type?: string
          id?: never
          org_id?: string
          payload?: Json
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_events_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      corrective_actions: {
        Row: {
          completed_at: string | null
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          incident_id: string
          org_id: string
          owner_id: string | null
          priority: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          incident_id: string
          org_id: string
          owner_id?: string | null
          priority?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          incident_id?: string
          org_id?: string
          owner_id?: string | null
          priority?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "corrective_actions_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "product_incidents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "corrective_actions_incident_scope_fkey"
            columns: ["incident_id", "org_id"]
            isOneToOne: false
            referencedRelation: "product_incidents"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "corrective_actions_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      document_analyses: {
        Row: {
          applied_at: string | null
          completed_at: string | null
          created_at: string
          document_id: string
          error_message: string | null
          estimated_cost_usd: number | null
          id: string
          model: string
          org_id: string
          product_id: string
          prompt_version: string
          requested_by: string
          result: Json | null
          status: string
          token_usage: Json
        }
        Insert: {
          applied_at?: string | null
          completed_at?: string | null
          created_at?: string
          document_id: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          model: string
          org_id: string
          product_id: string
          prompt_version: string
          requested_by: string
          result?: Json | null
          status?: string
          token_usage?: Json
        }
        Update: {
          applied_at?: string | null
          completed_at?: string | null
          created_at?: string
          document_id?: string
          error_message?: string | null
          estimated_cost_usd?: number | null
          id?: string
          model?: string
          org_id?: string
          product_id?: string
          prompt_version?: string
          requested_by?: string
          result?: Json | null
          status?: string
          token_usage?: Json
        }
        Relationships: [
          {
            foreignKeyName: "document_analyses_document_scope_fkey"
            columns: ["document_id", "org_id", "product_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id", "org_id", "product_id"]
          },
          {
            foreignKeyName: "document_analyses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "document_analyses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          document_type: string
          expiry_date: string | null
          file_path: string | null
          id: string
          issue_date: string | null
          issuing_body: string | null
          metadata: Json
          org_id: string
          product_id: string
          status: string
          title: string
          updated_at: string
          uploaded_by: string
        }
        Insert: {
          created_at?: string
          document_type: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          issue_date?: string | null
          issuing_body?: string | null
          metadata?: Json
          org_id: string
          product_id: string
          status?: string
          title: string
          updated_at?: string
          uploaded_by: string
        }
        Update: {
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          file_path?: string | null
          id?: string
          issue_date?: string | null
          issuing_body?: string | null
          metadata?: Json
          org_id?: string
          product_id?: string
          status?: string
          title?: string
          updated_at?: string
          uploaded_by?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      ecommerce_audits: {
        Row: {
          created_at: string
          created_by: string
          findings: Json
          id: string
          listing_data: Json
          listing_url: string | null
          marketplace: string
          org_id: string
          product_id: string
          score: number
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          findings?: Json
          id?: string
          listing_data?: Json
          listing_url?: string | null
          marketplace?: string
          org_id: string
          product_id: string
          score: number
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          findings?: Json
          id?: string
          listing_data?: Json
          listing_url?: string | null
          marketplace?: string
          org_id?: string
          product_id?: string
          score?: number
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "ecommerce_audits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_audits_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "ecommerce_audits_product_scope_fkey"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      organization_members: {
        Row: {
          accepted_at: string | null
          created_at: string
          invited_by: string | null
          invited_email: string | null
          org_id: string
          role: string
          user_id: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          invited_by?: string | null
          invited_email?: string | null
          org_id: string
          role: string
          user_id: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          invited_by?: string | null
          invited_email?: string | null
          org_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          country_code: string | null
          created_at: string
          created_by: string
          id: string
          name: string
          slug: string
          updated_at: string
        }
        Insert: {
          country_code?: string | null
          created_at?: string
          created_by: string
          id?: string
          name: string
          slug: string
          updated_at?: string
        }
        Update: {
          country_code?: string | null
          created_at?: string
          created_by?: string
          id?: string
          name?: string
          slug?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_imports: {
        Row: {
          created_at: string
          created_by: string
          created_rows: number
          errors: Json
          file_name: string
          id: string
          org_id: string
          skipped_rows: number
          total_rows: number
        }
        Insert: {
          created_at?: string
          created_by: string
          created_rows?: number
          errors?: Json
          file_name: string
          id?: string
          org_id: string
          skipped_rows?: number
          total_rows: number
        }
        Update: {
          created_at?: string
          created_by?: string
          created_rows?: number
          errors?: Json
          file_name?: string
          id?: string
          org_id?: string
          skipped_rows?: number
          total_rows?: number
        }
        Relationships: [
          {
            foreignKeyName: "product_imports_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      product_incidents: {
        Row: {
          affected_units: number | null
          closed_at: string | null
          countries: string[]
          created_at: string
          created_by: string
          description: string
          detected_at: string
          id: string
          occurred_at: string | null
          org_id: string
          owner_id: string | null
          product_id: string | null
          recall_required: boolean
          reference: string | null
          severity: string
          source: string
          status: string
          title: string
          updated_at: string
        }
        Insert: {
          affected_units?: number | null
          closed_at?: string | null
          countries?: string[]
          created_at?: string
          created_by: string
          description: string
          detected_at?: string
          id?: string
          occurred_at?: string | null
          org_id: string
          owner_id?: string | null
          product_id?: string | null
          recall_required?: boolean
          reference?: string | null
          severity?: string
          source?: string
          status?: string
          title: string
          updated_at?: string
        }
        Update: {
          affected_units?: number | null
          closed_at?: string | null
          countries?: string[]
          created_at?: string
          created_by?: string
          description?: string
          detected_at?: string
          id?: string
          occurred_at?: string | null
          org_id?: string
          owner_id?: string | null
          product_id?: string | null
          recall_required?: boolean
          reference?: string | null
          severity?: string
          source?: string
          status?: string
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_incidents_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_incidents_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_incidents_product_scope_fkey"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      product_requirements: {
        Row: {
          assigned_to: string | null
          checked_by: string | null
          created_at: string
          due_date: string | null
          evidence_document_id: string | null
          id: string
          last_checked_at: string | null
          notes: string | null
          org_id: string
          product_id: string
          requirement_id: string
          status: string
          updated_at: string
        }
        Insert: {
          assigned_to?: string | null
          checked_by?: string | null
          created_at?: string
          due_date?: string | null
          evidence_document_id?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          org_id: string
          product_id: string
          requirement_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          assigned_to?: string | null
          checked_by?: string | null
          created_at?: string
          due_date?: string | null
          evidence_document_id?: string | null
          id?: string
          last_checked_at?: string | null
          notes?: string | null
          org_id?: string
          product_id?: string
          requirement_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_requirements_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requirements_evidence_document_id_fkey"
            columns: ["evidence_document_id"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requirements_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requirements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_requirements_requirement_id_fkey"
            columns: ["requirement_id"]
            isOneToOne: false
            referencedRelation: "requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category: string | null
          compliance_score: number
          created_at: string
          created_by: string
          dpp_identifier: string | null
          dpp_public_data: Json
          dpp_published_at: string | null
          dpp_status: string
          dpp_updated_at: string | null
          economic_operator_name: string | null
          id: string
          importer_name: string | null
          manufacturer_name: string | null
          name: string
          org_id: string
          origin_country: string | null
          risk_level: string
          sector: string
          sku: string | null
          status: string
          target_markets: string[]
          updated_at: string
        }
        Insert: {
          category?: string | null
          compliance_score?: number
          created_at?: string
          created_by: string
          dpp_identifier?: string | null
          dpp_public_data?: Json
          dpp_published_at?: string | null
          dpp_status?: string
          dpp_updated_at?: string | null
          economic_operator_name?: string | null
          id?: string
          importer_name?: string | null
          manufacturer_name?: string | null
          name: string
          org_id: string
          origin_country?: string | null
          risk_level?: string
          sector?: string
          sku?: string | null
          status?: string
          target_markets?: string[]
          updated_at?: string
        }
        Update: {
          category?: string | null
          compliance_score?: number
          created_at?: string
          created_by?: string
          dpp_identifier?: string | null
          dpp_public_data?: Json
          dpp_published_at?: string | null
          dpp_status?: string
          dpp_updated_at?: string | null
          economic_operator_name?: string | null
          id?: string
          importer_name?: string | null
          manufacturer_name?: string | null
          name?: string
          org_id?: string
          origin_country?: string | null
          risk_level?: string
          sector?: string
          sku?: string | null
          status?: string
          target_markets?: string[]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          job_title: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          job_title?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          job_title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      regulations: {
        Row: {
          code: string
          created_at: string
          effective_from: string | null
          id: string
          jurisdiction: string
          sector: string
          source_url: string
          status: string
          summary: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          effective_from?: string | null
          id?: string
          jurisdiction?: string
          sector?: string
          source_url: string
          status?: string
          summary?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          effective_from?: string | null
          id?: string
          jurisdiction?: string
          sector?: string
          source_url?: string
          status?: string
          summary?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      requirement_comments: {
        Row: {
          author_id: string
          body: string
          created_at: string
          id: string
          org_id: string
          product_id: string
          product_requirement_id: string
          updated_at: string
        }
        Insert: {
          author_id: string
          body: string
          created_at?: string
          id?: string
          org_id: string
          product_id: string
          product_requirement_id: string
          updated_at?: string
        }
        Update: {
          author_id?: string
          body?: string
          created_at?: string
          id?: string
          org_id?: string
          product_id?: string
          product_requirement_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirement_comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_comments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_comments_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "requirement_comments_product_requirement_id_fkey"
            columns: ["product_requirement_id"]
            isOneToOne: false
            referencedRelation: "product_requirements"
            referencedColumns: ["id"]
          },
        ]
      }
      requirements: {
        Row: {
          code: string
          created_at: string
          description: string | null
          effective_from: string | null
          effective_to: string | null
          id: string
          mandatory: boolean
          product_category: string | null
          regulation_id: string
          requirement_type: string
          sector: string
          source_reference: string | null
          title: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          mandatory?: boolean
          product_category?: string | null
          regulation_id: string
          requirement_type: string
          sector?: string
          source_reference?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          effective_from?: string | null
          effective_to?: string | null
          id?: string
          mandatory?: boolean
          product_category?: string | null
          regulation_id?: string
          requirement_type?: string
          sector?: string
          source_reference?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "requirements_regulation_id_fkey"
            columns: ["regulation_id"]
            isOneToOne: false
            referencedRelation: "regulations"
            referencedColumns: ["id"]
          },
        ]
      }
      safety_gate_matches: {
        Row: {
          alert_reference: string
          alert_url: string
          created_by: string
          detected_at: string
          id: string
          matched_terms: string[]
          notifying_country: string | null
          org_id: string
          product_category: string | null
          product_id: string | null
          risk_level: string
          status: string
          title: string
          updated_at: string
          watch_id: string | null
        }
        Insert: {
          alert_reference: string
          alert_url: string
          created_by: string
          detected_at?: string
          id?: string
          matched_terms?: string[]
          notifying_country?: string | null
          org_id: string
          product_category?: string | null
          product_id?: string | null
          risk_level?: string
          status?: string
          title: string
          updated_at?: string
          watch_id?: string | null
        }
        Update: {
          alert_reference?: string
          alert_url?: string
          created_by?: string
          detected_at?: string
          id?: string
          matched_terms?: string[]
          notifying_country?: string | null
          org_id?: string
          product_category?: string | null
          product_id?: string | null
          risk_level?: string
          status?: string
          title?: string
          updated_at?: string
          watch_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "safety_gate_matches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_matches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_matches_product_scope_fkey"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "safety_gate_matches_watch_id_fkey"
            columns: ["watch_id"]
            isOneToOne: false
            referencedRelation: "safety_gate_watches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_matches_watch_scope_fkey"
            columns: ["watch_id", "org_id"]
            isOneToOne: false
            referencedRelation: "safety_gate_watches"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      safety_gate_watches: {
        Row: {
          category: string | null
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          keywords: string[]
          label: string
          last_checked_at: string | null
          last_result_count: number
          org_id: string
          product_id: string | null
          updated_at: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          keywords: string[]
          label: string
          last_checked_at?: string | null
          last_result_count?: number
          org_id: string
          product_id?: string | null
          updated_at?: string
        }
        Update: {
          category?: string | null
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          keywords?: string[]
          label?: string
          last_checked_at?: string | null
          last_result_count?: number
          org_id?: string
          product_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "safety_gate_watches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_watches_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "safety_gate_watches_product_scope_fkey"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      supplier_requests: {
        Row: {
          access_token: string
          created_at: string
          created_by: string
          due_date: string | null
          id: string
          message: string | null
          org_id: string
          product_id: string
          product_requirement_id: string | null
          requested_items: string[]
          status: string
          subject: string
          submitted_at: string | null
          supplier_email: string
          supplier_name: string
          updated_at: string
        }
        Insert: {
          access_token?: string
          created_at?: string
          created_by: string
          due_date?: string | null
          id?: string
          message?: string | null
          org_id: string
          product_id: string
          product_requirement_id?: string | null
          requested_items?: string[]
          status?: string
          subject: string
          submitted_at?: string | null
          supplier_email: string
          supplier_name: string
          updated_at?: string
        }
        Update: {
          access_token?: string
          created_at?: string
          created_by?: string
          due_date?: string | null
          id?: string
          message?: string | null
          org_id?: string
          product_id?: string
          product_requirement_id?: string | null
          requested_items?: string[]
          status?: string
          subject?: string
          submitted_at?: string | null
          supplier_email?: string
          supplier_name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_requests_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_requests_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_requests_product_requirement_id_fkey"
            columns: ["product_requirement_id"]
            isOneToOne: false
            referencedRelation: "product_requirements"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_requests_product_scope_fkey"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
        ]
      }
      supplier_responses: {
        Row: {
          document_name: string
          document_url: string
          id: string
          notes: string | null
          org_id: string
          product_id: string
          request_id: string
          reviewed_at: string | null
          reviewed_by: string | null
          status: string
          submitted_at: string
          supplier_email: string
          supplier_name: string
        }
        Insert: {
          document_name: string
          document_url: string
          id?: string
          notes?: string | null
          org_id: string
          product_id: string
          request_id: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          supplier_email: string
          supplier_name: string
        }
        Update: {
          document_name?: string
          document_url?: string
          id?: string
          notes?: string | null
          org_id?: string
          product_id?: string
          request_id?: string
          reviewed_at?: string | null
          reviewed_by?: string | null
          status?: string
          submitted_at?: string
          supplier_email?: string
          supplier_name?: string
        }
        Relationships: [
          {
            foreignKeyName: "supplier_responses_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_responses_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_responses_product_scope_fkey"
            columns: ["product_id", "org_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id", "org_id"]
          },
          {
            foreignKeyName: "supplier_responses_request_id_fkey"
            columns: ["request_id"]
            isOneToOne: false
            referencedRelation: "supplier_requests"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "supplier_responses_request_scope_fkey"
            columns: ["request_id", "org_id", "product_id"]
            isOneToOne: false
            referencedRelation: "supplier_requests"
            referencedColumns: ["id", "org_id", "product_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      accept_my_organization_invitations: { Args: never; Returns: number }
      add_requirement_comment: {
        Args: { p_body: string; p_product_requirement_id: string }
        Returns: Json
      }
      apply_document_analysis: {
        Args: { p_analysis_id: string }
        Returns: Json
      }
      assign_product_requirement: {
        Args: {
          p_assignee_id: string | null
          p_due_date: string | null
          p_product_requirement_id: string
        }
        Returns: Json
      }
      get_public_product_passport: {
        Args: { p_identifier: string }
        Returns: Json
      }
      get_supplier_request_portal: { Args: { p_token: string }; Returns: Json }
      import_products: {
        Args: { p_file_name: string; p_org_id: string; p_rows: Json }
        Returns: Json
      }
      review_product_requirement: {
        Args: {
          p_decision: string
          p_document_id: string
          p_product_requirement_id: string
        }
        Returns: Json
      }
      submit_supplier_response: {
        Args: {
          p_document_name: string
          p_document_url: string
          p_notes?: string
          p_supplier_email: string
          p_supplier_name: string
          p_token: string
        }
        Returns: Json
      }
      update_organization_member_role: {
        Args: { p_org_id: string; p_role: string; p_user_id: string }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
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
    Enums: {},
  },
} as const
