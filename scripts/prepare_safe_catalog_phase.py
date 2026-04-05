from __future__ import annotations

import csv
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_DIR = ROOT / "artifacts" / "catalog_audit"
CREATE_SOURCE = AUDIT_DIR / "products_to_create.csv"
LINK_SOURCE = AUDIT_DIR / "products_to_link_images.csv"
MANUAL_REVIEW_SOURCE = AUDIT_DIR / "manual_review.csv"
AUDIT_SOURCE = AUDIT_DIR / "audit_sku_matches.csv"

CREATE_READY_CSV = AUDIT_DIR / "create_products_ready.csv"
CREATE_READY_JSON = AUDIT_DIR / "create_products_ready.json"
SAFE_UPDATES_SQL = AUDIT_DIR / "safe_image_updates.sql"
SAFE_UPDATES_JSON = AUDIT_DIR / "safe_image_updates.json"
EXECUTION_SUMMARY_JSON = AUDIT_DIR / "execution_summary.json"

SAFE_IMAGE_UPDATE_SKUS = {"J-60-AIR39"}


def read_csv(path: Path) -> list[dict[str, str]]:
    with path.open("r", encoding="utf-8-sig", newline="") as file:
        return list(csv.DictReader(file))


def write_csv(path: Path, rows: list[dict[str, object]], fieldnames: list[str]) -> None:
    with path.open("w", encoding="utf-8-sig", newline="") as file:
        writer = csv.DictWriter(file, fieldnames=fieldnames)
        writer.writeheader()
        for row in rows:
            writer.writerow(row)


def make_slug_from_sku(sku: str) -> str:
    return re.sub(r"[^a-z0-9-]", "", sku.strip().lower().replace("_", "-").replace(" ", "-"))


def is_valid_image_reference(value: str) -> bool:
    value = str(value or "").strip()
    if not value:
        return False
    if value.startswith("/imported-product-images-clean/"):
        return (ROOT / "public" / value.lstrip("/")).exists()
    if value.startswith("http://") or value.startswith("https://"):
        return True
    return False


