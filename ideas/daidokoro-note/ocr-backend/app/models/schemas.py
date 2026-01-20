from typing import Optional
from pydantic import BaseModel, Field


class Ingredient(BaseModel):
    name: str
    amount: Optional[str] = None
    note: Optional[str] = None


class Step(BaseModel):
    order: int
    text: str


class Source(BaseModel):
    url: Optional[str] = None
    platform: Optional[str] = None


class StructuredRecipe(BaseModel):
    title: Optional[str] = None
    servings: Optional[str] = None
    ingredients: list[Ingredient] = Field(default_factory=list)
    steps: list[Step] = Field(default_factory=list)
    time: Optional[str] = None
    notes: list[str] = Field(default_factory=list)
    tags: list[str] = Field(default_factory=list)
    source: Optional[Source] = None
    raw_text_used: str


class IngestResponse(BaseModel):
    recipe_id: str
    raw_ocr_text: str
    structured_recipe: Optional[StructuredRecipe] = None
    confidence: Optional[float] = None
    warnings: list[str] = Field(default_factory=list)


class BatchIngestResponse(BaseModel):
    """複数画像一括処理のレスポンス"""
    recipe_id: str
    raw_ocr_texts: list[str] = Field(default_factory=list)
    combined_raw_text: str
    structured_recipe: Optional[StructuredRecipe] = None
    average_confidence: Optional[float] = None
    warnings: list[str] = Field(default_factory=list)
    processed_count: int


class RecipeResponse(BaseModel):
    id: str
    created_at: str
    source_url: Optional[str] = None
    image_path: str
    ocr_raw_text: str
    structured_recipe: Optional[StructuredRecipe] = None
    confidence: Optional[float] = None
    warnings: list[str] = Field(default_factory=list)


class HealthResponse(BaseModel):
    status: str
    ocr_loaded: bool
    db_connected: bool
    ollama_available: bool


class ErrorResponse(BaseModel):
    detail: str
    request_id: Optional[str] = None
