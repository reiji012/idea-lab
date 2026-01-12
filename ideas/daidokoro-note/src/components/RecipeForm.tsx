'use client';

import { useState } from 'react';
import { Recipe, RecipeCategory, RecipeSource, CATEGORY_LABELS } from '@/types';
import { Button } from './Button';
import { ImageUpload } from './ImageUpload';

type RecipeFormData = Omit<Recipe, 'id' | 'createdAt' | 'cookedCount'>;

interface RecipeFormProps {
  initialData?: Partial<RecipeFormData>;
  onSubmit: (data: RecipeFormData) => void;
  onCancel: () => void;
  submitLabel?: string;
}

type RegistrationMethod = 'x' | 'book' | 'original';

export function RecipeForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = '登録する',
}: RecipeFormProps) {
  const [step, setStep] = useState<'method' | 'form'>(initialData ? 'form' : 'method');
  const [method, setMethod] = useState<RegistrationMethod>('original');

  const [title, setTitle] = useState(initialData?.title || '');
  const [ingredientsText, setIngredientsText] = useState(
    initialData?.ingredients?.join('\n') || ''
  );
  const [stepsText, setStepsText] = useState(
    initialData?.steps?.join('\n') || ''
  );
  const [images, setImages] = useState<string[]>(initialData?.images || []);
  const [category, setCategory] = useState<RecipeCategory>(
    initialData?.category || 'other'
  );
  const [sourceUrl, setSourceUrl] = useState(initialData?.sourceUrl || '');

  const handleMethodSelect = (selectedMethod: RegistrationMethod) => {
    setMethod(selectedMethod);
    setStep('form');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const ingredients = ingredientsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);
    const steps = stepsText
      .split('\n')
      .map((s) => s.trim())
      .filter(Boolean);

    const source: RecipeSource = method === 'x' ? 'x' : method === 'book' ? 'book' : 'original';

    onSubmit({
      title,
      ingredients,
      steps,
      images,
      category,
      source,
      sourceUrl: method === 'x' ? sourceUrl : undefined,
    });
  };

  if (step === 'method') {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted">登録方法を選んでください</p>

        <button
          onClick={() => handleMethodSelect('x')}
          className="w-full p-4 border border-border rounded-lg text-left hover:bg-accent transition-colors"
        >
          <div className="font-medium">Xの投稿から登録</div>
          <div className="text-sm text-muted mt-1">
            投稿URLを入力して画像とテキストを保存
          </div>
        </button>

        <button
          onClick={() => handleMethodSelect('book')}
          className="w-full p-4 border border-border rounded-lg text-left hover:bg-accent transition-colors"
        >
          <div className="font-medium">書籍から登録</div>
          <div className="text-sm text-muted mt-1">
            書籍を撮影した画像から材料・作り方を登録
          </div>
        </button>

        <button
          onClick={() => handleMethodSelect('original')}
          className="w-full p-4 border border-border rounded-lg text-left hover:bg-accent transition-colors"
        >
          <div className="font-medium">オリジナル登録</div>
          <div className="text-sm text-muted mt-1">
            材料・作り方を手動で入力
          </div>
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {method === 'x' && (
        <div>
          <label className="block text-sm font-medium mb-1">X投稿のURL</label>
          <input
            type="url"
            value={sourceUrl}
            onChange={(e) => setSourceUrl(e.target.value)}
            placeholder="https://x.com/..."
            className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
          />
          <p className="text-xs text-muted mt-1">
            ※ 現在はURLの保存のみ。画像・テキストは手動で入力してください。
          </p>
        </div>
      )}

      {method === 'book' && (
        <div className="p-3 bg-accent rounded-lg">
          <p className="text-sm text-muted">
            ※ 現在は画像認識機能は準備中です。書籍の画像をアップロードし、材料・作り方を手動で入力してください。
          </p>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium mb-1">画像</label>
        <ImageUpload images={images} onChange={setImages} maxImages={4} />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          レシピ名 <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          placeholder="例: 鶏むね肉のレモンバター"
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">カテゴリ</label>
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as RecipeCategory)}
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 bg-white"
        >
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          材料 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={ingredientsText}
          onChange={(e) => setIngredientsText(e.target.value)}
          required
          rows={5}
          placeholder="1行に1つずつ入力&#10;例:&#10;鶏むね肉 1枚&#10;レモン 1/2個&#10;バター 20g"
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          作り方 <span className="text-red-500">*</span>
        </label>
        <textarea
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          required
          rows={6}
          placeholder="1行に1ステップずつ入力&#10;例:&#10;鶏むね肉を一口大に切る&#10;フライパンにバターを溶かす&#10;鶏肉を両面焼く"
          className="w-full px-3 py-2 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none"
        />
      </div>

      <div className="flex gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} className="flex-1">
          キャンセル
        </Button>
        <Button type="submit" className="flex-1">
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
