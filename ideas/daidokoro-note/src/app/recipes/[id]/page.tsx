'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { RecipeForm } from '@/components/RecipeForm';
import { Recipe, CATEGORY_LABELS } from '@/types';
import {
  getRecipeById,
  updateRecipe,
  deleteRecipe,
  addCookingHistory,
} from '@/lib/storage';

export default function RecipeDetailPage() {
  const router = useRouter();
  const params = useParams();
  const id = params.id as string;

  const [recipe, setRecipe] = useState<Recipe | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showCookedMessage, setShowCookedMessage] = useState(false);

  useEffect(() => {
    const data = getRecipeById(id);
    if (data) {
      setRecipe(data);
    } else {
      router.push('/');
    }
  }, [id, router]);

  if (!recipe) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted">読み込み中...</div>
      </div>
    );
  }

  const handleUpdate = (data: Omit<Recipe, 'id' | 'createdAt' | 'cookedCount'>) => {
    const updated = updateRecipe(id, data);
    if (updated) {
      setRecipe(updated);
      setIsEditModalOpen(false);
    }
  };

  const handleDelete = () => {
    deleteRecipe(id);
    router.push('/');
  };

  const handleCooked = () => {
    addCookingHistory({
      recipeId: recipe.id,
      title: recipe.title,
      date: new Date().toISOString(),
    });

    // Update local state
    setRecipe({ ...recipe, cookedCount: recipe.cookedCount + 1 });

    // Show message
    setShowCookedMessage(true);
    setTimeout(() => setShowCookedMessage(false), 2000);
  };

  return (
    <div>
      {/* ヘッダー */}
      <header className="sticky top-0 z-10 bg-background border-b border-border px-4 py-3">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-1 rounded-full hover:bg-accent transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-lg font-bold truncate">{recipe.title}</h1>
          <button
            onClick={() => setIsEditModalOpen(true)}
            className="p-1 rounded-full hover:bg-accent transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>
        </div>
      </header>

      {/* 画像 */}
      {recipe.images.length > 0 && (
        <div className="relative">
          <div className="relative bg-accent">
            <img
              src={recipe.images[currentImageIndex]}
              alt={recipe.title}
              className="w-full h-auto object-contain"
            />
          </div>
          {recipe.images.length > 1 && (
            <>
              <button
                onClick={() => setCurrentImageIndex((i) => (i > 0 ? i - 1 : recipe.images.length - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              <button
                onClick={() => setCurrentImageIndex((i) => (i < recipe.images.length - 1 ? i + 1 : 0))}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/50 rounded-full text-white"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
                {recipe.images.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    className={`w-2 h-2 rounded-full transition-colors ${i === currentImageIndex ? 'bg-white' : 'bg-white/50'
                      }`}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* 情報 */}
      <div className="p-4 space-y-6">
        {/* カテゴリ・作った回数 */}
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 bg-accent text-secondary text-sm rounded-full">
            {CATEGORY_LABELS[recipe.category]}
          </span>
          {recipe.cookedCount > 0 && (
            <span className="text-sm text-muted">
              {recipe.cookedCount}回作りました
            </span>
          )}
        </div>

        {/* X投稿リンク */}
        {recipe.sourceUrl && (
          <a
            href={recipe.sourceUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-primary hover:underline"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
            </svg>
            元の投稿を見る
          </a>
        )}

        {/* 材料 */}
        <div>
          <h2 className="text-lg font-bold mb-2">材料</h2>
          <ul className="space-y-1">
            {recipe.ingredients.map((ingredient, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="text-primary mt-1">•</span>
                <span>{ingredient}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* 作り方 */}
        <div>
          <h2 className="text-lg font-bold mb-2">作り方</h2>
          <ol className="space-y-3">
            {recipe.steps.map((step, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center text-sm">
                  {i + 1}
                </span>
                <span className="flex-1 pt-0.5">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        {/* アクション */}
        <div className="flex gap-2 pt-4">
          <Button
            variant="outline"
            className="flex-1"
            onClick={() => setIsDeleteModalOpen(true)}
          >
            削除
          </Button>
          <Button className="flex-1" onClick={handleCooked}>
            作った！
          </Button>
        </div>
      </div>

      {/* 作ったメッセージ */}
      {showCookedMessage && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 px-4 py-2 bg-primary text-white rounded-full shadow-lg animate-bounce">
          記録しました！
        </div>
      )}

      {/* 編集モーダル */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="レシピを編集"
      >
        <RecipeForm
          initialData={{
            title: recipe.title,
            ingredients: recipe.ingredients,
            steps: recipe.steps,
            images: recipe.images,
            category: recipe.category,
            source: recipe.source,
            sourceUrl: recipe.sourceUrl,
          }}
          onSubmit={handleUpdate}
          onCancel={() => setIsEditModalOpen(false)}
          submitLabel="更新する"
        />
      </Modal>

      {/* 削除確認モーダル */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="レシピを削除"
      >
        <div className="space-y-4">
          <p>「{recipe.title}」を削除しますか？</p>
          <p className="text-sm text-muted">この操作は取り消せません。</p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setIsDeleteModalOpen(false)}
            >
              キャンセル
            </Button>
            <Button variant="danger" className="flex-1" onClick={handleDelete}>
              削除する
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
