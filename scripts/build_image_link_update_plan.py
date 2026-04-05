from __future__ import annotations

import csv
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
AUDIT_DIR = ROOT / "artifacts" / "catalog_audit"
INPUT_CSV = AUDIT_DIR / "products_to_link_images.csv"
OUTPUT_JSON = AUDIT_DIR / "image_link_update_plan.json"
OUTPUT_SQL = AUDIT_DIR / "image_link_update_plan.sql"


def main() -> None:
    if not INPUT_CSV.exists():
        raise SystemExit(f"Arquivo nao encontrado: {INPUT_CSV}")

    with INPUT_CSV.open("r", encoding="utf-8-sig", newline="") as file:
        rows = list(csv.DictReader(file))

    plan = []
    sql_lines = [
        "-- Dry run SQL gerado automaticamente.",
        "-- Revise cada linha antes de executar em producao.",
        "begin;",
        "",
    ]

    for row in rows:
        sku = str(row.get("sku_site") or "").strip().upper()
        new_image_url = str(row.get("new_image_url") or "").strip()
        current_image_url = str(row.get("current_image_url") or "").strip()
        site_name = str(row.get("site_name") or "").strip()
        if not sku or not new_image_url:
            continue

        plan.append(
            {
                "sku": sku,
                "site_name": site_name,
                "current_image_url": current_image_url,
                "new_image_url": new_image_url,
                "mode": "dry_run",
                "idempotent_where": {
                    "sku": sku,
                    "imagem_principal_not_equals": new_image_url,
                },
            }
        )

        sql_lines.extend(
            [
                f"-- {sku} | {site_name}",
                "update public.produtos",
                f"set imagem_principal = '{new_image_url}'",
                f"where upper(sku) = '{sku}'",
                f"  and coalesce(imagem_principal, '') <> '{new_image_url}';",
                "",
            ]
        )

    sql_lines.append("commit;")

    OUTPUT_JSON.write_text(json.dumps(plan, ensure_ascii=False, indent=2), encoding="utf-8")
    OUTPUT_SQL.write_text("\n".join(sql_lines), encoding="utf-8")

    print(
        json.dumps(
            {
                "updates": len(plan),
                "output_json": str(OUTPUT_JSON),
                "output_sql": str(OUTPUT_SQL),
            },
            ensure_ascii=False,
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