def main() -> None:
    create_rows = read_csv(CREATE_SOURCE)
    link_rows = read_csv(LINK_SOURCE)
    manual_rows = read_csv(MANUAL_REVIEW_SOURCE)
    audit_rows = read_csv(AUDIT_SOURCE)

    manual_skus = {
        str(row.get("sku_site") or "").strip().upper()
        for row in manual_rows
        if str(row.get("sku_site") or "").strip()
    }
    manual_skus.update(
        {
            str(row.get("sku_catalogo") or "").strip().upper()
            for row in manual_rows
            if str(row.get("sku_catalogo") or "").strip()
        }
    )

    create_ready: list[dict[str, object]] = []
    create_skus: set[str] = set()
    create_slug_counts: dict[str, int] = {}

    for row in create_rows:
        sku = str(row.get("sku") or "").strip().upper()
        if not sku:
            continue
        if sku in manual_skus:
            raise RuntimeError(f"SKU ambíguo entrou indevidamente no create: {sku}")
        if sku in create_skus:
            raise RuntimeError(f"SKU duplicado no create: {sku}")
        create_skus.add(sku)

        suggested_slug = make_slug_from_sku(sku)
        create_slug_counts[suggested_slug] = create_slug_counts.get(suggested_slug, 0) + 1

        create_ready.append(
            {
                "name": row.get("name") or "",
                "sku": sku,
                "description": row.get("description") or "",
                "category_slug": row.get("category_slug") or "",
                "catalog_type": row.get("catalog_type") or "",
                "price_unit": row.get("price_unit") or "",
                "price_box": row.get("price_box") or "",
                "stock_unit": row.get("stock_unit") or "0",
                "stock_box": row.get("stock_box") or "0",
                "quantity_per_box": row.get("quantity_per_box") or "",
                "main_image": row.get("main_image") or "",
                "gallery_images": "",
                "suggested_slug": suggested_slug,
                "ready_mode": "dry_run",
                "requires_manual_fill": True,
                "validation_image_ok": is_valid_image_reference(str(row.get("main_image") or "")),
                "observacao": row.get("observacao") or "",
            }
        )

    duplicate_slugs = sorted([slug for slug, count in create_slug_counts.items() if count > 1])

    safe_link_candidates = [row for row in link_rows if str(row.get("sku_site") or "").strip().upper() in SAFE_IMAGE_UPDATE_SKUS]
    if len(safe_link_candidates) != 1:
        raise RuntimeError(f"Esperado exatamente 1 update seguro, encontrado {len(safe_link_candidates)}")

    safe_updates: list[dict[str, object]] = []
    sql_lines = [
        "-- Dry run seguro. Execute manualmente apenas se validado.",
        "begin;",
        "",
    ]

    for row in safe_link_candidates:
        sku = str(row.get("sku_site") or "").strip().upper()
        if sku in manual_skus:
            raise RuntimeError(f"SKU ambíguo entrou indevidamente no update: {sku}")

        current_image = str(row.get("current_image_url") or "").strip()
        new_image = str(row.get("new_image_url") or "").strip()
        site_name = str(row.get("site_name") or "").strip()
        if not is_valid_image_reference(new_image):
            raise RuntimeError(f"Imagem segura inválida para {sku}: {new_image}")

        safe_updates.append(
            {
                "sku": sku,
                "site_name": site_name,
                "before_image": current_image,
                "after_image": new_image,
                "mode": "dry_run",
                "idempotent": True,
                "will_change_only_if_different": True,
            }
        )

        sql_lines.extend(
            [
                f"-- {sku} | {site_name}",
                "update public.produtos",
                f"set imagem_principal = '{new_image}'",
                f"where upper(sku) = '{sku}'",
                f"  and coalesce(imagem_principal, '') <> '{new_image}';",
                "",
            ]
        )

    sql_lines.append("commit;")

    CREATE_READY_JSON.write_text(json.dumps(create_ready, ensure_ascii=False, indent=2), encoding="utf-8")
    write_csv(
        CREATE_READY_CSV,
        create_ready,
        list(create_ready[0].keys()) if create_ready else [
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
            "gallery_images",
            "suggested_slug",
            "ready_mode",
            "requires_manual_fill",
            "validation_image_ok",
            "observacao",
        ],
    )
    SAFE_UPDATES_JSON.write_text(json.dumps(safe_updates, ensure_ascii=False, indent=2), encoding="utf-8")
    SAFE_UPDATES_SQL.write_text("\n".join(sql_lines), encoding="utf-8")

    summary = {
        "mode_default": "dry_run",
        "mode_execute": "manual_and_explicit_only",
        "products_to_create_count": len(create_ready),
        "safe_image_updates_count": len(safe_updates),
        "safe_image_update_skus": [item["sku"] for item in safe_updates],
        "blocked_manual_review_count": len(manual_rows),
        "blocked_manual_review_skus": sorted(manual_skus),
        "validations": {
            "duplicate_sku_in_create": False,
            "duplicate_slug_in_create": len(duplicate_slugs) > 0,
            "duplicate_slug_values": duplicate_slugs,
            "manual_review_overlap_in_create": any(row["sku"] in manual_skus for row in create_ready),
            "manual_review_overlap_in_updates": any(item["sku"] in manual_skus for item in safe_updates),
            "all_create_images_valid": all(bool(row["validation_image_ok"]) for row in create_ready),
            "all_update_images_valid": all(is_valid_image_reference(str(item["after_image"])) for item in safe_updates),
        },
        "source_artifacts": {
            "create_source": str(CREATE_SOURCE),
            "link_source": str(LINK_SOURCE),
            "manual_review_source": str(MANUAL_REVIEW_SOURCE),
            "audit_source": str(AUDIT_SOURCE),
        },
        "outputs": {
            "create_products_ready_csv": str(CREATE_READY_CSV),
            "create_products_ready_json": str(CREATE_READY_JSON),
            "safe_image_updates_sql": str(SAFE_UPDATES_SQL),
            "safe_image_updates_json": str(SAFE_UPDATES_JSON),
            "execution_summary_json": str(EXECUTION_SUMMARY_JSON),
        },
    }
    EXECUTION_SUMMARY_JSON.write_text(json.dumps(summary, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(summary, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
