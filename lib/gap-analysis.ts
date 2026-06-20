export type GapRow = {
  itemId:        number
  name:          string
  nameTh:        string | null
  grade:         string
  category:      string
  imageUrl:      string | null
  crowCoinPrice: number | null
  needed:        number
  have:          number
  missing:       number
  progressPct:   number // 0-100
}

/** GapRow with optional sub-ingredients (equipment items when missing). */
export type GapTreeRow = GapRow & {
  subRows: GapRow[]
}

type RecipeInfo = {
  recipeId:  number
  outputQty: number
}

type Ingredient = {
  itemId: number
  qty:    number
}

type ItemMeta = {
  name:          string
  nameTh:        string | null
  grade:         string
  category:      string
  imageUrl:      string | null
  crowCoinPrice: number | null
}

type ItemMetaInput = {
  item_id:         number
  name:            string
  name_th:         string | null
  grade:           string
  category:        string
  image_url?:      string | null
  crow_coin_price?: number | null
}

/**
 * Expand itemId × qty into a flat map of leaf itemId → totalQty.
 * When stopAtEquipment is true, equipment items are treated as leaves
 * (not recursively expanded), so they appear as direct needs.
 */
function expand(
  itemId:          number,
  qty:             number,
  recipeMap:       Map<number, RecipeInfo>,
  ingredientMap:   Map<number, Ingredient[]>,
  metaMap:         Map<number, ItemMeta>,
  visited:         Set<number>,
  stopAtEquipment = false,
  depth           = 0,
): Map<number, number> {
  if (visited.has(itemId)) return new Map([[itemId, qty]])

  // Stop expanding equipment sub-ingredients (but always expand the root target)
  if (stopAtEquipment && depth > 0 && metaMap.get(itemId)?.category === 'equipment') {
    return new Map([[itemId, qty]])
  }

  const recipe = recipeMap.get(itemId)
  if (!recipe) return new Map([[itemId, qty]])

  const next    = new Set(visited)
  next.add(itemId)

  const result   = new Map<number, number>()
  const batches  = Math.ceil(qty / recipe.outputQty)
  const children = ingredientMap.get(recipe.recipeId) ?? []

  for (const ing of children) {
    const sub = expand(ing.itemId, ing.qty * batches, recipeMap, ingredientMap, metaMap, next, stopAtEquipment, depth + 1)
    for (const [id, n] of sub) {
      result.set(id, (result.get(id) ?? 0) + n)
    }
  }

  return result
}

function buildMaps(
  recipes:     { recipe_id: number; output_item_id: number; output_qty: number }[],
  ingredients: { recipe_id: number; item_id: number; qty: number }[],
  inventory:   { item_id: number; qty_have: number }[],
  itemMeta:    ItemMetaInput[],
) {
  const recipeMap     = new Map<number, RecipeInfo>()
  const ingredientMap = new Map<number, Ingredient[]>()
  for (const r of recipes) {
    recipeMap.set(r.output_item_id, { recipeId: r.recipe_id, outputQty: r.output_qty })
  }
  for (const ing of ingredients) {
    const list = ingredientMap.get(ing.recipe_id) ?? []
    list.push({ itemId: ing.item_id, qty: ing.qty })
    ingredientMap.set(ing.recipe_id, list)
  }
  const inventoryMap = new Map<number, number>()
  for (const inv of inventory) {
    inventoryMap.set(inv.item_id, inv.qty_have)
  }
  const metaMap = new Map<number, ItemMeta>()
  for (const m of itemMeta) {
    metaMap.set(m.item_id, {
      name:          m.name,
      nameTh:        m.name_th,
      grade:         m.grade,
      category:      m.category,
      imageUrl:      m.image_url ?? null,
      crowCoinPrice: m.crow_coin_price ?? null,
    })
  }
  return { recipeMap, ingredientMap, inventoryMap, metaMap }
}

function makeGapRow(
  itemId:       number,
  needed:       number,
  inventoryMap: Map<number, number>,
  metaMap:      Map<number, ItemMeta>,
): GapRow {
  const meta  = metaMap.get(itemId)
  const have  = inventoryMap.get(itemId) ?? 0
  const miss  = Math.max(0, needed - have)
  return {
    itemId,
    name:          meta?.name          ?? `Item #${itemId}`,
    nameTh:        meta?.nameTh        ?? null,
    grade:         meta?.grade         ?? 'white',
    category:      meta?.category      ?? 'material',
    imageUrl:      meta?.imageUrl      ?? null,
    crowCoinPrice: meta?.crowCoinPrice ?? null,
    needed,
    have,
    missing:       miss,
    progressPct:   needed === 0 ? 100 : Math.min(100, Math.round((have / needed) * 100)),
  }
}

/**
 * Like makeGapRow but deducts from allocatedMap so shared materials are not
 * double-counted across multiple equipment sub-recipes in the same tree pass.
 * Mutates allocatedMap by claiming min(have, needed) for itemId.
 */
function makeGapRowAlloc(
  itemId:       number,
  needed:       number,
  inventoryMap: Map<number, number>,
  metaMap:      Map<number, ItemMeta>,
  allocatedMap: Map<number, number>,
): GapRow {
  const meta  = metaMap.get(itemId)
  const raw   = inventoryMap.get(itemId) ?? 0
  const used  = allocatedMap.get(itemId) ?? 0
  const have  = Math.max(0, raw - used)
  const miss  = Math.max(0, needed - have)
  allocatedMap.set(itemId, used + Math.min(have, needed))
  return {
    itemId,
    name:          meta?.name          ?? `Item #${itemId}`,
    nameTh:        meta?.nameTh        ?? null,
    grade:         meta?.grade         ?? 'white',
    category:      meta?.category      ?? 'material',
    imageUrl:      meta?.imageUrl      ?? null,
    crowCoinPrice: meta?.crowCoinPrice ?? null,
    needed,
    have,
    missing:       miss,
    progressPct:   needed === 0 ? 100 : Math.min(100, Math.round((have / needed) * 100)),
  }
}

