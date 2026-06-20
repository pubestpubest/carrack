-- Seed data: BDO Epheria Carrack Tracker
-- Source: items.md + business-logic-inventory-todo-tracking.md

-- ================================================
-- ITEMS
-- ================================================
INSERT INTO items (item_id, name, name_th, grade, category, tier) VALUES
-- Equipment Tier 1: Basic Epheria (buy from Falasi, then enhance)
(1,  'Epheria Sailboat: Old Prow',        'เรือเอเฟเรีย : หัวเรือเก่า',             'white', 'equipment', 1),
(2,  'Epheria Sailboat: Old Plating',     'เรือเอเฟเรีย : หุ้มเกราะเก่า',           'white', 'equipment', 1),
(3,  'Epheria Sailboat: Old Cannon',      'เรือเอเฟเรีย : ปืนใหญ่เก่า',             'white', 'equipment', 1),
(4,  'Epheria Sailboat: Old Wind Sail',   'เรือเอเฟเรีย : ใบเรือแล่นลมเก่า',        'white', 'equipment', 1),
-- Equipment Tier 2: +10 Basic Epheria
(5,  'Epheria Sailboat: +10 Old Prow',      '+10 เรือเอเฟเรีย : หัวเรือเก่า',      'white', 'equipment', 2),
(6,  'Epheria Sailboat: +10 Old Plating',   '+10 เรือเอเฟเรีย : หุ้มเกราะเก่า',    'white', 'equipment', 2),
(7,  'Epheria Sailboat: +10 Old Cannon',    '+10 เรือเอเฟเรีย : ปืนใหญ่เก่า',      'white', 'equipment', 2),
(8,  'Epheria Sailboat: +10 Old Wind Sail', '+10 เรือเอเฟเรีย : ใบเรือแล่นลมเก่า', 'white', 'equipment', 2),
-- Equipment Tier 3: Caravel base (buy from Falasi, enhance to +10)
(9,  'Epheria Caravel: Brass Prow',         '+10 เรือการค้าเอเฟเรีย : หัวเรือทองเหลือง',     'white', 'equipment', 3),
(10, 'Epheria Caravel: Solid Plating',      '+10 เรือการค้าเอเฟเรีย : หุ้มเกราะแข็งแกร่ง',   'white', 'equipment', 3),
(11, 'Epheria Caravel: Verisha Cannon',     '+10 เรือการค้าเอเฟเรีย : ปืนใหญ่เวริสชาร์',    'white', 'equipment', 3),
(12, 'Epheria Caravel: White Wind Sail',    '+10 เรือการค้าเอเฟเรีย : ใบเรือแล่นลมสีขาว',   'white', 'equipment', 3),
-- Equipment Tier 3: Galleass base (buy from Falasi, enhance to +10)
(13, 'Epheria Galleass: White Prow',        '+10 เรือแกลลีย์เอเฟเรีย : หัวเรือสีขาว',       'white', 'equipment', 3),
(14, 'Epheria Galleass: Solid Plating',     '+10 เรือแกลลีย์เอเฟเรีย : หุ้มเกราะแข็งแกร่ง', 'white', 'equipment', 3),
(15, 'Epheria Galleass: Verisha Cannon',    '+10 เรือแกลลีย์เอเฟเรีย : ปืนใหญ่เวริสชาร์',   'white', 'equipment', 3),
(16, 'Epheria Galleass: White Wind Sail',   '+10 เรือแกลลีย์เอเฟเรีย : ใบเรือแล่นลมสีขาว',  'white', 'equipment', 3),
-- Equipment Tier 4: Blue Caravel equipment (crafted at Tier 4 Workshop)
(17, 'Epheria Caravel: Black Dragon Prow',  'เรือการค้าเอเฟเรีย : หัวเรือมังกรดำ',      'blue', 'equipment', 4),
(18, 'Epheria Caravel: Upgraded Plating',   'เรือการค้าเอเฟเรีย : หุ้มเกราะดัดแปลง',    'blue', 'equipment', 4),
(19, 'Epheria Caravel: Mayna Cannon',       'เรือการค้าเอเฟเรีย : ปืนใหญ่เมย์นา',       'blue', 'equipment', 4),
(20, 'Epheria Caravel: Stratus Wind Sail',  'เรือการค้าเอเฟเรีย : ใบเรือแล่นลมชั้นเมฆ',  'blue', 'equipment', 4),
-- Equipment Tier 4: Blue Galleass equipment (crafted at Tier 4 Workshop)
(21, 'Epheria Galleass: Black Dragon Prow', 'เรือแกลลีย์เอเฟเรีย : หัวเรือมังกรดำ',     'blue', 'equipment', 4),
(22, 'Epheria Galleass: Upgraded Plating',  'เรือแกลลีย์เอเฟเรีย : หุ้มเกราะดัดแปลง',   'blue', 'equipment', 4),
(23, 'Epheria Galleass: Mayna Cannon',      'เรือแกลลีย์เอเฟเรีย : ปืนใหญ่เมย์นา',      'blue', 'equipment', 4),
(24, 'Epheria Galleass: Stratus Wind Sail', 'เรือแกลลีย์เอเฟเรีย : ใบเรือแล่นลมชั้นเมฆ', 'blue', 'equipment', 4),
-- Equipment Tier 5: Carrack Tolo (green, from Ravinia with Crow Coins)
(25, 'Epheria Carrack: Tolo Plating',    '+10 เรือคาร์แร็คเอเฟเรีย : หุ้มเกราะของโทโล่', 'green', 'equipment', 5),
(26, 'Epheria Carrack: Tolo Wind Sail',  '+10 เรือคาร์แร็คเอเฟเรีย : ใบเรือของโทโล่',   'green', 'equipment', 5),
(27, 'Epheria Carrack: Tolo Prow',       '+10 เรือคาร์แร็คเอเฟเรีย : หัวเรือของโทโล่',  'green', 'equipment', 5),
(28, 'Epheria Carrack: Tolo Cannon',     '+10 เรือคาร์แร็คเอเฟเรีย : ปืนใหญ่ของโทโล่',  'green', 'equipment', 5),
-- Equipment Tier 6: Sheekulo / Seezily (blue, crafted at Sheekulo Workshop)
(29, 'Epheria Carrack: Sheekulo Dark Plating', 'เรือคาร์แร็คเอเฟเรีย : หุ้มเกราะดำของชีโล่', 'blue', 'equipment', 6),
(30, 'Epheria Carrack: Sheekulo Wind Sail',    'เรือคาร์แร็คเอเฟเรีย : ใบเรือของชีโล่',     'blue', 'equipment', 6),
(31, 'Epheria Carrack: Sheekulo Prow',         'เรือคาร์แร็คเอเฟเรีย : หัวเรือของชีโล่',    'blue', 'equipment', 6),
(32, 'Epheria Carrack: Sheekulo Cannon',       'เรือคาร์แร็คเอเฟเรีย : ปืนใหญ่ของชีโล่',   'blue', 'equipment', 6),
-- Licenses / Blueprints
(33, 'Ship License: Epheria Caravel',                    'ใบอนุญาตการสร้างเรือ : เรือการค้าเอเฟเรีย',       'white', 'license', 2),
(34, 'Epheria Carrack Component Upgrade Permit',         'ใบอนุญาตปรับปรุงส่วนประกอบเรือคาร์แร็คเอเฟเรีย', 'white', 'license', 5),
(35, 'Blueprint: Sheekulo Dark Plating',                 'แผนผัง : หุ้มเกราะดำของชีโล่',                   'white', 'license', 5),
(36, 'Blueprint: Sheekulo Wind Sail',                    'แผนผัง : ใบเรือของชีโล่',                        'white', 'license', 5),
(37, 'Blueprint: Sheekulo Prow',                         'แผนผัง : หัวเรือของชีโล่',                       'white', 'license', 5),
(38, 'Blueprint: Sheekulo Cannon',                       'แผนผัง : ปืนใหญ่ของชีโล่',                      'white', 'license', 5),
-- Basic Materials Tier 1
(39, 'Plywood',           'ไม้แปรรูป',                       'white', 'material', 1),
(40, 'Iron',              'เหล็ก',                           'white', 'material', 1),
(41, 'Pine Plywood',      'ไม้อัดสน',                        'white', 'material', 1),
(42, 'Linen',             'ผ้าลินิน',                        'white', 'material', 1),
(43, 'Sturdy Timber',     'เสาไม้แข็งแรง',                   'white', 'material', 1),
(44, 'High Armor Stone',  'หินแปรสภาพเกราะป้องกัน ระดับสูง',  'white', 'material', 1),
-- Pre-Carrack Conversion Materials Tier 2
(45, 'Dark Steel Ingot',          'แท่งโลหะควันมืดต่อเติม',      'white', 'material', 2),
(46, 'Timber for Shipbuilding',   'ไม้สำหรับต่อเติม',             'white', 'material', 2),
(47, 'Adhesive for Shipbuilding', 'กาวสำหรับต่อเติม',             'white', 'material', 2),
(48, 'Island Tree Plywood',       'ไม้อัดต้นเกาะ',                'white', 'material', 2),
(49, 'Saltwater Ingot',           'แท่งเหล็กหินเกลือ',            'white', 'material', 2),
(50, 'Deep Sea Glue',             'กาวที่มีความทรงจำของทะเลลึก',  'white', 'material', 2),
(51, 'Deep Sea Plant Stalk',      'ลำต้นพืชทะเลลึก',              'white', 'material', 2),
-- Blue Pre-Carrack Materials Tier 3
(52, 'Scarlet Ore of the Deep Sea',            'แร่ใต้มหาสมุทรสีเลือดฝาด',                      'blue',  'material', 3),
(53, 'Enhanced Island Tree Plywood',           'ไม้อัดต้นเกาะเสริมประสิทธิภาพ',                 'blue',  'material', 3),
(54, 'Strong Ocean Iron',                      'เหล็กแห่งมหาสมุทรที่แข็งแกร่ง',                'blue',  'material', 3),
(55, 'Pure Pearl Gem',                         'อัญมณีมุกที่บริสุทธิ์',                         'blue',  'material', 3),
(56, 'Cox Pirate Insignia (Low Negotiation)',  'วัตถุโบราณของโจรสลัดค็อกซ์ (การเจรจาระดับต่ำ)', 'white', 'material', 3),
(57, 'Cox Pirate Insignia (Battle)',           'วัตถุโบราณของโจรสลัดค็อกซ์ (ต่อสู้)',           'white', 'material', 3),
(58, 'Moon Scale Plywood',                     'ไม้อัดเกล็ดพระจันทร์',                          'blue',  'material', 3),
(59, 'Shining Blue Lumberwood',                'ไม้แปรรูปที่ประกายแสงสีคราม',                    'blue',  'material', 3),
(60, 'Smooth Reef Stone Fragment',             'ชิ้นส่วนหินโสโครกกระจ่างใส',                    'white', 'material', 3),
(61, 'Cox Pirate Insignia (High Negotiation)', 'วัตถุโบราณของโจรสลัดค็อกซ์ (การเจรจาระดับสูง)', 'white', 'material', 3),
(62, 'Brilliant Cobalt Ingot',                 'แท่งทองสีโคบอลต์เปร่งประกาย',                   'blue',  'material', 3),
-- Carrack Upgrade Materials Tier 4
(63, 'Moon''s Thread Linen',        'ผ้าลินินที่มีเส้นเลือดของพระจันทร์สลักอยู่', 'blue', 'material', 4),
(64, 'Indigo Lumberwood',           'ไม้แปรรูปที่ประกายแสงสีครามเข้ม',            'blue', 'material', 4),
(65, 'Glittering Saltwater Ingot',  'แท่งเหล็กหินเกลือเจิดจรัส',                  'blue', 'material', 4),
(66, 'Glittering Pearl Gem',        'อัญมณีมุกเจิดจรัส',                          'blue', 'material', 4),
(67, 'Tear of the Deep Sea',        'น้ำตาแห่งทะเลลึก',                            'blue', 'material', 4),
-- Sheekulo Materials Tier 5
(68, 'Violent Sea Plywood',   'ไม้อัดคลื่นทะเลรุนแรง',      'blue', 'material', 5),
(69, 'Elegant Support Beam',  'เสารองรับที่ประณีต',           'blue', 'material', 5),
(70, 'Sea Wave Adhesive',     'กาวที่มีร่องรอยของคลื่นทะเล', 'blue', 'material', 5),
-- Enhancement Stones
(71, 'Nymph Absorption Black Stone', 'หินดำที่ดูดกลืนพลังนางไม้',   'white', 'stone', 2),
(72, 'Warm Black Stone',             'หินดำที่มีความอบอุ่น',        'white', 'stone', 3),
(73, 'Cold Black Stone',             'หินดำที่มีความเยือกเย็น',     'white', 'stone', 3),
(74, 'Sunlit Black Stone',           'หินดำห่อหุ้มด้วยแสงอาทิตย์', 'white', 'stone', 5),
(75, 'Moonlit Black Stone',          'หินดำที่มีแสงจันทร์',         'white', 'stone', 5),
(76, 'Dawn Black Stone',             'หินดำที่มีแสงรุ่งอรุณ',       'blue',  'stone', 5),
(77, 'Stardust',                     'ผงแสงดาว',                    'white', 'stone', 5),
(78, 'Memory Fragment',              'สะเก็ดแห่งความทรงจำ',         'white', 'stone', 1),
-- Currency
(79, 'Crow Coin',                         'เหรียญตราอีกาดำ',                 'white', 'currency', 1),
(80, 'Black Crow Trade Exchange Voucher', 'ใบแลกเปลี่ยนกลุ่มการค้าอีกาดำ', 'white', 'currency', 2)
ON CONFLICT (item_id) DO NOTHING;

