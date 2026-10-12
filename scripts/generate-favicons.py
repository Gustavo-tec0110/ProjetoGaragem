#!/usr/bin/env python3
"""Generate outlined Projeto Garagem favicons from the preserved original logo."""

from __future__ import annotations

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


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

PREVIOUS_OUTLINE_RADIUS = {16: 1, 32: 1, 48: 1, 180: 1, 192: 1, 512: 2}
OUTLINE_RADIUS = {16: 2, 32: 2, 48: 2, 180: 2, 192: 2, 512: 4}
PREVIOUS_OUTLINE_ALPHA = 224
OUTLINE_ALPHA = 240
ALPHA_THRESHOLD = 24


def font(size: int) -> ImageFont.FreeTypeFont | ImageFont.ImageFont:
    path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def resize_original(original: Image.Image, size: int) -> Image.Image:
    if original.size == (size, size):
        return original.copy()
    return original.resize((size, size), Image.Resampling.LANCZOS)


def add_outline(original: Image.Image, radius: int, outline_alpha: int) -> Image.Image:
    """Add black only where the source is fully transparent; source pixels stay exact."""
    source = original.convert("RGBA")
    alpha = source.getchannel("A")
    solid = alpha.point(lambda value: 255 if value >= ALPHA_THRESHOLD else 0)
    expanded = solid.filter(ImageFilter.MaxFilter(radius * 2 + 1))

    ring = Image.new("L", source.size, 0)
    ring_pixels = ring.load()
    expanded_pixels = expanded.load()
    alpha_pixels = alpha.load()
    for y in range(source.height):
        for x in range(source.width):
            if alpha_pixels[x, y] == 0 and expanded_pixels[x, y] > 0:
                ring_pixels[x, y] = outline_alpha

    outlined = Image.new("RGBA", source.size, (0, 0, 0, 0))
    outlined.paste((0, 0, 0, 255), mask=ring)
    outlined.alpha_composite(source)
    return outlined


def place_on_background(icon: Image.Image, background: tuple[int, int, int], canvas: int) -> Image.Image:
    tile = Image.new("RGB", (canvas, canvas), background).convert("RGBA")
    x = (canvas - icon.width) // 2
    y = (canvas - icon.height) // 2
    tile.alpha_composite(icon, (x, y))
    return tile.convert("RGB")


def comparison(previous: dict[int, Image.Image], generated: dict[int, Image.Image]) -> None:
    sizes = [16, 32, 48, 192]
    cell_w, cell_h = 300, 250
    canvas = Image.new("RGB", (cell_w * 2, 72 + cell_h * len(sizes)), "#E9EAEC")
    draw = ImageDraw.Draw(canvas)
    title_font, label_font = font(24), font(18)
    draw.text((20, 18), "Versão anterior", fill="#111111", font=title_font)
    draw.text((cell_w + 20, 18), "Outline mais grosso", fill="#111111", font=title_font)

    for row, size in enumerate(sizes):
        y = 72 + row * cell_h
        before = previous[size]
        after = generated[size]
        for col, icon in enumerate((before, after)):
            x = col * cell_w
            tile = place_on_background(icon, (255, 255, 255), 110)
            canvas.paste(tile, (x + 95, y + 14))
            zoom = icon.resize((size * min(4, max(1, 192 // size)),) * 2, Image.Resampling.NEAREST)
            zoom_tile = place_on_background(zoom, (214, 216, 220), 110)
            canvas.paste(zoom_tile, (x + 95, y + 128))
        draw.text((12, y + 18), f"{size}px", fill="#111111", font=label_font)
        draw.text((12, y + 152), "zoom", fill="#555555", font=font(14))

    canvas.save(DOCS / "comparison.png", optimize=True)


def background_matrix(generated: dict[int, Image.Image]) -> None:
    backgrounds = [
        ("Branco", (255, 255, 255)),
        ("Preto", (0, 0, 0)),
        ("Cinza claro", (224, 224, 224)),
        ("Cinza escuro", (55, 55, 58)),
        ("Vermelho", (210, 28, 42)),
        ("Azul", (20, 88, 190)),
        ("Verde", (22, 135, 74)),
        ("Roxo", (108, 45, 145)),
    ]
    sizes = [16, 32, 48, 192]
    label_w, cell, header_h = 150, 120, 64
    canvas = Image.new("RGB", (label_w + cell * len(sizes), header_h + cell * len(backgrounds)), "#F4F4F5")
    draw = ImageDraw.Draw(canvas)
    for col, size in enumerate(sizes):
        draw.text((label_w + col * cell + 38, 20), f"{size}px", fill="#111111", font=font(17))
    for row, (name, color) in enumerate(backgrounds):
        y = header_h + row * cell
        draw.text((12, y + 48), name, fill="#111111", font=font(16))
        for col, size in enumerate(sizes):
            icon = generated[size]
            tile = place_on_background(icon, color, cell)
            canvas.paste(tile, (label_w + col * cell, y))
    canvas.save(DOCS / "background-tests.png", optimize=True)


def main() -> None:
    original = Image.open(SOURCE).convert("RGBA")
    if original.size != (512, 512):
        raise ValueError(f"Expected a 512x512 source, got {original.size}")

    generated: dict[int, Image.Image] = {}
    previous: dict[int, Image.Image] = {}
    for size, destination in OUTPUTS.items():
        resized = resize_original(original, size)
        previous[size] = add_outline(
            resized,
            PREVIOUS_OUTLINE_RADIUS[size],
            PREVIOUS_OUTLINE_ALPHA,
        )
        outlined = add_outline(resized, OUTLINE_RADIUS[size], OUTLINE_ALPHA)
        outlined.save(destination, optimize=True)
        generated[size] = outlined

    generated[48].save(
        APP / "favicon.ico",
        format="ICO",
        sizes=[(16, 16), (32, 32), (48, 48)],
        append_images=[generated[32], generated[16]],
    )

    comparison(previous, generated)
    background_matrix(generated)


if __name__ == "__main__":
    main()
