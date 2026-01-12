import {
  Recipe,
  FridgeIngredient,
  CookingHistory,
  STORAGE_KEYS,
} from '@/types';

// ユーティリティ: IDを生成
export const generateId = (): string => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// ============================================
// レシピ
// ============================================

export const getRecipes = (): Recipe[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.RECIPES);
  return data ? JSON.parse(data) : [];
};

export const saveRecipes = (recipes: Recipe[]): void => {
  localStorage.setItem(STORAGE_KEYS.RECIPES, JSON.stringify(recipes));
};

export const addRecipe = (recipe: Omit<Recipe, 'id' | 'createdAt' | 'cookedCount'>): Recipe => {
  const recipes = getRecipes();
  const newRecipe: Recipe = {
    ...recipe,
    id: generateId(),
    createdAt: new Date().toISOString(),
    cookedCount: 0,
  };
  recipes.unshift(newRecipe);
  saveRecipes(recipes);
  return newRecipe;
};

export const updateRecipe = (id: string, updates: Partial<Recipe>): Recipe | null => {
  const recipes = getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index === -1) return null;
  recipes[index] = { ...recipes[index], ...updates };
  saveRecipes(recipes);
  return recipes[index];
};

export const deleteRecipe = (id: string): boolean => {
  const recipes = getRecipes();
  const filtered = recipes.filter((r) => r.id !== id);
  if (filtered.length === recipes.length) return false;
  saveRecipes(filtered);
  return true;
};

export const getRecipeById = (id: string): Recipe | null => {
  const recipes = getRecipes();
  return recipes.find((r) => r.id === id) || null;
};

export const incrementCookedCount = (id: string): void => {
  const recipes = getRecipes();
  const index = recipes.findIndex((r) => r.id === id);
  if (index !== -1) {
    recipes[index].cookedCount += 1;
    saveRecipes(recipes);
  }
};

// ============================================
// 冷蔵庫の食材
// ============================================

export const getFridgeIngredients = (): FridgeIngredient[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.FRIDGE);
  return data ? JSON.parse(data) : [];
};

export const saveFridgeIngredients = (ingredients: FridgeIngredient[]): void => {
  localStorage.setItem(STORAGE_KEYS.FRIDGE, JSON.stringify(ingredients));
};

export const addFridgeIngredient = (name: string): FridgeIngredient => {
  const ingredients = getFridgeIngredients();
  const newIngredient: FridgeIngredient = {
    id: generateId(),
    name,
    addedAt: new Date().toISOString(),
  };
  ingredients.unshift(newIngredient);
  saveFridgeIngredients(ingredients);

  // 食材履歴にも追加
  addToIngredientHistory(name);

  return newIngredient;
};

export const deleteFridgeIngredient = (id: string): boolean => {
  const ingredients = getFridgeIngredients();
  const filtered = ingredients.filter((i) => i.id !== id);
  if (filtered.length === ingredients.length) return false;
  saveFridgeIngredients(filtered);
  return true;
};

// ============================================
// 食材履歴（過去に登録した食材名の候補）
// ============================================

export const getIngredientHistory = (): string[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.INGREDIENT_HISTORY);
  return data ? JSON.parse(data) : [];
};

export const addToIngredientHistory = (name: string): void => {
  const history = getIngredientHistory();
  if (!history.includes(name)) {
    history.unshift(name);
    // 最大100件まで保持
    const trimmed = history.slice(0, 100);
    localStorage.setItem(STORAGE_KEYS.INGREDIENT_HISTORY, JSON.stringify(trimmed));
  }
};

// ============================================
// 調理履歴
// ============================================

export const getCookingHistory = (): CookingHistory[] => {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(STORAGE_KEYS.HISTORY);
  return data ? JSON.parse(data) : [];
};

export const saveCookingHistory = (history: CookingHistory[]): void => {
  localStorage.setItem(STORAGE_KEYS.HISTORY, JSON.stringify(history));
};

export const addCookingHistory = (
  entry: Omit<CookingHistory, 'id'>
): CookingHistory => {
  const history = getCookingHistory();
  const newEntry: CookingHistory = {
    ...entry,
    id: generateId(),
  };
  history.unshift(newEntry);
  saveCookingHistory(history);

  // レシピを使った場合はカウントを増やす
  if (entry.recipeId) {
    incrementCookedCount(entry.recipeId);
  }

  return newEntry;
};

export const deleteCookingHistory = (id: string): boolean => {
  const history = getCookingHistory();
  const filtered = history.filter((h) => h.id !== id);
  if (filtered.length === history.length) return false;
  saveCookingHistory(filtered);
  return true;
};

// ============================================
// 検索・フィルタリング
// ============================================

// 食材でレシピを検索
export const searchRecipesByIngredients = (
  ingredientNames: string[]
): Recipe[] => {
  if (ingredientNames.length === 0) return getRecipes();

  const recipes = getRecipes();
  return recipes.filter((recipe) =>
    ingredientNames.some((ing) =>
      recipe.ingredients.some((recipeIng) =>
        recipeIng.toLowerCase().includes(ing.toLowerCase())
      )
    )
  );
};

// 冷蔵庫の食材で作れるレシピを取得
export const getRecommendedRecipes = (): Recipe[] => {
  const fridgeIngredients = getFridgeIngredients();
  if (fridgeIngredients.length === 0) return [];

  const ingredientNames = fridgeIngredients.map((i) => i.name);
  const recipes = getRecipes();

  // マッチする食材が多い順にソート
  const recipesWithScore = recipes.map((recipe) => {
    const matchCount = ingredientNames.filter((ing) =>
      recipe.ingredients.some((recipeIng) =>
        recipeIng.toLowerCase().includes(ing.toLowerCase())
      )
    ).length;
    return { recipe, matchCount };
  });

  return recipesWithScore
    .filter((r) => r.matchCount > 0)
    .sort((a, b) => b.matchCount - a.matchCount)
    .map((r) => r.recipe);
};
