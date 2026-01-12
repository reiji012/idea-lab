'use client';

import Link from 'next/link';
import { Recipe, CATEGORY_LABELS } from '@/types';

interface RecipeCardProps {
  recipe: Recipe;
}

export function RecipeCard({ recipe }: RecipeCardProps) {
  return (
    <Link
      href={`/recipes/${recipe.id}`}
      className="block bg-white rounded-lg border border-border overflow-hidden hover:shadow-md transition-shadow"
    >
      {/* 画像 */}
      {/* 画像 */}
      <div className="relative bg-accent">
        {recipe.images.length > 0 ? (
          <img
            src={recipe.images[0]}
            alt={recipe.title}
            className="w-full h-auto object-contain"
          />
        ) : (
          <div className="aspect-video w-full flex items-center justify-center text-muted">
            <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
        {/* カテゴリバッジ */}
        <span className="absolute top-2 left-2 px-2 py-0.5 bg-white/90 text-xs rounded-full text-secondary">
          {CATEGORY_LABELS[recipe.category]}
        </span>
      </div>

      {/* 情報 */}
      <div className="p-3">
        <h3 className="font-medium text-foreground line-clamp-2">{recipe.title}</h3>
        <div className="mt-2 flex items-center justify-between text-xs text-muted">
          <span>{recipe.ingredients.length}種類の材料</span>
          {recipe.cookedCount > 0 && (
            <span className="flex items-center gap-1">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {recipe.cookedCount}回作った
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
