import type { Product } from "../types/domain";

export function decodeProductDescription(value?: string | null): string {
  return (value || "").replace(/\\n/g, "\n");
}

export function toGramAmount(requiredAmount: string, unit: string): number | null {
  const amount = Number(requiredAmount);
  if (!Number.isFinite(amount) || amount < 0) return null;

  const normalizedUnit = (unit || "").trim().toLowerCase();
  if (/^(kg|公斤|千克)$/.test(normalizedUnit)) return amount * 1000;
  if (/^(g|gram|grams|公克|克)$/.test(normalizedUnit)) return amount;
  if (/^(mg|毫克)$/.test(normalizedUnit)) return amount / 1000;
  return null;
}

export type SupplementalInfo = { ingredients: string; allergens: string; calories: string };

export function extractSupplementalInfo(product: Product): SupplementalInfo {
  const description = decodeProductDescription(product.description || "");
  const lines = description
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  const parseByKeyword = (regexp: RegExp, fallback: string) => {
    const line = lines.find((value) => regexp.test(value));
    if (!line) return fallback;
    const splitParts = line.split(/[：:]/);
    return (splitParts.length > 1 ? splitParts.slice(1).join(":") : line).trim() || fallback;
  };

  const pis = product.productIngredients ?? [];

  // 成分: use ingredient names from productIngredients when available
  let ingredients: string;
  const piNames = [...new Set(pis.map((pi) => pi.ingredientName).filter(Boolean) as string[])];
  if (piNames.length > 0) {
    const base = (product.ingredients || "").trim();
    ingredients = base ? `${base}（${piNames.join("、")}）` : piNames.join("、");
  } else {
    ingredients = (product.ingredients || "").trim() || parseByKeyword(/^(成分|原料|ingredients?)[\s：:]/i, "尚未提供");
  }

  // 過敏原: collect and deduplicate allergens from all linked productIngredients
  let allergens: string;
  const allergenSet = new Set<string>();
  pis.forEach((pi) => {
    if (pi.allergens?.trim()) {
      pi.allergens.split(/[,，、;；\s]+/).forEach((a) => {
        const trimmed = a.trim();
        if (trimmed) allergenSet.add(trimmed);
      });
    }
  });
  if (allergenSet.size > 0) {
    const base = (product.allergens || "").trim();
    const piAllergens = [...allergenSet].join("、");
    allergens = base ? `${base}、${piAllergens}` : piAllergens;
  } else {
    allergens = (product.allergens || "").trim() || parseByKeyword(/過敏原|allergen/i, "尚未提供");
  }

  // 熱量計算（每份）：
  // 1. 聚合所有材料，依單位換算成公克
  // 2. 每 100g 熱量 ÷ 100 換算成每 1g 熱量
  // 3. 每 1g 熱量 × 該材料用量(g) = 該材料總熱量
  // 4. 加總所有材料熱量 = 整批配方總熱量
  // 5. 整批總熱量 ÷ recipeQuantity = 每份熱量
  let calories: string;
  let totalBatchCalories = 0;
  let hasCalcCalories = false;
  pis.forEach((pi) => {
    const caloriesPer100g = Number(pi.caloriesPer100g);
    if (!Number.isFinite(caloriesPer100g)) return;

    const amountInGrams = toGramAmount(pi.requiredAmount, pi.unit);
    if (amountInGrams == null) return;

    const caloriesPerGram = caloriesPer100g / 100;
    const ingredientCalories = caloriesPerGram * amountInGrams;
    totalBatchCalories += ingredientCalories;
    hasCalcCalories = true;
  });
  if (hasCalcCalories) {
    const recipeQty = Number(product.recipeQuantity);
    const servings = Number.isFinite(recipeQty) && recipeQty > 0 ? recipeQty : 1;
    const perServingCalories = totalBatchCalories / servings;
    calories = `${Math.round(perServingCalories)} kcal`;
  } else {
    const cal = product.calories ?? product.calorie;
    calories = Number.isFinite(cal) ? `${cal} kcal` : parseByKeyword(/熱量|卡路里|kcal/i, "尚未提供");
  }

  return { ingredients, allergens, calories };
}

export function splitInfoTags(value: string): string[] {
  return value === "尚未提供"
    ? []
    : value.split(/[、,，;；]/).map((s) => s.trim()).filter(Boolean);
}
