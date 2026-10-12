#!/usr/bin/env python3
"""Generate transparent Projeto Garagem favicons from the original raster logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / "docs" / "favicon" / "original.png"
APP = ROOT / "src" / "app"
DOCS = ROOT / "docs" / "favicon"

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

ALPHA_THRESHOLD = 24
GRAPHITE = (18, 20, 24, 255)
RENDER_SCALE = 4


def total_width_ratio(size: int) -> float:
    """Keep one device pixel of side breathing room in browser-sized icons."""
    if size <= 16:
        return 14 / 16
    if size <= 32:
        return 30 / 32
    if size <= 48:
        return 46 / 48
    return 0.96


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

    left, top, right, bottom = bounds
    padding = 2
    expanded = (
        max(0, left - padding),
        max(0, top - padding),
        min(original.width, right + padding),
        min(original.height, bottom + padding),
    )
    return original.crop(expanded)


def outline_width(size: int) -> float:
    if size <= 48:
        return 1.0
    if size <= 192:
        return 1.25
    return 2.0


def render_icon(original: Image.Image, size: int) -> Image.Image:
    working_size = size * RENDER_SCALE
    outline = outline_width(size) * RENDER_SCALE
    total_width = working_size * total_width_ratio(size)
    logo_width = max(1, round(total_width - 2 * outline))

    logo = crop_logo(original)
    logo_height = max(1, round(logo.height * logo_width / logo.width))
    logo = logo.resize((logo_width, logo_height), Image.Resampling.LANCZOS)

    alpha = logo.getchannel("A")
    radius = max(1, round(outline))
    dilated = alpha.filter(ImageFilter.MaxFilter(radius * 2 + 1))
    ring = ImageChops.subtract(dilated, alpha)

    outlined = Image.new("RGBA", logo.size, (0, 0, 0, 0))
    outlined.paste(GRAPHITE, mask=ring)
    outlined.alpha_composite(logo)

    canvas = Image.new("RGBA", (working_size, working_size), (0, 0, 0, 0))
    x = (working_size - outlined.width) // 2
    y = (working_size - outlined.height) // 2
    canvas.alpha_composite(outlined, (x, y))

    return canvas.resize((size, size), Image.Resampling.LANCZOS)


def render_original(original: Image.Image, size: int) -> Image.Image:
    return original.resize((size, size), Image.Resampling.LANCZOS)


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


def comparison(originals: dict[int, Image.Image], updated: dict[int, Image.Image]) -> None:
    sizes = [16, 32, 48, 192]
    columns = [("Original", originals), ("Definitiva", updated)]
    cell_w, cell_h, header_h = 350, 245, 84
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
            draw.rounded_rectangle((x + 18, 50, x + 145, 76), radius=13, fill="#D91D2B")
            draw.text((x + 52, 55), "FINAL", fill="white", font=font(12, bold=True))

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

        draw.text((12, y + 18), f"{size}px", fill="#111111", font=font(17, bold=True))
        caption = "prévia" if size == 192 else "ampliação"
        draw.text((12, y + (44 if size == 192 else 162)), caption, fill="#555555", font=font(13))

    canvas.save(DOCS / "comparison.png", optimize=True)


def background_matrix(
    originals: dict[int, Image.Image],
    updated: dict[int, Image.Image],
) -> None:
    columns = [("Original", originals), ("Definitiva", updated)]
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
        draw.text((x + 18, 39), "16 px  ·  32 px", fill="#606166", font=font(12))

    for row, (name, color) in enumerate(BACKGROUNDS):
        y = header_h + row * cell_h
        draw.text((12, y + 49), name, fill="#111111", font=font(15))
        for column, (_, icons) in enumerate(columns):
            x = label_w + column * cell_w
            tile = Image.new("RGBA", (cell_w, cell_h), (*color, 255))
            tile.alpha_composite(icons[16], (70, (cell_h - 16) // 2))
            tile.alpha_composite(icons[32], (175, (cell_h - 32) // 2))
            canvas.paste(tile.convert("RGB"), (x, y))

    canvas.save(DOCS / "background-tests.png", optimize=True)


def main() -> None:
    original = Image.open(SOURCE).convert("RGBA")
    if original.size != (512, 512):
        raise ValueError(f"Expected a 512x512 source, got {original.size}")

    sizes = sorted(OUTPUTS)
    updated = {size: render_icon(original, size) for size in sizes}
    originals = {size: render_original(original, size) for size in sizes}

    for size, destination in OUTPUTS.items():
        updated[size].save(destination, optimize=True)

    updated[48].save(
        APP / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[updated[32], updated[16]],
    )

    comparison(originals, updated)
    background_matrix(originals, updated)


if __name__ == "__main__":
    main()