-- ================================================
-- RECIPES
-- ================================================
INSERT INTO recipes (recipe_id, output_item_id, output_qty, name, type, location) VALUES
(1,  17, 1, 'Epheria Caravel: Black Dragon Prow',     'craft', 'Tier 4 Ship Part Workshop'),
(2,  18, 1, 'Epheria Caravel: Upgraded Plating',      'craft', 'Tier 4 Ship Part Workshop'),
(3,  19, 1, 'Epheria Caravel: Mayna Cannon',          'craft', 'Tier 4 Ship Part Workshop'),
(4,  20, 1, 'Epheria Caravel: Stratus Wind Sail',     'craft', 'Tier 4 Ship Part Workshop'),
(5,  21, 1, 'Epheria Galleass: Black Dragon Prow',    'craft', 'Tier 4 Ship Part Workshop'),
(6,  22, 1, 'Epheria Galleass: Upgraded Plating',     'craft', 'Tier 4 Ship Part Workshop'),
(7,  23, 1, 'Epheria Galleass: Mayna Cannon',         'craft', 'Tier 4 Ship Part Workshop'),
(8,  24, 1, 'Epheria Galleass: Stratus Wind Sail',    'craft', 'Tier 4 Ship Part Workshop'),
(9,  29, 1, 'Epheria Carrack: Sheekulo Dark Plating', 'craft', 'Sheekulo Workshop - Iliya House 3'),
(10, 30, 1, 'Epheria Carrack: Sheekulo Wind Sail',    'craft', 'Sheekulo Workshop - Iliya House 3'),
(11, 31, 1, 'Epheria Carrack: Sheekulo Prow',         'craft', 'Sheekulo Workshop - Iliya House 3'),
(12, 32, 1, 'Epheria Carrack: Sheekulo Cannon',       'craft', 'Sheekulo Workshop - Iliya House 3'),
(13, 76, 1, 'Dawn Black Stone',                       'craft', 'Sheekulo Workshop - Iliya House 3')
ON CONFLICT (recipe_id) DO NOTHING;

