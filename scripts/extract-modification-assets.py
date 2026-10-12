#!/usr/bin/env python3
"""Extract the approved catalog illustrations into consistent transparent WebP assets.

The source sheets intentionally include headings, labels, and cell borders. This
script only samples the image portion of each known cell, removes the
edge-connected near-white background conservatively, and centres the detected
piece on a 512px canvas.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from pathlib import Path

from PIL import Image, ImageFilter


ROOT = Path(__file__).resolve().parents[1]
SOURCE = Path("/home/gustavo/Downloads")
OUTPUT = ROOT / "public" / "modifications"
CANVAS_SIZE = 512
CONTENT_SIZE = 400


@dataclass(frozen=True)
class Sheet:
    filename: str
    rows: tuple[tuple[int, int, int], ...]
    items: tuple[tuple[str, str], ...]


SHEETS = (
    Sheet(
        "Imagem do ChatGPT 29 de set. de 2026, 20_34_52.png",
        ((60, 253, 8), (370, 590, 7), (706, 960, 4)),
        (
            ("exterior", "aerofolio"), ("exterior", "spoiler"), ("exterior", "front-lip"), ("exterior", "side-skirts"),
            ("exterior", "difusor"), ("exterior", "body-kit"), ("exterior", "capo"), ("exterior", "para-choque"),
            ("electrical", "chicote"), ("electrical", "reles"), ("electrical", "fusiveis"), ("electrical", "sensores"),
            ("electrical", "wideband"), ("electrical", "instrumentacao-eletrica"), ("electrical", "sistema-eletrico-customizado"),
            ("audio", "alto-falantes"), ("audio", "subwoofer"), ("audio", "amplificador"), ("audio", "multimidia"),
        ),
    ),
    Sheet(
        "Imagem do ChatGPT 29 de set. de 2026, 20_35_36.png",
        ((58, 286, 6), (395, 610, 9), (729, 950, 4)),
        (
            ("transmission", "cambio"), ("transmission", "embreagem"), ("transmission", "diferencial"), ("transmission", "short-shifter"),
            ("transmission", "alavanca"), ("transmission", "relacoes-marcha"),
            ("interior", "banco-esportivo"), ("interior", "banco-concha"), ("interior", "volante"), ("interior", "manopla"),
            ("interior", "pedaleiras"), ("interior", "cintos"), ("interior", "roll-cage"), ("interior", "instrumentacao-interior"),
            ("interior", "painel-digital"),
            ("lighting", "farois"), ("lighting", "lanternas"), ("lighting", "farois-auxiliares"), ("lighting", "drl"),
        ),
    ),
    Sheet(
        "Imagem do ChatGPT 29 de set. de 2026, 20_35_52.png",
        ((59, 264, 9), (390, 625, 5), (738, 955, 4)),
        (
            ("suspension", "coilover"), ("suspension", "suspensao-rosca"), ("suspension", "suspensao-fixa"), ("suspension", "molas"),
            ("suspension", "amortecedores"), ("suspension", "barra-estabilizadora"), ("suspension", "buchas"), ("suspension", "bracos"),
            ("suspension", "camber-alinhamento"),
            ("brakes", "discos"), ("brakes", "pincas"), ("brakes", "pastilhas"), ("brakes", "mangueiras"), ("brakes", "kit-freio"),
            ("wheels", "rodas"), ("wheels", "pneus"), ("wheels", "espacadores"), ("wheels", "adaptadores"),
        ),
    ),
    Sheet(
        "Imagem do ChatGPT 29 de set. de 2026, 20_36_07.png",
        ((66, 264, 6), (311, 515, 6), (561, 770, 6), (816, 977, 6)),
        (
            ("engine", "turbo"), ("engine", "supercharger"), ("engine", "intercooler"), ("engine", "intake-filtro-esportivo"),
            ("engine", "coletor-admissao"), ("engine", "coletor-escape"),
            ("engine", "downpipe"), ("engine", "escape"), ("engine", "bicos-injetores"), ("engine", "bomba-combustivel"),
            ("engine", "regulador-pressao"), ("engine", "ecu-modulo"),
            ("engine", "bobinas"), ("engine", "velas"), ("engine", "radiador"), ("engine", "motor"),
            ("engine", "cabecote"), ("engine", "comando"),
            ("engine", "pistoes-bielas"),
        ),
    ),
)

# Some of the source grids intentionally use cells of different widths to fit
# the illustration. Explicit edges avoid borrowing a neighbouring product.
ROW_EDGES: dict[tuple[str, int], tuple[int, ...]] = {
    (
        "Imagem do ChatGPT 29 de set. de 2026, 20_35_36.png",
        1,
    ): (0, 162, 318, 506, 630, 781, 970, 1167, 1365, 1536),
    (
        "Imagem do ChatGPT 29 de set. de 2026, 20_35_52.png",
        0,
    ): (0, 161, 321, 482, 634, 786, 970, 1163, 1367, 1536),
}


def foreground_mask(image: Image.Image) -> Image.Image:
    """Remove only edge-connected near-white pixels.

    This is deliberately not a global white-to-transparent conversion. A pixel
    can only become transparent if it is connected to the crop edge through the
    same near-white background. White paint, chrome highlights and light metal
    enclosed by the part's outlines therefore remain opaque.
    """
    rgb = image.convert("RGB")
    width, height = rgb.size
    pixels = rgb.load()
    visited = bytearray(width * height)

    def background(x: int, y: int) -> bool:
        red, green, blue = pixels[x, y]
        return min(red, green, blue) >= 232 and max(red, green, blue) - min(red, green, blue) <= 20

    queue: deque[tuple[int, int]] = deque()
    for x in range(width):
        queue.extend(((x, 0), (x, height - 1)))
    for y in range(1, height - 1):
        queue.extend(((0, y), (width - 1, y)))

    while queue:
        x, y = queue.popleft()
        index = y * width + x
        if visited[index] or not background(x, y):
            continue
        visited[index] = 1
        if x:
            queue.append((x - 1, y))
        if x + 1 < width:
            queue.append((x + 1, y))
        if y:
            queue.append((x, y - 1))
        if y + 1 < height:
            queue.append((x, y + 1))

    alpha = Image.new("L", (width, height))
    alpha.putdata([0 if visited[index] else 255 for index in range(width * height)])
    return alpha


def render_asset(crop: Image.Image, destination: Path) -> None:
    rgb = crop.convert("RGB")
    alpha = foreground_mask(rgb)
    bounds = alpha.getbbox()
    if bounds is None:
        raise RuntimeError(f"No product detected for {destination}")

    x, y, right, bottom = bounds
    padding = 3
    x0, y0 = max(0, x - padding), max(0, y - padding)
    x1, y1 = min(rgb.width, right + padding), min(rgb.height, bottom + padding)
    product_rgb = rgb.crop((x0, y0, x1, y1))
    product_alpha = alpha.crop((x0, y0, x1, y1))

    # Soften only the cut edge. The product stays fully opaque and fine details
    # remain sharp, while white-background halos are avoided.
    product_alpha = product_alpha.filter(ImageFilter.GaussianBlur(0.7))
    product = product_rgb.convert("RGBA")
    product.putalpha(product_alpha)
    scale = min(CONTENT_SIZE / max(product.width, product.height), 2.5)
    size = (max(1, round(product.width * scale)), max(1, round(product.height * scale)))
    product = product.resize(size, Image.Resampling.LANCZOS)

    canvas = Image.new("RGBA", (CANVAS_SIZE, CANVAS_SIZE), (0, 0, 0, 0))
    canvas.alpha_composite(product, ((CANVAS_SIZE - product.width) // 2, (CANVAS_SIZE - product.height) // 2))
    destination.parent.mkdir(parents=True, exist_ok=True)
    canvas.save(destination, "WEBP", quality=92, method=6, exact=True)


def main() -> None:
    expected = sum(len(sheet.items) for sheet in SHEETS)
    produced = 0
    for sheet in SHEETS:
        image = Image.open(SOURCE / sheet.filename)
        item_index = 0
        for row_index, (top, bottom, columns) in enumerate(sheet.rows):
            edges = ROW_EDGES.get(
                (sheet.filename, row_index),
                tuple(round(column * image.width / columns) for column in range(columns + 1)),
            )
            for column in range(columns):
                if item_index == len(sheet.items):
                    break
                left = edges[column] + 5
                right = edges[column + 1] - 5
                crop = image.crop((left, top + 4, right, bottom))
                category, slug = sheet.items[item_index]
                render_asset(crop, OUTPUT / category / f"{slug}.webp")
                item_index += 1
                produced += 1
        if item_index != len(sheet.items):
            raise RuntimeError(f"Missing rows for {sheet.filename}")
    if produced != expected:
        raise RuntimeError(f"Expected {expected} assets, produced {produced}")
    print(f"Extracted {produced} transparent assets into {OUTPUT}")


if __name__ == "__main__":
    main()
