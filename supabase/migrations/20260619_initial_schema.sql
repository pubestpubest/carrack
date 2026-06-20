-- Initial schema for BDO Carrack Tracker
-- Applied via Supabase MCP on 2026-06-19
-- Run with: supabase db push  (or re-apply via MCP)

-- ============================================================
-- CATALOGUE TABLES (public read)
-- ============================================================

CREATE TABLE items (
  item_id   SERIAL PRIMARY KEY,
  name      TEXT NOT NULL,
  name_th   TEXT,
  grade     TEXT NOT NULL CHECK (grade IN ('white','green','blue')),
  category  TEXT NOT NULL CHECK (category IN ('equipment','material','stone','license','currency')),
  tier      INTEGER NOT NULL DEFAULT 0,
  image_url TEXT
);

CREATE TABLE ship_stages (
  stage_id    SERIAL PRIMARY KEY,
  ship_name   TEXT NOT NULL,
  stage_order INTEGER NOT NULL,
  variant     TEXT NOT NULL,
  recipe_id   INTEGER
);

CREATE TABLE ships (
  ship_id         SERIAL PRIMARY KEY,
  stage_id        INTEGER NOT NULL REFERENCES ship_stages(stage_id),
  image_url       TEXT,
  speed           FLOAT,
  acceleration    FLOAT,
  turn            FLOAT,
  brake           FLOAT,
  hp              INTEGER,
  weight_limit    FLOAT,
  inventory_slots INTEGER,
  cannon_damage   INTEGER,
  cannon_speed    FLOAT,
  cannon_range    INTEGER,
  crew_max        INTEGER
);

CREATE TABLE recipes (
  recipe_id      SERIAL PRIMARY KEY,
  name           TEXT NOT NULL,
  type           TEXT NOT NULL CHECK (type IN ('craft','convert','upgrade')),
  location       TEXT,
  output_item_id INTEGER NOT NULL REFERENCES items(item_id),
  output_qty     INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE ship_stages
  ADD CONSTRAINT fk_ship_stage_recipe
  FOREIGN KEY (recipe_id) REFERENCES recipes(recipe_id);

CREATE TABLE recipe_ingredients (
  recipe_id INTEGER NOT NULL REFERENCES recipes(recipe_id) ON DELETE CASCADE,
  item_id   INTEGER NOT NULL REFERENCES items(item_id),
  qty       INTEGER NOT NULL,
  PRIMARY KEY (recipe_id, item_id)
);

CREATE TABLE acquisition_methods (
  method_id        SERIAL PRIMARY KEY,
  item_id          INTEGER NOT NULL REFERENCES items(item_id),
  type             TEXT NOT NULL CHECK (type IN ('buy','exchange','craft','daily','quest','kill','process','mine','fish')),
  source           TEXT,
  currency         TEXT,
  cost             INTEGER,
  yield_per_action INTEGER
);

CREATE TABLE trade_exchanges (
  id             SERIAL PRIMARY KEY,
  input_item_id  INTEGER NOT NULL REFERENCES items(item_id),
  output_item_id INTEGER NOT NULL REFERENCES items(item_id),
  input_qty      INTEGER NOT NULL,
  output_qty     INTEGER NOT NULL,
  tier_required  INTEGER NOT NULL CHECK (tier_required BETWEEN 1 AND 5)
);

CREATE TABLE enhancements (
  id             SERIAL PRIMARY KEY,
  base_item_id   INTEGER NOT NULL REFERENCES items(item_id),
  result_item_id INTEGER NOT NULL REFERENCES items(item_id),
  stone_item_id  INTEGER REFERENCES items(item_id),
  level_from     INTEGER NOT NULL,
  level_to       INTEGER NOT NULL
);

-- ============================================================
-- USER TABLES
-- ============================================================

CREATE TABLE profiles (
  id         UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username   TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_inventory (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(item_id),
  qty_have   INTEGER NOT NULL DEFAULT 0 CHECK (qty_have >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(user_id, item_id)
);

CREATE TABLE inventory_log (
  id         SERIAL PRIMARY KEY,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id    INTEGER NOT NULL REFERENCES items(item_id),
  delta      INTEGER NOT NULL,
  reason     TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_goals (
  id                SERIAL PRIMARY KEY,
  user_id           UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id           INTEGER NOT NULL REFERENCES items(item_id),
  target_qty        INTEGER NOT NULL DEFAULT 1 CHECK (target_qty > 0),
  is_active         BOOLEAN NOT NULL DEFAULT TRUE,
  use_daily_quests  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_acquisition_preferences (
  user_id   UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  item_id   INTEGER NOT NULL REFERENCES items(item_id),
  method_id INTEGER NOT NULL REFERENCES acquisition_methods(method_id),
  PRIMARY KEY (user_id, item_id)
);

CREATE TABLE user_ship_progress (
  id                           SERIAL PRIMARY KEY,
  user_id                      UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stage_id                     INTEGER NOT NULL REFERENCES ship_stages(stage_id),
  status                       TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started','in_progress','complete')),
  equipment_at_full_durability BOOLEAN NOT NULL DEFAULT FALSE,
  started_at                   TIMESTAMPTZ,
  completed_at                 TIMESTAMPTZ,
  UNIQUE(user_id, stage_id)
);

CREATE TABLE user_recipe_log (
  id              SERIAL PRIMARY KEY,
  user_id         UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipe_id       INTEGER NOT NULL REFERENCES recipes(recipe_id),
  times_crafted   INTEGER NOT NULL DEFAULT 0,
  last_crafted_at TIMESTAMPTZ,
  UNIQUE(user_id, recipe_id)
);

-- ============================================================
-- TRIGGERS
-- ============================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER user_inventory_updated_at
  BEFORE UPDATE ON user_inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE items                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ships                        ENABLE ROW LEVEL SECURITY;
ALTER TABLE ship_stages                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipes                      ENABLE ROW LEVEL SECURITY;
ALTER TABLE recipe_ingredients           ENABLE ROW LEVEL SECURITY;
ALTER TABLE acquisition_methods          ENABLE ROW LEVEL SECURITY;
ALTER TABLE trade_exchanges              ENABLE ROW LEVEL SECURITY;
ALTER TABLE enhancements                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles                     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_inventory               ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_log                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_goals                   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_acquisition_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_ship_progress           ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_recipe_log              ENABLE ROW LEVEL SECURITY;

CREATE POLICY "public_read" ON items               FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON ships               FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON ship_stages         FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON recipes             FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON recipe_ingredients  FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON acquisition_methods FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON trade_exchanges     FOR SELECT USING (TRUE);
CREATE POLICY "public_read" ON enhancements        FOR SELECT USING (TRUE);

CREATE POLICY "own_data" ON profiles                     FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_data" ON user_inventory               FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON inventory_log                FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON user_goals                   FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON user_acquisition_preferences FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON user_ship_progress           FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_data" ON user_recipe_log              FOR ALL USING (auth.uid() = user_id);
