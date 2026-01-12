'use client';

import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { RecipeCard } from '@/components/RecipeCard';
import { FridgeIngredient, Recipe } from '@/types';
import {
  getFridgeIngredients,
  addFridgeIngredient,
  deleteFridgeIngredient,
  getIngredientHistory,
  getRecommendedRecipes,
} from '@/lib/storage';

export default function FridgePage() {
  const [ingredients, setIngredients] = useState<FridgeIngredient[]>([]);
  const [recommendedRecipes, setRecommendedRecipes] = useState<Recipe[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newIngredient, setNewIngredient] = useState('');
  const [ingredientHistory, setIngredientHistory] = useState<string[]>([]);
  const [showReceipt, setShowReceipt] = useState(false);

  useEffect(() => {
    setIngredients(getFridgeIngredients());
    setIngredientHistory(getIngredientHistory());
    setRecommendedRecipes(getRecommendedRecipes());
  }, []);

  const filteredHistory = useMemo(() => {
    if (!newIngredient) return ingredientHistory.slice(0, 10);
    return ingredientHistory
      .filter((h) => h.toLowerCase().includes(newIngredient.toLowerCase()))
      .slice(0, 10);
  }, [ingredientHistory, newIngredient]);

  const handleAddIngredient = (name: string) => {
    if (!name.trim()) return;

    const newItem = addFridgeIngredient(name.trim());
    setIngredients([newItem, ...ingredients]);
    setNewIngredient('');
    setIngredientHistory(getIngredientHistory());
    setRecommendedRecipes(getRecommendedRecipes());
  };

  const handleDeleteIngredient = (id: string) => {
    deleteFridgeIngredient(id);
    const updated = ingredients.filter((i) => i.id !== id);
    setIngredients(updated);
    setRecommendedRecipes(getRecommendedRecipes());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  };

  return (
    <div>
      <Header
        title="冷蔵庫の中身"
        rightAction={
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            追加
          </Button>
        }
      />

      <div className="p-4 space-y-6">
        {/* 食材リスト */}
        <div>
          <h2 className="text-sm font-medium text-muted mb-2">
            登録中の食材（{ingredients.length}件）
          </h2>

          {ingredients.length === 0 ? (
            <div className="py-8 text-center">
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
                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"
                  />
                </svg>
              </div>
              <p className="text-foreground font-medium">食材が登録されていません</p>
              <p className="text-sm text-muted mt-1">
                「追加」から食材を登録しましょう
              </p>
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              {ingredients.map((ingredient) => (
                <div
                  key={ingredient.id}
                  className="flex items-center gap-1 px-3 py-1.5 bg-accent rounded-full group"
                >
                  <span className="text-sm">{ingredient.name}</span>
                  <span className="text-xs text-muted">
                    ({formatDate(ingredient.addedAt)})
                  </span>
                  <button
                    onClick={() => handleDeleteIngredient(ingredient.id)}
                    className="ml-1 p-0.5 text-muted hover:text-red-500 transition-colors"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* おすすめレシピ */}
        {ingredients.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-medium text-muted">
                冷蔵庫の食材で作れるレシピ
              </h2>
              {recommendedRecipes.length > 4 && (
                <Link href="/?filter=recommended" className="text-sm text-primary">
                  すべて見る
                </Link>
              )}
            </div>

            {recommendedRecipes.length === 0 ? (
              <div className="py-6 text-center bg-accent rounded-lg">
                <p className="text-sm text-muted">
                  該当するレシピがありません
                </p>
                <p className="text-xs text-muted mt-1">
                  レシピを追加してみましょう
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {recommendedRecipes.slice(0, 4).map((recipe) => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 追加モーダル */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setShowReceipt(false);
          setNewIngredient('');
        }}
        title="食材を追加"
      >
        <div className="space-y-4">
          {/* 登録方法選択 */}
          {!showReceipt ? (
            <>
              <button
                onClick={() => setShowReceipt(true)}
                className="w-full p-4 border border-border rounded-lg text-left hover:bg-accent transition-colors"
              >
                <div className="font-medium">レシートから登録</div>
                <div className="text-sm text-muted mt-1">
                  レシート画像をアップロードして一括登録
                </div>
              </button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-muted">または</span>
                </div>
              </div>

              {/* 手動入力 */}
              <div>
                <label className="block text-sm font-medium mb-1">食材名</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newIngredient}
                    onChange={(e) => setNewIngredient(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAddIngredient(newIngredient);
                      }
                    }}
                    placeholder="例: にんじん"
                    className="flex-1 px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                  />
                  <Button onClick={() => handleAddIngredient(newIngredient)}>
                    追加
                  </Button>
                </div>
              </div>

              {/* 履歴から選択 */}
              {filteredHistory.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-muted mb-2">
                    {newIngredient ? '候補' : '最近登録した食材'}
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {filteredHistory.map((item) => (
                      <button
                        key={item}
                        onClick={() => handleAddIngredient(item)}
                        className="px-3 py-1.5 bg-accent text-sm rounded-full hover:bg-border transition-colors"
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            /* レシート登録（モック） */
            <div className="space-y-4">
              <div className="p-4 bg-accent rounded-lg text-center">
                <svg
                  className="w-12 h-12 mx-auto text-muted mb-2"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
                <p className="text-sm text-muted">
                  レシート画像認識機能は準備中です
                </p>
                <p className="text-xs text-muted mt-1">
                  手動で食材を入力してください
                </p>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => setShowReceipt(false)}
              >
                手動で入力する
              </Button>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
