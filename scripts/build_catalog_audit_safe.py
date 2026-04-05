from __future__ import annotations

import csv
import json
import os
import re
import unicodedata
import urllib.parse
import urllib.request
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable

ROOT = Path(__file__).resolve().parents[1]
IMAGE_INDEX = ROOT / "public" / "imported-product-images-clean" / "index.csv"
OUTPUT_DIR = ROOT / "artifacts" / "catalog_audit"
SUMMARY_PATH = OUTPUT_DIR / "summary.json"
PDF_CANDIDATES = [
    Path(os.environ.get("CATALOG_PDF_PATH", "")),
    Path(r"C:\Users\rafae\OneDrive\Desktop\listas cortada\altomex-1-20.pdf"),
]
SITE_URLS = {
    "CAIXA_FECHADA": "https://catalogo-newsystem.vercel.app/catalogo/caixa-fechada",
    "UNITARIO": "https://catalogo-newsystem.vercel.app/catalogo/unitario",
}

# Correspondencias deterministicas e seguras. Entram aqui apenas variacoes de
# separador/normalizacao, sem inferencia comercial.
HIGH_CONFIDENCE_ALIAS_TO_CATALOG = {
    "J-60-AIR39": "J-60-AIR-39",
}

# Casos visivelmente relacionados, mas ainda inseguros para vinculo automatico.
PROBABLE_ALIAS_TO_CATALOG = {
    "A-607-Q-MC": "A-607-Q",
    "A-607-W-PB": "A-607-W",
    "A-607-Y-2": "A-607-Y",
    "F-060-BW": "F-060",
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
class CatalogEntry:
    sku_normalized: str
    sku_original: str
    filename: str
    image_url: str
    page: str
    row: str
    col: str
    status: str


@dataclass
class CatalogGroup:
    sku: str
    entries: list[CatalogEntry]

    @property
    def unique_filenames(self) -> list[str]:
        return sorted({entry.filename for entry in self.entries})

    @property
    def unique_source_labels(self) -> list[str]:
        return sorted({entry.sku_original for entry in self.entries})

    @property
    def image_url(self) -> str:
        return self.entries[0].image_url if self.entries else ""

    @property
    def is_safe_single_image(self) -> bool:
        return len(self.unique_filenames) == 1


def normalize_sku(value: str | None) -> str:
    text = unicodedata.normalize("NFKC", str(value or "")).upper().strip()
    text = text.replace("_", "-").replace(" ", "-")
    text = text.replace("（", "(").replace("）", ")")
    text = text.replace("(AIR31)", "-AIR31").replace("(AIR-31)", "-AIR31")
    text = text.replace("(AIR39)", "-AIR39").replace("(AIR-39)", "-AIR39")
    text = text.replace("(M10)", "-M10")
    text = text.replace("(", "-").replace(")", "")
    text = re.sub(r"[^A-Z0-9-]", "", text)
    text = re.sub(r"-+", "-", text).strip("-")

    remaps = {
        "AL-8391-B": "AL-8391",
        "AG-690-B": "AG-690",
        "AL-2743-B": "AL-2743",
        "AL-D890-C": "AL-D890",
    }
    return remaps.get(text, text)


def compact_sku(value: str) -> str:
    return re.sub(r"[^A-Z0-9]", "", normalize_sku(value))


def find_pdf_path() -> Path | None:
    for candidate in PDF_CANDIDATES:
        if not candidate:
            continue
        if str(candidate).strip() in {"", "."}:
            continue
        if candidate.exists() and candidate.is_file():
            return candidate
    return None


def load_pdf_presence() -> set[str]:
    pdf_path = find_pdf_path()
    if not pdf_path:
        return set()

    try:
        from pypdf import PdfReader
    except Exception:
        return set()

    reader = PdfReader(str(pdf_path))
    full_text = " ".join((page.extract_text() or "") for page in reader.pages)
    full_text = unicodedata.normalize("NFKC", full_text).upper()
    compact_text = re.sub(r"[^A-Z0-9]", "", full_text)

    present: set[str] = set()
    with IMAGE_INDEX.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    candidate_skus = {
        normalize_sku(row["sku_original"])
        for row in rows
        if normalize_sku(row["sku_original"])
    }
    candidate_skus.update(HIGH_CONFIDENCE_ALIAS_TO_CATALOG.values())
    candidate_skus.update(PROBABLE_ALIAS_TO_CATALOG.values())

    for sku in candidate_skus:
        if compact_sku(sku) and compact_sku(sku) in compact_text:
            present.add(sku)

    return present


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
            image_url = urllib.parse.unquote(query.get("url", [""])[0])
            products[sku] = SiteProduct(
                sku=sku,
                name=name,
                image_url=image_url,
                catalog_type=catalog_type,
                page_url=url,
            )

    return products


def load_catalog_groups() -> dict[str, CatalogGroup]:
    groups: dict[str, list[CatalogEntry]] = defaultdict(list)
    with IMAGE_INDEX.open("r", encoding="utf-8-sig", newline="") as file:
        for row in csv.DictReader(file):
            sku = normalize_sku(row["sku_original"])
            groups[sku].append(
                CatalogEntry(
                    sku_normalized=sku,
                    sku_original=row["sku_original"],
                    filename=row["filename"],
                    image_url=f"/imported-product-images-clean/{row['filename']}",
                    page=row.get("page", ""),
                    row=row.get("row", ""),
                    col=row.get("col", ""),
                    status=row.get("status", ""),
                )
            )

    return {
        sku: CatalogGroup(sku=sku, entries=entries)
        for sku, entries in sorted(groups.items())
    }


def find_normalized_match(site_sku: str, catalog_by_sku: dict[str, CatalogGroup]) -> tuple[str | None, str]:
    alias_target = HIGH_CONFIDENCE_ALIAS_TO_CATALOG.get(site_sku)
    if alias_target and alias_target in catalog_by_sku:
        return alias_target, "Correspondencia deterministica por alias seguro."

    site_compact = compact_sku(site_sku)
    candidates = [sku for sku in catalog_by_sku if compact_sku(sku) == site_compact]
    if len(candidates) == 1:
        return candidates[0], "Correspondencia deterministica apos normalizacao segura."
    return None, ""


def find_probable_match(site_sku: str, catalog_by_sku: dict[str, CatalogGroup]) -> tuple[str | None, str]:
    alias_target = PROBABLE_ALIAS_TO_CATALOG.get(site_sku)
    if alias_target and alias_target in catalog_by_sku:
        return alias_target, "Alias provavel por variante/sufixo; exige revisao manual."
    return None, ""


def current_image_needs_link(site_product: SiteProduct, catalog_group: CatalogGroup | None) -> bool:
    if not catalog_group or not catalog_group.is_safe_single_image:
        return False
    if not site_product.image_url:
        return True
    if "placeholder" in site_product.image_url:
        return True
    if site_product.image_url.startswith("produto_"):
        return True
    if site_product.image_url.startswith("/imported-product-images-clean/"):
        return True
    return site_product.image_url != catalog_group.image_url


def find_catalog_match_for_site(
    site_sku: str, catalog_by_sku: dict[str, CatalogGroup]
) -> tuple[str | None, str, str]:
    if site_sku in catalog_by_sku:
        return site_sku, "exato", "SKU identico no catalogo e no site."

    normalized_match, normalized_note = find_normalized_match(site_sku, catalog_by_sku)
    if normalized_match:
        return normalized_match, "normalizado", normalized_note

    probable_match, probable_note = find_probable_match(site_sku, catalog_by_sku)
    if probable_match:
        return probable_match, "provavel", probable_note

    return None, "sem_match", "SKU do site sem correspondencia segura no catalogo/imagens."


def build_rows(
    site_by_sku: dict[str, SiteProduct],
    catalog_by_sku: dict[str, CatalogGroup],
    pdf_presence: set[str],
) -> list[dict[str, object]]:
    rows: list[dict[str, object]] = []
    consumed_catalog_skus: set[str] = set()

    for site_sku in sorted(site_by_sku):
        site_product = site_by_sku[site_sku]
        catalog_sku, tipo_match, observacao = find_catalog_match_for_site(site_sku, catalog_by_sku)
        catalog_group = catalog_by_sku.get(catalog_sku) if catalog_sku else None
        if catalog_sku:
            consumed_catalog_skus.add(catalog_sku)

        is_ambiguous_catalog = bool(catalog_group) and not catalog_group.is_safe_single_image
        precisa_revisao_manual = tipo_match in {"provavel", "sem_match"} or is_ambiguous_catalog
        precisa_vincular_imagem = (
            tipo_match in {"exato", "normalizado"}
            and not precisa_revisao_manual
            and current_image_needs_link(site_product, catalog_group)
        )

        if tipo_match == "sem_match" or is_ambiguous_catalog or tipo_match == "provavel":
            status_match = "grupo_d_revisao_manual"
        elif precisa_vincular_imagem:
            status_match = "grupo_b_vincular_imagem"
        else:
            status_match = "grupo_a_match_exato"

        if is_ambiguous_catalog:
            observacao = (
                f"{observacao} Catalogo tem multiplos arquivos para o mesmo SKU normalizado; "
                "nao e seguro vincular automaticamente."
            ).strip()

        rows.append(
            {
                "sku_site": site_sku,
                "sku_catalogo": catalog_sku or "",
                "status_match": status_match,
                "tipo_match": tipo_match,
                "imagem_encontrada": bool(catalog_group),
                "produto_ja_existe_no_site": True,
                "precisa_cadastrar": False,
                "precisa_vincular_imagem": precisa_vincular_imagem,
                "precisa_revisao_manual": precisa_revisao_manual,
                "observacao": observacao,
                "site_name": site_product.name,
                "site_catalog_type": site_product.catalog_type,
                "current_image_url": site_product.image_url,
                "catalog_image_url": catalog_group.image_url if catalog_group else "",
                "catalog_files": "|".join(catalog_group.unique_filenames) if catalog_group else "",
                "catalog_source_labels": "|".join(catalog_group.unique_source_labels) if catalog_group else "",
                "catalog_entries_count": len(catalog_group.entries) if catalog_group else 0,
                "catalog_safe_single_image": catalog_group.is_safe_single_image if catalog_group else False,
                "pdf_encontrado": bool(catalog_sku and catalog_sku in pdf_presence),
                "fonte_validacao": (
                    "site+catalogo+pdf"
                    if catalog_sku and catalog_sku in pdf_presence
                    else "site+catalogo"
                    if catalog_sku
                    else "site"
                ),
            }
        )

    for catalog_sku in sorted(catalog_by_sku):
        if catalog_sku in consumed_catalog_skus:
            continue

        catalog_group = catalog_by_sku[catalog_sku]
        matching_site_sku = None
        tipo_match = "sem_match"
        observacao = "SKU do catalogo nao encontrado no site publico."

        for site_sku in site_by_sku:
            normalized_match, normalized_note = find_normalized_match(site_sku, {catalog_sku: catalog_group})
            if normalized_match == catalog_sku:
                matching_site_sku = site_sku
                tipo_match = "normalizado"
                observacao = normalized_note
                break
            probable_target, probable_note = find_probable_match(site_sku, {catalog_sku: catalog_group})
            if probable_target == catalog_sku:
                matching_site_sku = site_sku
                tipo_match = "provavel"
                observacao = probable_note
                break

        precisa_cadastrar = not matching_site_sku
        precisa_revisao_manual = tipo_match == "provavel" or not catalog_group.is_safe_single_image
        precisa_vincular_imagem = bool(matching_site_sku) and tipo_match == "normalizado" and not precisa_revisao_manual

        if precisa_cadastrar:
            status_match = "grupo_c_cadastrar"
        elif precisa_revisao_manual:
            status_match = "grupo_d_revisao_manual"
        else:
            status_match = "grupo_b_vincular_imagem"

        if not catalog_group.is_safe_single_image:
            observacao = (
                f"{observacao} Catalogo tem multiplos arquivos para o mesmo SKU normalizado; "
                "revisao manual obrigatoria."
            ).strip()

        rows.append(
            {
                "sku_site": matching_site_sku or "",
                "sku_catalogo": catalog_sku,
                "status_match": status_match,
                "tipo_match": tipo_match,
                "imagem_encontrada": True,
                "produto_ja_existe_no_site": bool(matching_site_sku),
                "precisa_cadastrar": precisa_cadastrar,
                "precisa_vincular_imagem": precisa_vincular_imagem,
                "precisa_revisao_manual": precisa_revisao_manual,
                "observacao": observacao,
                "site_name": site_by_sku[matching_site_sku].name if matching_site_sku else "",
                "site_catalog_type": site_by_sku[matching_site_sku].catalog_type if matching_site_sku else "",
                "current_image_url": site_by_sku[matching_site_sku].image_url if matching_site_sku else "",
                "catalog_image_url": catalog_group.image_url,
                "catalog_files": "|".join(catalog_group.unique_filenames),
                "catalog_source_labels": "|".join(catalog_group.unique_source_labels),
                "catalog_entries_count": len(catalog_group.entries),
                "catalog_safe_single_image": catalog_group.is_safe_single_image,
                "pdf_encontrado": catalog_sku in pdf_presence,
                "fonte_validacao": "catalogo+pdf" if catalog_sku in pdf_presence else "catalogo",
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


def build_summary(rows: list[dict[str, object]]) -> dict[str, object]:
    group_counts: dict[str, int] = defaultdict(int)
    match_counts: dict[str, int] = defaultdict(int)
    for row in rows:
        group_counts[str(row["status_match"])] += 1
        match_counts[str(row["tipo_match"])] += 1

    problematic = [
        row for row in rows
        if row["status_match"] in {"grupo_b_vincular_imagem", "grupo_c_cadastrar", "grupo_d_revisao_manual"}
    ]
    return {
        "total_rows": len(rows),
        "group_counts": dict(sorted(group_counts.items())),
        "match_counts": dict(sorted(match_counts.items())),
        "problematic_rows": len(problematic),
        "products_to_create": sum(1 for row in rows if row["status_match"] == "grupo_c_cadastrar"),
        "products_to_link_images": sum(
            1 for row in rows if row["status_match"] == "grupo_b_vincular_imagem"
        ),
        "manual_review": sum(1 for row in rows if row["status_match"] == "grupo_d_revisao_manual"),
    }


def main() -> None:
    site_by_sku = fetch_site_products()
    catalog_by_sku = load_catalog_groups()
    pdf_presence = load_pdf_presence()
    rows = build_rows(site_by_sku, catalog_by_sku, pdf_presence)

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
            "catalog_files": row["catalog_files"],
            "catalog_source_labels": row["catalog_source_labels"],
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
            "catalog_files",
            "catalog_source_labels",
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
            "catalog_files": row["catalog_files"],
            "catalog_source_labels": row["catalog_source_labels"],
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
            "catalog_files",
            "catalog_source_labels",
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
            "catalog_files": row["catalog_files"],
            "catalog_source_labels": row["catalog_source_labels"],
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
            "catalog_files",
            "catalog_source_labels",
            "observacao",
        ],
    )

    SUMMARY_PATH.write_text(
        json.dumps(build_summary(rows), ensure_ascii=False, indent=2), encoding="utf-8"
    )

    print(json.dumps(build_summary(rows), ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
