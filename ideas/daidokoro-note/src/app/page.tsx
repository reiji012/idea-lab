'use client';

import { useState, useEffect, useMemo } from 'react';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { RecipeCard } from '@/components/RecipeCard';
import { RecipeForm } from '@/components/RecipeForm';
import { Recipe, RecipeCategory, CATEGORY_LABELS } from '@/types';
import {
  getRecipes,
  addRecipe,
  getFridgeIngredients,
  getRecommendedRecipes,
} from '@/lib/storage';

export default function HomePage() {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<RecipeCategory | 'all' | 'recommended'>('all');
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [hasFridgeItems, setHasFridgeItems] = useState(false);

  useEffect(() => {
    setRecipes(getRecipes());
    const fridge = getFridgeIngredients();
    setHasFridgeItems(fridge.length > 0);
    if (fridge.length > 0) {
      setRecommendedRecipes(getRecommendedRecipes());
    }
  }, []);

  const filteredRecipes = useMemo(() => {
    let result = selectedCategory === 'recommended' ? recommendedRecipes : recipes;

    // カテゴリフィルタ
    if (selectedCategory !== 'all' && selectedCategory !== 'recommended') {
      result = result.filter((r) => r.category === selectedCategory);
    }

    // テキスト検索
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (r) =>
          r.title.toLowerCase().includes(query) ||
          r.ingredients.some((ing) => ing.toLowerCase().includes(query))
      );
    }

    return result;
  }, [recipes, recommendedRecipes, selectedCategory, searchQuery]);

  const handleAddRecipe = (data: Omit<Recipe, 'id' | 'createdAt' | 'cookedCount'>) => {
    const newRecipe = addRecipe(data);
    setRecipes([newRecipe, ...recipes]);
    setIsModalOpen(false);
  };

  return (
    <div>
      <Header
        title="レシピ PLUS"
        rightAction={
          <Button size="sm" onClick={() => setIsModalOpen(true)}>
            新規登録
          </Button>
        }
      />

      {/* 検索 */}
      <div className="px-4 py-3 space-y-3">
        <div className="relative">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="レシピ名・食材で検索"
            className="w-full pl-10 pr-4 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
        </div>

        {/* カテゴリフィルタ */}
        <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
          {hasFridgeItems && (
            <button
              onClick={() => setSelectedCategory('recommended')}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === 'recommended'
                  ? 'bg-primary text-white'
                  : 'bg-accent text-secondary hover:bg-border'
                }`}
            >
              おすすめ
            </button>
          )}
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === 'all'
                ? 'bg-primary text-white'
                : 'bg-accent text-secondary hover:bg-border'
              }`}
          >
            すべて
          </button>
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <button
              key={key}
              onClick={() => setSelectedCategory(key as RecipeCategory)}
              className={`px-3 py-1.5 rounded-full text-sm whitespace-nowrap transition-colors ${selectedCategory === key
                  ? 'bg-primary text-white'
                  : 'bg-accent text-secondary hover:bg-border'
                }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* レシピ一覧 */}
      <div className="px-4 pb-4">
        {filteredRecipes.length === 0 ? (
          <div className="py-12 text-center">
            <div className="text-muted mb-4">
              <svg
                className="w-16 h-16 mx-auto"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                />
              </svg>
            </div>
            {selectedCategory === 'recommended' ? (
              <>
                <p className="text-foreground font-medium">
                  冷蔵庫の食材で作れるレシピがありません
                </p>
                <p className="text-sm text-muted mt-1">
                  レシピを追加するか、冷蔵庫の食材を更新してください
                </p>
              </>
            ) : recipes.length === 0 ? (
              <>
                <p className="text-foreground font-medium">
                  レシピがまだありません
                </p>
                <p className="text-sm text-muted mt-1">
                  「新規登録」からレシピを追加しましょう
                </p>
              </>
            ) : (
              <>
                <p className="text-foreground font-medium">
                  該当するレシピがありません
                </p>
                <p className="text-sm text-muted mt-1">
                  検索条件を変更してください
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {filteredRecipes.map((recipe) => (
              <RecipeCard key={recipe.id} recipe={recipe} />
            ))}
          </div>
        )}
      </div>

      {/* 登録モーダル */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="レシピを登録"
      >
        <RecipeForm
          onSubmit={handleAddRecipe}
          onCancel={() => setIsModalOpen(false)}
        />
      </Modal>
    </div>
  );
}
