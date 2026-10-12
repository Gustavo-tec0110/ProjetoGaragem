#!/usr/bin/env python3
"""Generate Projeto Garagem favicon concepts from the preserved original logo."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "favicon" / "original.png"
APP = ROOT / "src" / "app"
DOCS = ROOT / "docs" / "favicon"
VARIANTS = DOCS / "variants"

OUTPUTS = {
    512: APP / "icon.png",
    192: APP / "icon1.png",
    48: APP / "icon2.png",
    32: APP / "icon3.png",
    16: APP / "icon4.png",
    180: APP / "apple-icon.png",
}

BACKGROUNDS = [
    ("Branco", (255, 255, 255)),
    ("Preto", (0, 0, 0)),
    ("Cinza claro", (224, 224, 224)),
    ("Cinza escuro", (55, 55, 58)),
    ("Vermelho", (210, 28, 42)),
    ("Azul", (20, 88, 190)),
    ("Verde", (22, 135, 74)),
    ("Roxo", (108, 45, 145)),
]


@dataclass(frozen=True)
class Concept:
    slug: str
    name: str
    logo_width: float
    corner_radius: float
    inset_stroke: bool = False


CONCEPTS = [
    Concept("minimalista", "A · Minimalista", logo_width=0.66, corner_radius=0.22),
    Concept("premium", "B · Premium", logo_width=0.71, corner_radius=0.20, inset_stroke=True),
    Concept("impactante", "C · Impactante", logo_width=0.78, corner_radius=0.165),
]
RECOMMENDED = "premium"
ALPHA_THRESHOLD = 24
RENDER_SCALE = 4


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    filename = "DejaVuSans-Bold.ttf" if bold else "DejaVuSans.ttf"
    path = Path("/usr/share/fonts/truetype/dejavu") / filename
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def crop_logo(original: Image.Image) -> Image.Image:
    alpha = original.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    bounds = solid.getbbox()
    if bounds is None:
        raise ValueError("The source logo is fully transparent")
    return original.crop(bounds)


def rounded_background_legacy(size: int, concept: Concept) -> Image.Image:
    scale = RENDER_SCALE
    large_size = size * scale
    radius = round(size * concept.corner_radius * scale)
    canvas = Image.new("RGBA", (large_size, large_size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (0, 0, large_size - 1, large_size - 1),
        radius=radius,
        fill=(0, 0, 0, 255),
    )

    if concept.inset_stroke:
        inset = max(scale, round(size * 0.025 * scale))
        stroke = max(scale, round(size * 0.009 * scale))
        draw.rounded_rectangle(
            (inset, inset, large_size - 1 - inset, large_size - 1 - inset),
            radius=max(0, radius - inset),
            outline=(38, 41, 46, 255),
            width=stroke,
        )

    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def render_concept_legacy(original: Image.Image, size: int, concept: Concept) -> Image.Image:
    canvas = rounded_background_legacy(size, concept)
    logo = crop_logo(original)
    target_width = max(1, round(size * concept.logo_width))
    target_height = max(1, round(logo.height * target_width / logo.width))
    logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)

    x = (size - target_width) // 2
    y = (size - target_height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas


def rounded_background_at_resolution(size: int, concept: Concept) -> Image.Image:
    radius = round(size * concept.corner_radius)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle(
        (0, 0, size - 1, size - 1),
        radius=radius,
        fill=(0, 0, 0, 255),
    )

    if concept.inset_stroke:
        inset = max(1, round(size * 0.025))
        stroke = max(1, round(size * 0.009))
        draw.rounded_rectangle(
            (inset, inset, size - 1 - inset, size - 1 - inset),
            radius=max(0, radius - inset),
            outline=(38, 41, 46, 255),
            width=stroke,
        )

    return canvas


def render_concept_refined(original: Image.Image, size: int, concept: Concept) -> Image.Image:
    working_size = size * RENDER_SCALE
    canvas = rounded_background_at_resolution(working_size, concept)
    logo = crop_logo(original)
    target_width = max(1, round(working_size * concept.logo_width))
    target_height = max(1, round(logo.height * target_width / logo.width))
    logo = logo.resize((target_width, target_height), Image.Resampling.LANCZOS)

    x = (working_size - target_width) // 2
    y = (working_size - target_height) // 2
    canvas.alpha_composite(logo, (x, y))
    reduced = canvas.resize((size, size), Image.Resampling.LANCZOS)
    alpha = reduced.getchannel("A")
    sharpened = reduced.convert("RGB").filter(
        ImageFilter.UnsharpMask(radius=0.55, percent=70, threshold=2),
    )
    sharpened.putalpha(alpha)
    return sharpened


def place_on_background(
    icon: Image.Image,
    background: tuple[int, int, int],
    canvas_size: int,
) -> Image.Image:
    tile = Image.new("RGBA", (canvas_size, canvas_size), (*background, 255))
    x = (canvas_size - icon.width) // 2
    y = (canvas_size - icon.height) // 2
    tile.alpha_composite(icon, (x, y))
    return tile.convert("RGB")


def refinement_comparison(
    current: dict[int, Image.Image],
    refined: dict[int, Image.Image],
) -> None:
    sizes = [16, 32, 48, 192]
    columns = [("B atual", current), ("B refinada", refined)]
    cell_w, cell_h, header_h = 350, 245, 92
    canvas = Image.new(
        "RGB",
        (cell_w * len(columns), header_h + cell_h * len(sizes)),
        "#E9EAEC",
    )
    draw = ImageDraw.Draw(canvas)

    for column, (name, _) in enumerate(columns):
        x = column * cell_w
        draw.text((x + 18, 18), name, fill="#111111", font=font(22, bold=True))
        if column == 1:
            draw.rounded_rectangle((x + 18, 52, x + 145, 78), radius=13, fill="#D91D2B")
            draw.text((x + 52, 57), "FINAL", fill="white", font=font(12, bold=True))

    for row, size in enumerate(sizes):
        y = header_h + row * cell_h
        for column, (_, icons) in enumerate(columns):
            x = column * cell_w
            icon = icons[size]
            if size == 192:
                preview = icon.resize((180, 180), Image.Resampling.LANCZOS)
                tile = place_on_background(preview, (255, 255, 255), 200)
                canvas.paste(tile, (x + 75, y + 18))
                continue

            tile = place_on_background(icon, (255, 255, 255), 110)
            canvas.paste(tile, (x + 120, y + 10))

            zoom_factor = min(4, max(1, 192 // size))
            zoom = icon.resize((size * zoom_factor,) * 2, Image.Resampling.LANCZOS)
            zoom_tile = place_on_background(zoom, (214, 216, 220), 110)
            canvas.paste(zoom_tile, (x + 120, y + 128))

        label = "192px" if size == 192 else f"{size}px"
        draw.text((12, y + 18), label, fill="#111111", font=font(17, bold=True))
        if size == 192:
            draw.text((12, y + 44), "prévia", fill="#555555", font=font(13))
        else:
            draw.text((12, y + 162), "ampliação", fill="#555555", font=font(13))

    canvas.save(DOCS / "comparison.png", optimize=True)


def refinement_background_matrix(
    current: dict[int, Image.Image],
    refined: dict[int, Image.Image],
) -> None:
    columns = [("B atual", current), ("B refinada", refined)]
    label_w, cell_w, cell_h, header_h = 150, 280, 120, 70
    canvas = Image.new(
        "RGB",
        (label_w + cell_w * len(columns), header_h + cell_h * len(BACKGROUNDS)),
        "#F4F4F5",
    )
    draw = ImageDraw.Draw(canvas)

    for column, (name, _) in enumerate(columns):
        x = label_w + column * cell_w
        draw.text((x + 18, 14), name, fill="#111111", font=font(16, bold=True))
        draw.text((x + 18, 39), "16 px  ·  32 px  ·  48 px", fill="#606166", font=font(12))

    for row, (name, color) in enumerate(BACKGROUNDS):
        y = header_h + row * cell_h
        draw.text((12, y + 49), name, fill="#111111", font=font(15))
        for column, (_, icons) in enumerate(columns):
            x = label_w + column * cell_w
            tile = Image.new("RGBA", (cell_w, cell_h), (*color, 255))
            tile.alpha_composite(icons[16], (40, (cell_h - 16) // 2))
            tile.alpha_composite(icons[32], (112, (cell_h - 32) // 2))
            tile.alpha_composite(icons[48], (200, (cell_h - 48) // 2))
            canvas.paste(tile.convert("RGB"), (x, y))

    canvas.save(DOCS / "background-tests.png", optimize=True)


def main() -> None:
    original = Image.open(SOURCE).convert("RGBA")
    if original.size != (512, 512):
        raise ValueError(f"Expected a 512x512 source, got {original.size}")

    VARIANTS.mkdir(parents=True, exist_ok=True)
    sizes = sorted(OUTPUTS)
    rendered = {
        concept.slug: {
            size: render_concept_refined(original, size, concept)
            for size in sizes
        }
        for concept in CONCEPTS
    }
    premium = next(concept for concept in CONCEPTS if concept.slug == "premium")
    current = {
        size: render_concept_legacy(original, size, premium)
        for size in sizes
    }

    for concept in CONCEPTS:
        rendered[concept.slug][512].save(VARIANTS / f"{concept.slug}.png", optimize=True)

    selected = rendered[RECOMMENDED]
    for size, destination in OUTPUTS.items():
        selected[size].save(destination, optimize=True)

    selected[48].save(
        APP / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[selected[32], selected[16]],
    )

    refinement_comparison(current, selected)
    refinement_background_matrix(current, selected)


if __name__ == "__main__":
    main()
