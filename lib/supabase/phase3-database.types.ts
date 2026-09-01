import type { Database as BaseDatabase, Json } from "@/lib/supabase/database.types";

export type { Json } from "@/lib/supabase/database.types";

type BaseTables = BaseDatabase["public"]["Tables"];
type BaseProducts = BaseTables["products"];
type BaseFunctions = BaseDatabase["public"]["Functions"];

type Phase3Products = {
  Row: BaseProducts["Row"] & { regulatory_profile: Json };
  Insert: BaseProducts["Insert"] & { regulatory_profile?: Json };
  Update: BaseProducts["Update"] & { regulatory_profile?: Json };
  Relationships: BaseProducts["Relationships"];
};

type OrganizationSubscriptions = {
  Row: {
    cancel_at_period_end: boolean;
    created_at: string;
    current_period_end: string | null;
    org_id: string;
    plan_code: string;
    status: string;
    stripe_customer_id: string | null;
    stripe_price_id: string | null;
    stripe_subscription_id: string | null;
    updated_at: string;
  };
  Insert: {
    cancel_at_period_end?: boolean;
    created_at?: string;
    current_period_end?: string | null;
    org_id: string;
    plan_code?: string;
    status?: string;
    stripe_customer_id?: string | null;
    stripe_price_id?: string | null;
    stripe_subscription_id?: string | null;
    updated_at?: string;
  };
  Update: {
    cancel_at_period_end?: boolean;
    created_at?: string;
    current_period_end?: string | null;
    org_id?: string;
    plan_code?: string;
    status?: string;
    stripe_customer_id?: string | null;
    stripe_price_id?: string | null;
    stripe_subscription_id?: string | null;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "organization_subscriptions_org_id_fkey";
      columns: ["org_id"];
      isOneToOne: true;
      referencedRelation: "organizations";
      referencedColumns: ["id"];
    },
  ];
};

type ProductRegulatoryAssessments = {
  Row: {
    assessed_at: string;
    assessed_by: string | null;
    engine_version: string;
    id: string;
    inputs: Json;
    org_id: string;
    outcome: string;
    product_id: string;
    rationale: string;
    regulation_code: string;
    source_reference: string | null;
    source_url: string;
  };
  Insert: {
    assessed_at?: string;
    assessed_by?: string | null;
    engine_version: string;
    id?: string;
    inputs?: Json;
    org_id: string;
    outcome: string;
    product_id: string;
    rationale: string;
    regulation_code: string;
    source_reference?: string | null;
    source_url: string;
  };
  Update: {
    assessed_at?: string;
    assessed_by?: string | null;
    engine_version?: string;
    id?: string;
    inputs?: Json;
    org_id?: string;
    outcome?: string;
    product_id?: string;
    rationale?: string;
    regulation_code?: string;
    source_reference?: string | null;
    source_url?: string;
  };
  Relationships: [
    {
      foreignKeyName: "product_regulatory_assessments_assessed_by_fkey";
      columns: ["assessed_by"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "product_regulatory_assessments_org_id_fkey";
      columns: ["org_id"];
      isOneToOne: false;
      referencedRelation: "organizations";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "product_regulatory_assessments_product_id_fkey";
      columns: ["product_id"];
      isOneToOne: false;
      referencedRelation: "products";
      referencedColumns: ["id"];
    },
  ];
};

type RegulatoryActionItems = {
  Row: {
    action_key: string;
    assignee_id: string | null;
    created_at: string;
    created_by: string;
    due_date: string | null;
    engine_version: string;
    id: string;
    kind: string;
    org_id: string;
    product_id: string;
    rationale: string;
    regulation_code: string;
    severity: string;
    source_reference: string;
    source_url: string;
    status: string;
    title: string;
    updated_at: string;
  };
  Insert: {
    action_key: string;
    assignee_id?: string | null;
    created_at?: string;
    created_by: string;
    due_date?: string | null;
    engine_version: string;
    id?: string;
    kind: string;
    org_id: string;
    product_id: string;
    rationale: string;
    regulation_code: string;
    severity: string;
    source_reference: string;
    source_url: string;
    status?: string;
    title: string;
    updated_at?: string;
  };
  Update: {
    action_key?: string;
    assignee_id?: string | null;
    created_at?: string;
    created_by?: string;
    due_date?: string | null;
    engine_version?: string;
    id?: string;
    kind?: string;
    org_id?: string;
    product_id?: string;
    rationale?: string;
    regulation_code?: string;
    severity?: string;
    source_reference?: string;
    source_url?: string;
    status?: string;
    title?: string;
    updated_at?: string;
  };
  Relationships: [
    {
      foreignKeyName: "regulatory_action_items_assignee_id_fkey";
      columns: ["assignee_id"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "regulatory_action_items_created_by_fkey";
      columns: ["created_by"];
      isOneToOne: false;
      referencedRelation: "profiles";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "regulatory_action_items_org_id_fkey";
      columns: ["org_id"];
      isOneToOne: false;
      referencedRelation: "organizations";
      referencedColumns: ["id"];
    },
    {
      foreignKeyName: "regulatory_action_items_product_id_fkey";
      columns: ["product_id"];
      isOneToOne: false;
      referencedRelation: "products";
      referencedColumns: ["id"];
    },
  ];
};

export type Database = Omit<BaseDatabase, "public"> & {
  public: Omit<BaseDatabase["public"], "Tables" | "Functions"> & {
    Tables: Omit<BaseTables, "organization_subscriptions" | "products" | "product_regulatory_assessments" | "regulatory_action_items"> & {
      organization_subscriptions: OrganizationSubscriptions;
      products: Phase3Products;
      product_regulatory_assessments: ProductRegulatoryAssessments;
      regulatory_action_items: RegulatoryActionItems;
    };
    Functions: BaseFunctions & {
      onboard_my_organization: {
        Args: {
          p_country_code: string;
          p_full_name: string;
          p_organization_name: string;
          p_slug: string;
        };
        Returns: Json;
      };
    };
  };
};
