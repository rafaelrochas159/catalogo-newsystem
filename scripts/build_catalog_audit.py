from __future__ import annotations

import csv
import json
import re
import unicodedata
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
IMAGE_INDEX = ROOT / "public" / "imported-product-images-clean" / "index.csv"
OUTPUT_DIR = ROOT / "artifacts" / "catalog_audit"
SITE_URLS = {
    "CAIXA_FECHADA": "https://catalogo-newsystem.vercel.app/catalogo/caixa-fechada",
    "UNITARIO": "https://catalogo-newsystem.vercel.app/catalogo/unitario",
}

# High-confidence deterministic aliases. These are safe enough for automatic
# image-link preparation because the evidence is explicit in the source file
# names or they differ only by separator placement.
HIGH_CONFIDENCE_ALIAS_TO_CATALOG = {
    "J-60-AIR39": "J-60-AIR-39",
    "F-060-BW": "F-060",
}

# These candidates look related but still need human review before any write.
PROBABLE_ALIAS_TO_CATALOG = {
    "A-607-Q-MC": "A-607-Q",
    "A-607-W-PB": "A-607-W",
    "A-607-Y-2": "A-607-Y",
    "AG-690-C": "AG-690",
    "I12-TWS": "I12",
    "J-70-PRO-B-2": "J-70-PRO-B",
    "M-10": "A-607-M10",
}


@dataclass
class SiteProduct:
    sku: str
    name: str
    image_url: str
    catalog_type: str
    page_url: str


@dataclass
class CatalogImage:
    sku: str
    filename: str
    image_url: str
    source_label: str


def normalize_sku(value: str | None) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).upper().strip()
    text = text.replace("_", "-").replace(" ", "-")
    text = text.replace("（", "(").replace("）", ")")
    text = text.replace("(AIR31)", "-AIR31").replace("(AIR-31)", "-AIR31")
    text = text.replace("(AIR39)", "-AIR39").replace("(AIR-39)", "-AIR39")
    text = text.replace("(", "-").replace(")", "")
    text = re.sub(r"[^A-Z0-9-]", "", text)
    text = re.sub(r"-+", "-", text).strip("-")

    if text == "AL-8391-B":
        return "AL-8391"
    if text == "AG-690-B":
        return "AG-690"
    if text == "AL-2743-B":
        return "AL-2743"
    if text == "AL-D890-C":
        return "AL-D890"

    return text


