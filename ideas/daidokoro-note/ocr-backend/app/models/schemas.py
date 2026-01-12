from typing import Optional
from pydantic import BaseModel


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
    ingredients: list[Ingredient] = []
    steps: list[Step] = []
    time: Optional[str] = None
    notes: list[str] = []
    tags: list[str] = []
    source: Optional[Source] = None
    raw_text_used: str


class IngestResponse(BaseModel):
    recipe_id: str
    raw_ocr_text: str
    structured_recipe: Optional[StructuredRecipe] = None
    confidence: Optional[float] = None
    warnings: list[str] = []


class RecipeResponse(BaseModel):
    id: str
    created_at: str
    source_url: Optional[str] = None
    image_path: str
    ocr_raw_text: str
    structured_recipe: Optional[StructuredRecipe] = None
    confidence: Optional[float] = None
    warnings: list[str] = []


class HealthResponse(BaseModel):
    status: str
    ocr_loaded: bool
    db_connected: bool
    ollama_available: bool


class ErrorResponse(BaseModel):
    detail: str
    request_id: Optional[str] = None