/**
 * Flat gap analysis — expands recipe tree fully, treating equipment as leaves.
 * Used for combined-materials view and equipment-goal summary.
 */
export function computeGap(params: {
  targetItemId:  number
  targetQty:     number
  recipes:       { recipe_id: number; output_item_id: number; output_qty: number }[]
  ingredients:   { recipe_id: number; item_id: number; qty: number }[]
  inventory:     { item_id: number; qty_have: number }[]
  itemMeta:      ItemMetaInput[]
}): GapRow[] {
  const { targetItemId, targetQty, recipes, ingredients, inventory, itemMeta } = params
  const { recipeMap, ingredientMap, inventoryMap, metaMap } = buildMaps(recipes, ingredients, inventory, itemMeta)

  const rawNeeds = expand(targetItemId, targetQty, recipeMap, ingredientMap, metaMap, new Set(), true)

  const rows: GapRow[] = []
  for (const [id, needed] of rawNeeds) {
    rows.push(makeGapRow(id, needed, inventoryMap, metaMap))
  }

  return rows.sort((a, b) => {
    if (a.missing !== b.missing) return b.missing - a.missing
    return a.category.localeCompare(b.category)
  })
}

/**
 * Tree gap analysis — shows direct recipe ingredients at the top level.
 * Equipment items get `subRows` populated when they are missing,
 * showing what is needed to obtain them. Use in goal-detail view.
 */
export function computeGapTree(params: {
  targetItemId: number
  targetQty:    number
  recipes:      { recipe_id: number; output_item_id: number; output_qty: number }[]
  ingredients:  { recipe_id: number; item_id: number; qty: number }[]
  inventory:    { item_id: number; qty_have: number }[]
  itemMeta:     ItemMetaInput[]
}): GapTreeRow[] {
  const { targetItemId, targetQty, recipes, ingredients, inventory, itemMeta } = params
  const { recipeMap, ingredientMap, inventoryMap, metaMap } = buildMaps(recipes, ingredients, inventory, itemMeta)

  const targetRecipe = recipeMap.get(targetItemId)
  if (!targetRecipe) {
    return [{ ...makeGapRow(targetItemId, targetQty, inventoryMap, metaMap), subRows: [] }]
  }

  const batches        = Math.ceil(targetQty / targetRecipe.outputQty)
  const directChildren = ingredientMap.get(targetRecipe.recipeId) ?? []

  // Shared allocation tracker — prevents the same inventory units from being
  // counted as "available" for more than one equipment sub-recipe.
  const allocatedMap = new Map<number, number>()

  const rows: GapTreeRow[] = []

  for (const child of directChildren) {
    const childQty = child.qty * batches
    const row      = makeGapRowAlloc(child.itemId, childQty, inventoryMap, metaMap, allocatedMap)
    const meta     = metaMap.get(child.itemId)

    const subRows: GapRow[] = []

    if (meta?.category === 'equipment' && row.missing > 0 && recipeMap.has(child.itemId)) {
      // Expand equipment's sub-recipe (fully, including nested equipment) to show upgrade path
      const sub = expand(child.itemId, row.missing, recipeMap, ingredientMap, metaMap, new Set(), false)
      for (const [subId, subQty] of sub) {
        if (subId === child.itemId) continue
        subRows.push(makeGapRowAlloc(subId, subQty, inventoryMap, metaMap, allocatedMap))
      }
      subRows.sort((a, b) => b.missing - a.missing || a.category.localeCompare(b.category))
    }

    rows.push({ ...row, subRows })
  }

  return rows.sort((a, b) => {
    if (a.missing !== b.missing) return b.missing - a.missing
    return a.category.localeCompare(b.category)
  })
}

export function overallProgress(rows: GapRow[]): number {
  if (rows.length === 0) return 100
  const sum = rows.reduce((acc, r) => acc + r.progressPct, 0)
  return Math.round(sum / rows.length)
}

/** Merge gap rows from multiple goals. `needed` is summed; `have` is from the first occurrence. */
export function mergeGaps(allRowArrays: GapRow[][]): GapRow[] {
  const merged = new Map<number, GapRow>()
  for (const rows of allRowArrays) {
    for (const row of rows) {
      const existing = merged.get(row.itemId)
      if (existing) {
        const totalNeeded = existing.needed + row.needed
        const have        = existing.have
        const missing     = Math.max(0, totalNeeded - have)
        merged.set(row.itemId, {
          ...existing,
          imageUrl:      existing.imageUrl      ?? row.imageUrl,
          crowCoinPrice: existing.crowCoinPrice ?? row.crowCoinPrice,
          needed:      totalNeeded,
          missing,
          progressPct: totalNeeded === 0 ? 100 : Math.min(100, Math.round((have / totalNeeded) * 100)),
        })
      } else {
        merged.set(row.itemId, { ...row })
      }
    }
  }
  return Array.from(merged.values()).sort((a, b) => {
    if (a.missing !== b.missing) return b.missing - a.missing
    return a.category.localeCompare(b.category)
  })
}
