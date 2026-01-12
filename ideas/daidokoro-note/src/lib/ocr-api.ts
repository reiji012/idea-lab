// OCR API Client

export interface OcrIngredient {
  name: string;
  amount?: string;
  note?: string;
}

export interface OcrStep {
  order: number;
  text: string;
}

export interface StructuredRecipe {
  title?: string;
  servings?: string;
  ingredients: OcrIngredient[];
  steps: OcrStep[];
  time?: string;
  notes: string[];
  tags: string[];
}

export interface OcrResponse {
  recipe_id: string;
  raw_ocr_text: string;
  structured_recipe?: StructuredRecipe;
  confidence?: number;
  warnings: string[];
}

export interface OcrError {
  detail: string;
}

// const OCR_API_URL = process.env.NEXT_PUBLIC_OCR_API_URL || 'http://localhost:8000';
const OCR_API_URL = 'http://192.168.11.23:8000';
const OCR_API_TOKEN = process.env.NEXT_PUBLIC_OCR_API_TOKEN || 'dev-token';

export async function extractRecipeFromImage(
  file: File,
  options?: {
    sourceUrl?: string;
    titleHint?: string;
  }
): Promise<OcrResponse> {
  const formData = new FormData();
  formData.append('image', file);

  if (options?.sourceUrl) {
    formData.append('source_url', options.sourceUrl);
  }
  if (options?.titleHint) {
    formData.append('title_hint', options.titleHint);
  }

  const response = await fetch(`${OCR_API_URL}/v1/recipes/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OCR_API_TOKEN}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error: OcrError = await response.json();
    throw new Error(error.detail || `OCR API error: ${response.status}`);
  }

  return response.json();
}

// 構造化レシピをフォーム用のテキストに変換
export function formatIngredientsForForm(ingredients: OcrIngredient[]): string {
  return ingredients
    .map((ing) => {
      let line = ing.name;
      if (ing.amount) {
        line += ` ${ing.amount}`;
      }
      if (ing.note) {
        line += ` (${ing.note})`;
      }
      return line;
    })
    .join('\n');
}

export function formatStepsForForm(steps: OcrStep[]): string {
  return steps
    .sort((a, b) => a.order - b.order)
    .map((step) => step.text)
    .join('\n');
}