-- ================================================
-- RECIPE INGREDIENTS
-- ================================================
INSERT INTO recipe_ingredients (recipe_id, item_id, qty) VALUES
-- Recipe 1: Caravel Black Dragon Prow
(1, 9, 1), (1, 52, 50), (1, 53, 300), (1, 51, 125), (1, 54, 150),
-- Recipe 2: Caravel Upgraded Plating
(2, 10, 1), (2, 55, 45), (2, 56, 60), (2, 57, 60), (2, 58, 200),
-- Recipe 3: Caravel Mayna Cannon
(3, 11, 1), (3, 59, 180), (3, 57, 60), (3, 58, 200), (3, 60, 180),
-- Recipe 4: Caravel Stratus Wind Sail
(4, 12, 1), (4, 52, 40), (4, 61, 30), (4, 51, 80), (4, 62, 30),
-- Recipe 5: Galleass Black Dragon Prow
(5, 13, 1), (5, 52, 50), (5, 53, 300), (5, 51, 125), (5, 54, 150),
-- Recipe 6: Galleass Upgraded Plating
(6, 14, 1), (6, 55, 45), (6, 56, 60), (6, 57, 60), (6, 58, 200),
-- Recipe 7: Galleass Mayna Cannon
(7, 15, 1), (7, 59, 180), (7, 57, 60), (7, 58, 200), (7, 60, 180),
-- Recipe 8: Galleass Stratus Wind Sail
(8, 16, 1), (8, 52, 40), (8, 61, 30), (8, 51, 80), (8, 62, 30),
-- Recipe 9: Sheekulo Dark Plating
(9, 25, 1), (9, 35, 10), (9, 68, 100), (9, 69, 100), (9, 70, 100), (9, 34, 1),
-- Recipe 10: Sheekulo Wind Sail
(10, 26, 1), (10, 36, 10), (10, 68, 100), (10, 69, 100), (10, 70, 100), (10, 34, 1),
-- Recipe 11: Sheekulo Prow
(11, 27, 1), (11, 37, 10), (11, 68, 100), (11, 69, 100), (11, 70, 100), (11, 34, 1),
-- Recipe 12: Sheekulo Cannon
(12, 28, 1), (12, 38, 10), (12, 68, 100), (12, 69, 100), (12, 70, 100), (12, 34, 1),
-- Recipe 13: Dawn Black Stone
(13, 74, 1), (13, 75, 1), (13, 77, 10)
ON CONFLICT (recipe_id, item_id) DO NOTHING;

