// レシピのソース（登録元）
export type RecipeSource = 'x' | 'book' | 'original' | 'history';

// レシピカテゴリ
export type RecipeCategory =
  | 'main'      // メイン料理
  | 'side'      // 副菜
  | 'soup'      // スープ・汁物
  | 'salad'     // サラダ
  | 'pasta'     // パスタ
  | 'rice'      // ご飯もの
  | 'curry'     // カレー
  | 'noodle'    // 麺類
  | 'other';    // その他

export const CATEGORY_LABELS: Record<RecipeCategory, string> = {
  main: 'メイン料理',
  side: '副菜',
  soup: 'スープ・汁物',
  salad: 'サラダ',
  pasta: 'パスタ',
  rice: 'ご飯もの',
  curry: 'カレー',
  noodle: '麺類',
  other: 'その他',
};

// レシピ
export interface Recipe {
  id: string;
  title: string;
  ingredients: string[];      // 材料リスト
  steps: string[];            // 作り方（ステップ）
  images: string[];           // Base64画像（最大4枚）
  source: RecipeSource;       // 登録元
  sourceUrl?: string;         // X投稿のURL等
  category: RecipeCategory;
  createdAt: string;          // ISO日付
  cookedCount: number;        // 作った回数
}

// 冷蔵庫の食材
export interface FridgeIngredient {
  id: string;
  name: string;
  addedAt: string;            // ISO日付
}

// 調理履歴
export interface CookingHistory {
  id: string;
  recipeId?: string;          // レシピを使った場合
  title: string;              // 料理名
  ingredients?: string[];     // 自由記録の場合の材料
  steps?: string[];           // 自由記録の場合の作り方
  images?: string[];          // 画像
  date: string;               // 調理日（ISO日付）
  note?: string;              // メモ
}

// ストレージのキー
export const STORAGE_KEYS = {
  RECIPES: 'daidokoro-recipes',
  FRIDGE: 'daidokoro-fridge',
  HISTORY: 'daidokoro-history',
  INGREDIENT_HISTORY: 'daidokoro-ingredient-history', // 過去に登録した食材名
} as const;