def compact_sku(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", normalize_sku(value))


def fetch_site_products() -> dict[str, SiteProduct]:
    pattern = re.compile(
        r'alt="(?P<name>[^"]+)"[^>]*srcSet="(?P<srcset>[^"]+)".*?<span>SKU: <!-- -->(?P<sku>[^<]+)</span>',
        re.S,
    )
    products: dict[str, SiteProduct] = {}

    for catalog_type, url in SITE_URLS.items():
        html = urllib.request.urlopen(url, timeout=30).read().decode("utf-8", "ignore")
        for match in pattern.finditer(html):
            name = match.group("name").strip()
            sku = normalize_sku(match.group("sku"))
            srcset = match.group("srcset")
            first_src = srcset.split(",")[0].strip().split(" ")[0]
            query = urllib.parse.parse_qs(urllib.parse.urlparse(first_src).query)
            image_url = query.get("url", [""])[0]
            products[sku] = SiteProduct(
                sku=sku,
                name=name,
                image_url=image_url,
                catalog_type=catalog_type,
                page_url=url,
            )

    return products


def load_catalog_images() -> dict[str, CatalogImage]:
    with IMAGE_INDEX.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    images: dict[str, CatalogImage] = {}
    for row in rows:
        sku = normalize_sku(row["sku_original"])
        filename = row["filename"]
        images[sku] = CatalogImage(
            sku=sku,
            filename=filename,
            image_url=f"/imported-product-images-clean/{filename}",
            source_label=row["sku_original"],
        )
    return images


def find_normalized_match(site_sku: str, catalog_by_sku: dict[str, CatalogImage]) -> str | None:
    alias_target = HIGH_CONFIDENCE_ALIAS_TO_CATALOG.get(site_sku)
    if alias_target and alias_target in catalog_by_sku:
        return alias_target

    site_compact = compact_sku(site_sku)
    candidates = [sku for sku in catalog_by_sku if compact_sku(sku) == site_compact]
    if len(candidates) == 1:
        return candidates[0]
    return None


def find_probable_match(site_sku: str, catalog_by_sku: dict[str, CatalogImage]) -> tuple[str | None, str]:
    alias_target = PROBABLE_ALIAS_TO_CATALOG.get(site_sku)
    if alias_target and alias_target in catalog_by_sku:
        return alias_target, "Alias provável baseado em variante/sufixo do SKU."
    return None, ""


def current_image_needs_link(site_product: SiteProduct, catalog_image: CatalogImage | None) -> bool:
    if not catalog_image:
        return False
    if not site_product.image_url:
        return True
    if site_product.image_url == catalog_image.image_url:
        return False
    if site_product.image_url.startswith("produto_"):
        return True
    if "placeholder" in site_product.image_url:
        return True
    return False


def build_rows(site_by_sku: dict[str, SiteProduct], catalog_by_sku: dict[str, CatalogImage]) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    consumed_catalog_skus: set[str] = set()

    for site_sku in sorted(site_by_sku):
        site_product = site_by_sku[site_sku]
        catalog_sku = None
        tipo_match = "sem_match"
        observacao = ""

        if site_sku in catalog_by_sku:
            catalog_sku = site_sku
            tipo_match = "exato"
            observacao = "SKU idêntico no catálogo e no site."
        else:
            normalized_match = find_normalized_match(site_sku, catalog_by_sku)
            if normalized_match:
                catalog_sku = normalized_match
                tipo_match = "normalizado"
                observacao = "Correspondência determinística após normalização/alias seguro."
            else:
                probable_match, probable_note = find_probable_match(site_sku, catalog_by_sku)
                if probable_match:
                    catalog_sku = probable_match
                    tipo_match = "provavel"
                    observacao = probable_note

        catalog_image = catalog_by_sku.get(catalog_sku) if catalog_sku else None
        if catalog_sku:
            consumed_catalog_skus.add(catalog_sku)

        precisa_revisao_manual = tipo_match in {"provavel", "sem_match"}
        precisa_vincular_imagem = (
            tipo_match in {"exato", "normalizado"}
            and current_image_needs_link(site_product, catalog_image)
        )

        if tipo_match == "sem_match":
            status_match = "grupo_d_revisao_manual"
            if not observacao:
                observacao = "SKU do site sem correspondência segura no catálogo/imagens."
        elif precisa_vincular_imagem:
            status_match = "grupo_b_vincular_imagem"
        else:
            status_match = "grupo_a_existente_match_exato"

        rows.append(
            {
                "sku_site": site_sku,
                "sku_catalogo": catalog_sku or "",
                "status_match": status_match,
                "tipo_match": tipo_match,
                "imagem_encontrada": bool(catalog_image),
                "produto_ja_existe_no_site": True,
                "precisa_cadastrar": False,
                "precisa_vincular_imagem": precisa_vincular_imagem,
                "precisa_revisao_manual": precisa_revisao_manual,
                "observacao": observacao,
                "site_name": site_product.name,
                "site_catalog_type": site_product.catalog_type,
                "current_image_url": site_product.image_url,
                "catalog_image_url": catalog_image.image_url if catalog_image else "",
                "catalog_image_file": catalog_image.filename if catalog_image else "",
                "catalog_source_label": catalog_image.source_label if catalog_image else "",
            }
        )

    for catalog_sku in sorted(catalog_by_sku):
        if catalog_sku in consumed_catalog_skus:
            continue

        catalog_image = catalog_by_sku[catalog_sku]
        matching_site_sku = None
        tipo_match = "sem_match"
        observacao = "SKU do catálogo não encontrado no site público."

        for site_sku in site_by_sku:
            if find_normalized_match(site_sku, {catalog_sku: catalog_image}) == catalog_sku:
                matching_site_sku = site_sku
                tipo_match = "normalizado"
                observacao = "SKU do catálogo corresponde a SKU já existente após normalização segura."
                break
            probable_target, probable_note = find_probable_match(site_sku, {catalog_sku: catalog_image})
            if probable_target == catalog_sku:
                matching_site_sku = site_sku
                tipo_match = "provavel"
                observacao = probable_note
                break

        precisa_revisao_manual = tipo_match == "provavel"
        precisa_cadastrar = not matching_site_sku

        rows.append(
            {
                "sku_site": matching_site_sku or "",
                "sku_catalogo": catalog_sku,
                "status_match": (
                    "grupo_d_revisao_manual"
                    if tipo_match == "provavel"
                    else "grupo_c_cadastrar"
                    if precisa_cadastrar
                    else "grupo_b_vincular_imagem"
                ),
                "tipo_match": tipo_match if tipo_match != "sem_match" else "sem_match",
                "imagem_encontrada": True,
                "produto_ja_existe_no_site": bool(matching_site_sku),
                "precisa_cadastrar": precisa_cadastrar,
                "precisa_vincular_imagem": bool(matching_site_sku) and tipo_match in {"normalizado"},
                "precisa_revisao_manual": precisa_revisao_manual,
                "observacao": observacao,
                "site_name": site_by_sku[matching_site_sku].name if matching_site_sku else "",
                "site_catalog_type": site_by_sku[matching_site_sku].catalog_type if matching_site_sku else "",
                "current_image_url": site_by_sku[matching_site_sku].image_url if matching_site_sku else "",
                "catalog_image_url": catalog_image.image_url,
                "catalog_image_file": catalog_image.filename,
                "catalog_source_label": catalog_image.source_label,
            }
        )

    return rows


def write_csv(path: Path, rows: Iterable[dict[str, object]], fieldnames: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def main() -> None:
    site_by_sku = fetch_site_products()
    catalog_by_sku = load_catalog_images()
    rows = build_rows(site_by_sku, catalog_by_sku)

    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    audit_json = OUTPUT_DIR / "audit_sku_matches.json"
    audit_csv = OUTPUT_DIR / "audit_sku_matches.csv"
    products_to_create_csv = OUTPUT_DIR / "products_to_create.csv"
    products_to_link_images_csv = OUTPUT_DIR / "products_to_link_images.csv"
    manual_review_csv = OUTPUT_DIR / "manual_review.csv"

    audit_json.write_text(json.dumps(rows, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(audit_csv, rows, list(rows[0].keys()))

    products_to_create = [
        {
            "name": "",
            "sku": row["sku_catalogo"],
            "description": "",
            "category_slug": "",
            "catalog_type": "",
            "price_unit": "",
            "price_box": "",
            "stock_unit": "",
            "stock_box": "",
            "quantity_per_box": "",
            "main_image": row["catalog_image_url"],
            "observacao": row["observacao"],
        }
        for row in rows
        if row["status_match"] == "grupo_c_cadastrar"
    ]
    write_csv(
        products_to_create_csv,
        products_to_create,
        [
            "name",
            "sku",
            "description",
            "category_slug",
            "catalog_type",
            "price_unit",
            "price_box",
            "stock_unit",
            "stock_box",
            "quantity_per_box",
            "main_image",
            "observacao",
        ],
    )

    products_to_link_images = [
        {
            "sku_site": row["sku_site"],
            "site_name": row["site_name"],
            "tipo_match": row["tipo_match"],
            "current_image_url": row["current_image_url"],
            "new_image_url": row["catalog_image_url"],
            "catalog_image_file": row["catalog_image_file"],
            "observacao": row["observacao"],
        }
        for row in rows
        if row["status_match"] == "grupo_b_vincular_imagem"
    ]
    write_csv(
        products_to_link_images_csv,
        products_to_link_images,
        [
            "sku_site",
            "site_name",
            "tipo_match",
            "current_image_url",
            "new_image_url",
            "catalog_image_file",
            "observacao",
        ],
    )

    manual_review = [
        {
            "sku_site": row["sku_site"],
            "sku_catalogo": row["sku_catalogo"],
            "tipo_match": row["tipo_match"],
            "site_name": row["site_name"],
            "current_image_url": row["current_image_url"],
            "catalog_image_url": row["catalog_image_url"],
            "catalog_image_file": row["catalog_image_file"],
            "observacao": row["observacao"],
        }
        for row in rows
        if row["status_match"] == "grupo_d_revisao_manual"
    ]
    write_csv(
        manual_review_csv,
        manual_review,
        [
            "sku_site",
            "sku_catalogo",
            "tipo_match",
            "site_name",
            "current_image_url",
            "catalog_image_url",
            "catalog_image_file",
            "observacao",
        ],
    )

    counts = {
        "grupo_a_existente_match_exato": 0,
        "grupo_b_vincular_imagem": 0,
        "grupo_c_cadastrar": 0,
        "grupo_d_revisao_manual": 0,
    }
    for row in rows:
        counts[row["status_match"]] += 1

    print(json.dumps(
        {
            "site_skus": len(site_by_sku),
            "catalog_skus": len(catalog_by_sku),
            "audit_rows": len(rows),
            "counts": counts,
            "outputs": {
                "audit_json": str(audit_json),
                "audit_csv": str(audit_csv),
                "products_to_create_csv": str(products_to_create_csv),
                "products_to_link_images_csv": str(products_to_link_images_csv),
                "manual_review_csv": str(manual_review_csv),
            },
        },
        ensure_ascii=False,
        indent=2,
    ))


if __name__ == "__main__":
    main()