-- ================================================
-- ENHANCEMENTS
-- ================================================
INSERT INTO enhancements (base_item_id, level_from, level_to, result_item_id, stone_item_id) VALUES
-- Old Epheria 0→+10 (Nymph Absorption Black Stone, 55 needed)
(1, 0, 10, 5, 71), (2, 0, 10, 6, 71), (3, 0, 10, 7, 71), (4, 0, 10, 8, 71),
-- Caravel base: 0→5 (Warm), 6→10 (Cold)
(9, 0, 5, 9, 72), (9, 6, 10, 9, 73),
(10, 0, 5, 10, 72), (10, 6, 10, 10, 73),
(11, 0, 5, 11, 72), (11, 6, 10, 11, 73),
(12, 0, 5, 12, 72), (12, 6, 10, 12, 73),
-- Galleass base: 0→5 (Warm), 6→10 (Cold)
(13, 0, 5, 13, 72), (13, 6, 10, 13, 73),
(14, 0, 5, 14, 72), (14, 6, 10, 14, 73),
(15, 0, 5, 15, 72), (15, 6, 10, 15, 73),
(16, 0, 5, 16, 72), (16, 6, 10, 16, 73),
-- Tolo: 0→5 (Sunlit), 6→10 (Moonlit)
(25, 0, 5, 25, 74), (25, 6, 10, 25, 75),
(26, 0, 5, 26, 74), (26, 6, 10, 26, 75),
(27, 0, 5, 27, 74), (27, 6, 10, 27, 75),
(28, 0, 5, 28, 74), (28, 6, 10, 28, 75),
-- Sheekulo: 0→10 (Dawn Black Stone)
(29, 0, 5, 29, 76), (29, 6, 10, 29, 76),
(30, 0, 5, 30, 76), (30, 6, 10, 30, 76),
(31, 0, 5, 31, 76), (31, 6, 10, 31, 76),
(32, 0, 5, 32, 76), (32, 6, 10, 32, 76)
ON CONFLICT DO NOTHING;
