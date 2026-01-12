'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/Button';
import { ImageUpload } from '@/components/ImageUpload';
import { CookingHistory, Recipe } from '@/types';
import {
  getCookingHistory,
  addCookingHistory,
  deleteCookingHistory,
  getRecipes,
  getRecipeById,
  addRecipe,
} from '@/lib/storage';

export default function HistoryPage() {
  const [history, setHistory] = useState<CookingHistory[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedHistoryId, setSelectedHistoryId] = useState<string | null>(null);

  // フォーム状態
  const [recordType, setRecordType] = useState<'recipe' | 'free'>('recipe');
  const [selectedRecipeId, setSelectedRecipeId] = useState('');
  const [title, setTitle] = useState('');
  const [ingredientsText, setIngredientsText] = useState('');
  const [stepsText, setStepsText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [note, setNote] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    setHistory(getCookingHistory());
    setRecipes(getRecipes());
  }, []);

  const resetForm = () => {
    setRecordType('recipe');
    setSelectedRecipeId('');
    setTitle('');
    setIngredientsText('');
    setStepsText('');
    setImages([]);
    setNote('');
    setDate(new Date().toISOString().split('T')[0]);
  };

  const handleAddHistory = () => {
    if (recordType === 'recipe') {
      if (!selectedRecipeId) return;
      const recipe = getRecipeById(selectedRecipeId);
      if (!recipe) return;

      const newEntry = addCookingHistory({
        recipeId: selectedRecipeId,
        title: recipe.title,
        date: new Date(date).toISOString(),
        note: note || undefined,
      });
      setHistory([newEntry, ...history]);
    } else {
      if (!title.trim()) return;

      const ingredients = ingredientsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);
      const steps = stepsText
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean);

      const newEntry = addCookingHistory({
        title: title.trim(),
        ingredients: ingredients.length > 0 ? ingredients : undefined,
        steps: steps.length > 0 ? steps : undefined,
        images: images.length > 0 ? images : undefined,
        date: new Date(date).toISOString(),
        note: note || undefined,
      });
      setHistory([newEntry, ...history]);
    }

    setIsAddModalOpen(false);
    resetForm();
  };

  const handleDeleteHistory = (id: string) => {
    deleteCookingHistory(id);
    setHistory(history.filter((h) => h.id !== id));
    setSelectedHistoryId(null);
  };

  const handleConvertToRecipe = (entry: CookingHistory) => {
    if (!entry.ingredients || !entry.steps) return;

    const newRecipe = addRecipe({
      title: entry.title,
      ingredients: entry.ingredients,
      steps: entry.steps,
      images: entry.images || [],
      category: 'other',
      source: 'history',
    });

    setRecipes([newRecipe, ...recipes]);
    setSelectedHistoryId(null);
    alert('レシピとして登録しました！');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const weekDays = ['日', '月', '火', '水', '木', '金', '土'];
    const weekDay = weekDays[date.getDay()];
    return `${year}/${month}/${day}（${weekDay}）`;
  };

  const selectedHistory = history.find((h) => h.id === selectedHistoryId);

  // 日付でグループ化
  const groupedHistory = history.reduce((acc, entry) => {
    const dateKey = formatDate(entry.date);
    if (!acc[dateKey]) {
      acc[dateKey] = [];
    }
    acc[dateKey].push(entry);
    return acc;
  }, {} as Record<string, CookingHistory[]>);

  return (
    <div>
      <Header
        title="記録"
        rightAction={
          <Button size="sm" onClick={() => setIsAddModalOpen(true)}>
            記録する
          </Button>
        }
      />

      <div className="p-4">
        {history.length === 0 ? (
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
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
                />
              </svg>
            </div>
            <p className="text-foreground font-medium">記録がありません</p>
            <p className="text-sm text-muted mt-1">
              「記録する」から今日の料理を記録しましょう
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedHistory).map(([dateKey, entries]) => (
              <div key={dateKey}>
                <h2 className="text-sm font-medium text-muted mb-2">{dateKey}</h2>
                <div className="space-y-2">
                  {entries.map((entry) => (
                    <button
                      key={entry.id}
                      onClick={() => setSelectedHistoryId(entry.id)}
                      className="w-full p-3 bg-white border border-border rounded-lg text-left hover:bg-accent transition-colors"
                    >
                      <div className="flex items-start gap-3">
                        {entry.images && entry.images.length > 0 ? (
                          <img
                            src={entry.images[0]}
                            alt={entry.title}
                            className="w-12 h-12 object-cover rounded"
                          />
                        ) : (
                          <div className="w-12 h-12 bg-accent rounded flex items-center justify-center text-muted">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                            </svg>
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium truncate">{entry.title}</div>
                          {entry.recipeId && (
                            <div className="text-xs text-primary mt-0.5">レシピから</div>
                          )}
                          {entry.note && (
                            <div className="text-sm text-muted mt-1 line-clamp-1">
                              {entry.note}
                            </div>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 記録追加モーダル */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          resetForm();
        }}
        title="記録する"
      >
        <div className="space-y-4">
          {/* 記録タイプ選択 */}
          <div className="flex gap-2">
            <button
              onClick={() => setRecordType('recipe')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                recordType === 'recipe'
                  ? 'bg-primary text-white'
                  : 'bg-accent text-secondary'
              }`}
            >
              レシピから
            </button>
            <button
              onClick={() => setRecordType('free')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${
                recordType === 'free'
                  ? 'bg-primary text-white'
                  : 'bg-accent text-secondary'
              }`}
            >
              自由記録
            </button>
          </div>

          {/* 日付 */}
          <div>
            <label className="block text-sm font-medium mb-1">日付</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>

          {recordType === 'recipe' ? (
            /* レシピから記録 */
            <div>
              <label className="block text-sm font-medium mb-1">レシピを選択</label>
              {recipes.length === 0 ? (
                <div className="p-4 bg-accent rounded-lg text-center">
                  <p className="text-sm text-muted">レシピがありません</p>
                  <Link href="/" className="text-sm text-primary mt-1 inline-block">
                    レシピを追加する
                  </Link>
                </div>
              ) : (
                <select
                  value={selectedRecipeId}
                  onChange={(e) => setSelectedRecipeId(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
                >
                  <option value="">選択してください</option>
                  {recipes.map((recipe) => (
                    <option key={recipe.id} value={recipe.id}>
                      {recipe.title}
                    </option>
                  ))}
                </select>
              )}
            </div>
          ) : (
            /* 自由記録 */
            <>
              <div>
                <label className="block text-sm font-medium mb-1">
                  料理名 <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="例: 野菜炒め"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">画像</label>
                <ImageUpload images={images} onChange={setImages} maxImages={4} />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">材料（任意）</label>
                <textarea
                  value={ingredientsText}
                  onChange={(e) => setIngredientsText(e.target.value)}
                  rows={3}
                  placeholder="1行に1つずつ"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">作り方（任意）</label>
                <textarea
                  value={stepsText}
                  onChange={(e) => setStepsText(e.target.value)}
                  rows={3}
                  placeholder="1行に1ステップずつ"
                  className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
                />
              </div>
            </>
          )}

          {/* メモ */}
          <div>
            <label className="block text-sm font-medium mb-1">メモ（任意）</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="感想や次回への改善点など"
              className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
            />
          </div>

          <Button
            onClick={handleAddHistory}
            className="w-full"
            disabled={recordType === 'recipe' ? !selectedRecipeId : !title.trim()}
          >
            記録する
          </Button>
        </div>
      </Modal>

      {/* 詳細モーダル */}
      <Modal
        isOpen={!!selectedHistoryId}
        onClose={() => setSelectedHistoryId(null)}
        title="記録の詳細"
      >
        {selectedHistory && (
          <div className="space-y-4">
            {/* 画像 */}
            {selectedHistory.images && selectedHistory.images.length > 0 && (
              <div className="grid grid-cols-2 gap-2">
                {selectedHistory.images.map((img, i) => (
                  <img
                    key={i}
                    src={img}
                    alt={`${selectedHistory.title} ${i + 1}`}
                    className="w-full aspect-square object-cover rounded-lg"
                  />
                ))}
              </div>
            )}

            {/* 基本情報 */}
            <div>
              <h3 className="text-lg font-bold">{selectedHistory.title}</h3>
              <p className="text-sm text-muted">{formatDate(selectedHistory.date)}</p>
            </div>

            {/* レシピリンク */}
            {selectedHistory.recipeId && (
              <Link
                href={`/recipes/${selectedHistory.recipeId}`}
                className="block p-3 bg-accent rounded-lg text-primary text-sm hover:bg-border transition-colors"
              >
                レシピを見る →
              </Link>
            )}

            {/* 材料 */}
            {selectedHistory.ingredients && selectedHistory.ingredients.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted mb-1">材料</h4>
                <ul className="text-sm space-y-0.5">
                  {selectedHistory.ingredients.map((ing, i) => (
                    <li key={i}>• {ing}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* 作り方 */}
            {selectedHistory.steps && selectedHistory.steps.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-muted mb-1">作り方</h4>
                <ol className="text-sm space-y-1">
                  {selectedHistory.steps.map((step, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">{i + 1}.</span>
                      <span>{step}</span>
                    </li>
                  ))}
                </ol>
              </div>
            )}

            {/* メモ */}
            {selectedHistory.note && (
              <div>
                <h4 className="text-sm font-medium text-muted mb-1">メモ</h4>
                <p className="text-sm whitespace-pre-wrap">{selectedHistory.note}</p>
              </div>
            )}

            {/* アクション */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleDeleteHistory(selectedHistory.id)}
              >
                削除
              </Button>
              {selectedHistory.ingredients &&
                selectedHistory.steps &&
                !selectedHistory.recipeId && (
                  <Button
                    className="flex-1"
                    onClick={() => handleConvertToRecipe(selectedHistory)}
                  >
                    レシピ化
                  </Button>
                )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
