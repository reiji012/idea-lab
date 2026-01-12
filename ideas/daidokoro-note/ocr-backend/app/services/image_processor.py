import io
from pathlib import Path
from PIL import Image, ExifTags

from app.config import IMAGE_MIN_SIZE, IMAGE_MAX_SIZE, IMAGE_DIR


def fix_exif_orientation(image: Image.Image) -> Image.Image:
    """EXIF情報に基づいて画像の向きを補正"""
    try:
        exif = image._getexif()
        if exif is None:
            return image

        orientation_key = None
        for key, value in ExifTags.TAGS.items():
            if value == "Orientation":
                orientation_key = key
                break

        if orientation_key is None or orientation_key not in exif:
            return image

        orientation = exif[orientation_key]

        if orientation == 2:
            image = image.transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 3:
            image = image.rotate(180)
        elif orientation == 4:
            image = image.transpose(Image.FLIP_TOP_BOTTOM)
        elif orientation == 5:
            image = image.rotate(-90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 6:
            image = image.rotate(-90, expand=True)
        elif orientation == 7:
            image = image.rotate(90, expand=True).transpose(Image.FLIP_LEFT_RIGHT)
        elif orientation == 8:
            image = image.rotate(90, expand=True)

    except (AttributeError, KeyError, IndexError):
        pass

    return image


def resize_image(image: Image.Image) -> Image.Image:
    """画像をOCR用にリサイズ"""
    width, height = image.size
    max_dim = max(width, height)

    # 小さすぎる場合は拡大
    if max_dim < IMAGE_MIN_SIZE:
        scale = IMAGE_MIN_SIZE / max_dim
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = image.resize((new_width, new_height), Image.LANCZOS)

    # 大きすぎる場合は縮小
    elif max_dim > IMAGE_MAX_SIZE:
        scale = IMAGE_MAX_SIZE / max_dim
        new_width = int(width * scale)
        new_height = int(height * scale)
        image = image.resize((new_width, new_height), Image.LANCZOS)

    return image


def process_image(image_bytes: bytes) -> Image.Image:
    """画像を前処理（EXIF補正 + リサイズ）"""
    image = Image.open(io.BytesIO(image_bytes))

    # RGBに変換（PNGのRGBA等対応）
    if image.mode != "RGB":
        image = image.convert("RGB")

    # EXIF補正
    image = fix_exif_orientation(image)

    # リサイズ
    image = resize_image(image)

    return image


def save_image(image: Image.Image, recipe_id: str) -> str:
    """画像を保存してパスを返す"""
    Path(IMAGE_DIR).mkdir(parents=True, exist_ok=True)

    filename = f"{recipe_id}.jpg"
    filepath = Path(IMAGE_DIR) / filename

    image.save(filepath, "JPEG", quality=90)

    return str(filepath)
