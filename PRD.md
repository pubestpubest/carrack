# PRD — BDO Epheria Carrack Crafting Tracker

## Overview

A web application that helps Black Desert Online (BDO) players track their progress toward crafting the Epheria Carrack ship. Players select a target ship/item, the system compares required materials against the player's current inventory, generates a todo list of what's still needed, and shows real-time progress.

---

## Problem

Crafting a Carrack in BDO requires hundreds of materials across a multi-stage progression (Basic Ship → Modified → Pre-Carrack → Carrack → Seezily Accessories). Players currently track this manually via spreadsheets or memory, with no automatic gap analysis or progress visibility.

---

## Goals

- Let users set a crafting target and immediately see what materials they're missing
- Auto-generate todos from the gap between inventory and recipe requirements
- Track progress as a percentage, updating live when inventory changes
- Support multiple users sharing a workspace (guild/group crafting)
- Support multi-step recipe chains (materials that are themselves crafted from sub-materials)

## Non-Goals

- Real-time BDO game API integration (manual inventory updates only, for now)
- Marketplace price tracking or profit optimization
- Guild management beyond workspace roles

---

## Users

**Primary**: BDO players actively building toward a Carrack who want to track materials and progress.

**Secondary**: Guild officers coordinating shared crafting across multiple members.

---

## User Stories

**Core loop**
- As a player, I want to select "Carrack: Advance" as my goal so the system shows me every material required down to raw ingredients.
- As a player, I want to update my inventory when I gather materials so my progress % updates immediately.
- As a player, I want to see a todo list of missing materials, auto-generated from the gap between what I need and what I have.
- As a player, I want to confirm a craft when I have all materials, so inventory is debited and the output item is credited atomically.

**Progression**
- As a player, I want to browse ships and items by category/grade to understand the progression path.
- As a player, I want to see each item's acquisition methods (buy, craft, daily quest, trade exchange) so I can choose the most efficient route.
- As a player, I want sub-recipes expanded automatically (e.g., a blue accessory's recipe shows all its nested material requirements).

**Multi-user**
- As a guild officer (Owner), I want to invite members to a shared workspace so we can track collective inventory.
- As a member (Editor), I want to update shared inventory when I contribute materials.
- As a viewer, I want to see the workspace's progress without being able to modify anything.

---

## Core Features

### F1 — Goal Selection
User picks a target item (ship or equipment) and quantity. System recursively expands all recipe layers and returns the full flat list of raw materials required.

### F2 — Inventory Management
CRUD for items in the user's inventory. Every change is logged with timestamp and actor. Inventory quantity cannot go negative.

### F3 — Gap Analysis
`needed = recipe_qty × target_qty`  
`missing = max(0, needed − have)`  
Calculated on demand and shown per material.

### F4 — Auto Todo Generation
Each `missing` entry becomes a todo item ("Obtain X × N"). Todos for daily quests (e.g., Ravina dailies) are tagged with their yield per day and days remaining. Ordering respects recipe prerequisites.

### F5 — Progress Tracking
Per-item progress: `have / needed` as %.  
Overall goal progress: average across all required materials.  
Auto-marks goal as complete when all materials are satisfied.

### F6 — Craft Execution
When materials are sufficient, user can trigger a craft: system atomically removes ingredients from inventory and adds the output item. Fails entirely if any ingredient is short.

### F7 — Ship & Item Catalogue
Browsable catalogue of all items, ships, and recipes. Each ship shows its stats (speed, acceleration, turn, brake, hp, weight, inventory slots, cannon specs) and acquisition path. Items show grade, tier, and all acquisition methods.

### F8 — Workspace & Roles
Workspaces isolate data per group. One user can belong to multiple workspaces. Roles: Owner (manage members, delete workspace), Editor (modify inventory/todos/recipes), Viewer (read-only).

---

## Ship Progression

```
เรือสำเภา/ฟริเกตเอเฟเรีย (Basic)
    ↓  [Section 7 recipe]
เวอร์ชันดัดแปลง (Modified)
    ↓  [Section 8 recipe]
เรือการค้า / แกลลีย์เอเฟเรีย (Pre-Carrack)
    ↓  [Section 9 — blue accessories]
    ↓  [Section 10 — Carrack upgrade]
เรือคาร์แร็คเอเฟเรีย (4 variants: สมดุล / ฉุกเฉิน / แข็งแกร่ง / ทนทาน)
    ↓  [Section 11 — Seezily blue accessories]
อุปกรณ์ชีโล่ (End-game ship gear)
```

Carrack variants and their base ships:
| Variant | Base Ship | Strength |
|---|---|---|
| สมดุล (Advance) | เรือการค้า | Inventory / weight |
| ฉุกเฉิน (Valor) | เรือแกลลีย์ | Combat / cannon |
| แข็งแกร่ง (Volante) | เรือแกลลีย์ | Speed |
| ทนทาน (Balance) | เรือการค้า | All-round |

---

## Business Rules

1. **No negative inventory** — system rejects any update that would push qty below 0.
2. **No circular recipes** — recipe graph must be a DAG; circular dependencies are rejected at creation.
3. **No circular todos** — task dependencies must be acyclic.
4. **Atomic craft** — debit all ingredients and credit output in a single transaction; roll back entirely on failure.
5. **Durability condition** — blue equipment must be at 100% durability before upgrade. Tracked as a boolean flag on USER_SHIP_PROGRESS, not a quantity.
6. **Daily quest reduction** — Ravina NPC dailies yield ~50% of certain material requirements. The system counts daily quest yield as an acquisition route when computing missing quantities if the user opts in.
7. **Multi-acquisition choice** — when a material has multiple acquisition methods, the user selects their preferred route; the system records it and filters todos accordingly.
8. **All changes audited** — every inventory mutation records user_id, timestamp, delta, and reason.

---

## Data Model (summary)

See `erd.mermaid` for full entity-relationship diagram. Key entities:

| Entity | Purpose |
|---|---|
| ITEM | Every game item (equipment, material, stone, license, currency) with grade, tier, image |
| SHIP | Ship stat block (speed, HP, cannons, etc.) keyed to a SHIP_STAGE |
| SHIP_STAGE | Ship progression tier and variant |
| RECIPE | Craft/convert/upgrade instructions |
| RECIPE_INGREDIENT | Materials consumed per recipe |
| ACQUISITION_METHOD | How each item can be obtained |
| TRADE_EXCHANGE | Barter exchange rates (tier-gated) |
| ENHANCEMENT | Stone-based equipment upgrade paths |
| USER | Auth only (username, password_hash) |
| USER_INVENTORY | Per-user item quantities |
| USER_SHIP_PROGRESS | Which stages a user has completed |
| USER_RECIPE_LOG | Craft history |

---

## User Flow

```
Login
  → Select workspace (or create one)
  → Browse catalogue or set goal directly
  → Set goal: pick target item + qty
       → System expands recipe tree
       → Gap analysis runs
       → Todo list generated
  → Work on todos (gather materials, run dailies)
  → Update inventory as materials are acquired
       → Progress % updates live
  → When materials complete → trigger craft
       → Inventory atomically updated
  → Repeat for next stage in progression
```

---

## Out of Scope (v1)

- Automated inventory sync from BDO game client
- Price/silver optimization suggestions
- Mobile native app (web responsive only)
- Social/public profile pages
- Trading or transferring inventory between workspaces
