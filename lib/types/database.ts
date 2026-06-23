export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      acquisition_methods: {
        Row: { cost: number | null; currency: string | null; item_id: number; method_id: number; source: string | null; type: string; yield_per_action: number | null }
        Insert: { cost?: number | null; currency?: string | null; item_id: number; method_id?: number; source?: string | null; type: string; yield_per_action?: number | null }
        Update: { cost?: number | null; currency?: string | null; item_id?: number; method_id?: number; source?: string | null; type?: string; yield_per_action?: number | null }
        Relationships: [{ foreignKeyName: "acquisition_methods_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] }]
      }
      enhancements: {
        Row: { base_item_id: number; id: number; level_from: number; level_to: number; result_item_id: number; stone_item_id: number | null }
        Insert: { base_item_id: number; id?: number; level_from: number; level_to: number; result_item_id: number; stone_item_id?: number | null }
        Update: { base_item_id?: number; id?: number; level_from?: number; level_to?: number; result_item_id?: number; stone_item_id?: number | null }
        Relationships: [
          { foreignKeyName: "enhancements_base_item_id_fkey"; columns: ["base_item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
          { foreignKeyName: "enhancements_result_item_id_fkey"; columns: ["result_item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
          { foreignKeyName: "enhancements_stone_item_id_fkey"; columns: ["stone_item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
        ]
      }
      inventory_log: {
        Row: { created_at: string; delta: number; id: number; item_id: number; reason: string | null; user_id: string }
        Insert: { created_at?: string; delta: number; id?: number; item_id: number; reason?: string | null; user_id: string }
        Update: { created_at?: string; delta?: number; id?: number; item_id?: number; reason?: string | null; user_id?: string }
        Relationships: [{ foreignKeyName: "inventory_log_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] }]
      }
      items: {
        Row: { category: string; crow_coin_price: number | null; grade: string; image_url: string | null; item_id: number; name: string; name_th: string | null; tier: number }
        Insert: { category: string; crow_coin_price?: number | null; grade: string; image_url?: string | null; item_id?: number; name: string; name_th?: string | null; tier?: number }
        Update: { category?: string; crow_coin_price?: number | null; grade?: string; image_url?: string | null; item_id?: number; name?: string; name_th?: string | null; tier?: number }
        Relationships: []
      }
      profiles: {
        Row: { created_at: string; id: string; username: string }
        Insert: { created_at?: string; id: string; username: string }
        Update: { created_at?: string; id?: string; username?: string }
        Relationships: []
      }
      recipe_ingredients: {
        Row: { item_id: number; qty: number; recipe_id: number }
        Insert: { item_id: number; qty: number; recipe_id: number }
        Update: { item_id?: number; qty?: number; recipe_id?: number }
        Relationships: [
          { foreignKeyName: "recipe_ingredients_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
          { foreignKeyName: "recipe_ingredients_recipe_id_fkey"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipes"; referencedColumns: ["recipe_id"] },
        ]
      }
      recipes: {
        Row: { location: string | null; name: string; output_item_id: number; output_qty: number; recipe_id: number; type: string }
        Insert: { location?: string | null; name: string; output_item_id: number; output_qty?: number; recipe_id?: number; type: string }
        Update: { location?: string | null; name?: string; output_item_id?: number; output_qty?: number; recipe_id?: number; type?: string }
        Relationships: [{ foreignKeyName: "recipes_output_item_id_fkey"; columns: ["output_item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] }]
      }
      ship_stages: {
        Row: { recipe_id: number | null; ship_name: string; stage_id: number; stage_order: number; variant: string }
        Insert: { recipe_id?: number | null; ship_name: string; stage_id?: number; stage_order: number; variant: string }
        Update: { recipe_id?: number | null; ship_name?: string; stage_id?: number; stage_order?: number; variant?: string }
        Relationships: [{ foreignKeyName: "fk_ship_stage_recipe"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipes"; referencedColumns: ["recipe_id"] }]
      }
      ships: {
        Row: { acceleration: number | null; brake: number | null; cannon_damage: number | null; cannon_range: number | null; cannon_speed: number | null; crew_max: number | null; hp: number | null; image_url: string | null; inventory_slots: number | null; ship_id: number; speed: number | null; stage_id: number; turn: number | null; weight_limit: number | null }
        Insert: { acceleration?: number | null; brake?: number | null; cannon_damage?: number | null; cannon_range?: number | null; cannon_speed?: number | null; crew_max?: number | null; hp?: number | null; image_url?: string | null; inventory_slots?: number | null; ship_id?: number; speed?: number | null; stage_id: number; turn?: number | null; weight_limit?: number | null }
        Update: { acceleration?: number | null; brake?: number | null; cannon_damage?: number | null; cannon_range?: number | null; cannon_speed?: number | null; crew_max?: number | null; hp?: number | null; image_url?: string | null; inventory_slots?: number | null; ship_id?: number; speed?: number | null; stage_id?: number; turn?: number | null; weight_limit?: number | null }
        Relationships: [{ foreignKeyName: "ships_stage_id_fkey"; columns: ["stage_id"]; isOneToOne: false; referencedRelation: "ship_stages"; referencedColumns: ["stage_id"] }]
      }
      trade_exchanges: {
        Row: { id: number; input_item_id: number; input_qty: number; output_item_id: number; output_qty: number; tier_required: number }
        Insert: { id?: number; input_item_id: number; input_qty: number; output_item_id: number; output_qty: number; tier_required: number }
        Update: { id?: number; input_item_id?: number; input_qty?: number; output_item_id?: number; output_qty?: number; tier_required?: number }
        Relationships: [
          { foreignKeyName: "trade_exchanges_input_item_id_fkey"; columns: ["input_item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
          { foreignKeyName: "trade_exchanges_output_item_id_fkey"; columns: ["output_item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
        ]
      }
      user_acquisition_preferences: {
        Row: { item_id: number; method_id: number; user_id: string }
        Insert: { item_id: number; method_id: number; user_id: string }
        Update: { item_id?: number; method_id?: number; user_id?: string }
        Relationships: [
          { foreignKeyName: "user_acquisition_preferences_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
          { foreignKeyName: "user_acquisition_preferences_method_id_fkey"; columns: ["method_id"]; isOneToOne: false; referencedRelation: "acquisition_methods"; referencedColumns: ["method_id"] },
        ]
      }
      user_barter_thresholds: {
        Row: { user_id: string; tier: number; crit: number; warn: number }
        Insert: { user_id: string; tier: number; crit?: number; warn?: number }
        Update: { user_id?: string; tier?: number; crit?: number; warn?: number }
        Relationships: []
      }
      user_goals: {
        Row: { created_at: string; current_stage_id: number | null; id: number; is_active: boolean; item_id: number | null; target_qty: number; use_daily_quests: boolean; user_id: string }
        Insert: { created_at?: string; current_stage_id?: number | null; id?: number; is_active?: boolean; item_id?: number | null; target_qty?: number; use_daily_quests?: boolean; user_id: string }
        Update: { created_at?: string; current_stage_id?: number | null; id?: number; is_active?: boolean; item_id?: number | null; target_qty?: number; use_daily_quests?: boolean; user_id?: string }
        Relationships: [
          { foreignKeyName: "user_goals_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] },
          { foreignKeyName: "user_goals_current_stage_id_fkey"; columns: ["current_stage_id"]; isOneToOne: false; referencedRelation: "ship_stages"; referencedColumns: ["stage_id"] },
        ]
      }
      user_inventory: {
        Row: { id: number; item_id: number; qty_have: number; updated_at: string; user_id: string }
        Insert: { id?: number; item_id: number; qty_have?: number; updated_at?: string; user_id: string }
        Update: { id?: number; item_id?: number; qty_have?: number; updated_at?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "user_inventory_item_id_fkey"; columns: ["item_id"]; isOneToOne: false; referencedRelation: "items"; referencedColumns: ["item_id"] }]
      }
      user_recipe_log: {
        Row: { id: number; last_crafted_at: string | null; recipe_id: number; times_crafted: number; user_id: string }
        Insert: { id?: number; last_crafted_at?: string | null; recipe_id: number; times_crafted?: number; user_id: string }
        Update: { id?: number; last_crafted_at?: string | null; recipe_id?: number; times_crafted?: number; user_id?: string }
        Relationships: [{ foreignKeyName: "user_recipe_log_recipe_id_fkey"; columns: ["recipe_id"]; isOneToOne: false; referencedRelation: "recipes"; referencedColumns: ["recipe_id"] }]
      }
      user_ship_progress: {
        Row: { completed_at: string | null; equipment_at_full_durability: boolean; id: number; stage_id: number; started_at: string | null; status: string; user_id: string }
        Insert: { completed_at?: string | null; equipment_at_full_durability?: boolean; id?: number; stage_id: number; started_at?: string | null; status?: string; user_id: string }
        Update: { completed_at?: string | null; equipment_at_full_durability?: boolean; id?: number; stage_id?: number; started_at?: string | null; status?: string; user_id?: string }
        Relationships: [{ foreignKeyName: "user_ship_progress_stage_id_fkey"; columns: ["stage_id"]; isOneToOne: false; referencedRelation: "ship_stages"; referencedColumns: ["stage_id"] }]
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof DatabaseWithoutInternals, "public">]

export type Tables<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Row"]

export type TablesInsert<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Insert"]

export type TablesUpdate<T extends keyof DefaultSchema["Tables"]> =
  DefaultSchema["Tables"][T]["Update"]
