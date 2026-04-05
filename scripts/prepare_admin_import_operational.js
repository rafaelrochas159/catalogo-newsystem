const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const ROOT = process.cwd();
const AUDIT_DIR = path.join(ROOT, 'artifacts', 'catalog_audit');
const SOURCE_CSV = path.join(AUDIT_DIR, 'create_products_ready.csv');
const OUTPUT_CSV = path.join(AUDIT_DIR, 'admin_import_operacional.csv');
const OUTPUT_XLSX = path.join(AUDIT_DIR, 'admin_import_operacional.xlsx');
const OUTPUT_TXT = path.join(AUDIT_DIR, 'admin_import_instrucoes.txt');
const OUTPUT_JSON = path.join(AUDIT_DIR, 'admin_import_resumo.json');

const REQUIRED_ORDER = [
  'sku',
  'slug_sugerido',
  'imagem_principal',
  'name',
  'category_slug',
  'catalog_type',
  'preco_unitario',
  'preco_caixa',
  'quantidade_por_caixa',
  'is_active',
  'status_preenchimento',
  'campos_pendentes',
  'observacoes',
];

function readCsvRows(filePath) {
  const workbook = XLSX.readFile(filePath, { raw: false });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function hasValue(value) {
  return String(value ?? '').trim() !== '';
}

function isValidPrice(value) {
  if (!hasValue(value)) return false;
  const normalized = String(value).replace(',', '.').trim();
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed > 0;
}

function collectPendingFields(row) {
  const pending = [];

  if (!hasValue(row.sku)) pending.push('sku');
  if (!hasValue(row.name)) pending.push('name');
  if (!hasValue(row.slug_sugerido)) pending.push('slug_sugerido');
  if (!hasValue(row.imagem_principal)) pending.push('imagem_principal');
  if (!hasValue(row.category_slug)) pending.push('category_slug');
  if (!hasValue(row.catalog_type)) pending.push('catalog_type');
  if (!hasValue(row.is_active)) pending.push('is_active');

  const catalogType = String(row.catalog_type || '').trim().toUpperCase();
  const hasUnitPrice = isValidPrice(row.preco_unitario);
  const hasBoxPrice = isValidPrice(row.preco_caixa);

  if (!catalogType) {
    if (!hasUnitPrice && !hasBoxPrice) {
      pending.push('preco_unitario_ou_preco_caixa');
    }
  } else if (catalogType === 'UNITARIO') {
    if (!hasUnitPrice) pending.push('preco_unitario');
  } else if (catalogType === 'CAIXA_FECHADA') {
    if (!hasBoxPrice) pending.push('preco_caixa');
  } else if (catalogType === 'AMBOS') {
    if (!hasUnitPrice) pending.push('preco_unitario');
    if (!hasBoxPrice) pending.push('preco_caixa');
  } else {
    pending.push('catalog_type_invalido');
  }

  return pending;
}

function buildOperationalRows(sourceRows) {
  return sourceRows.map((row) => {
    const operational = {
      sku: String(row.sku || '').trim().toUpperCase(),
      slug_sugerido: String(row.suggested_slug || '').trim(),
      imagem_principal: String(row.main_image || '').trim(),
      name: String(row.name || '').trim(),
      category_slug: String(row.category_slug || '').trim(),
      catalog_type: String(row.catalog_type || '').trim(),
      preco_unitario: String(row.price_unit || '').trim(),
      preco_caixa: String(row.price_box || '').trim(),
      quantidade_por_caixa: String(row.quantity_per_box || '').trim(),
      is_active: 'TRUE',
      status_preenchimento: '',
      campos_pendentes: '',
      observacoes: String(row.observacao || '').trim(),
    };

    const pending = collectPendingFields(operational);
    operational.status_preenchimento = pending.length === 0 ? 'COMPLETO' : 'PENDENTE';
    operational.campos_pendentes = pending.join(', ');

    return operational;
  });
}

function buildInstructionsText() {
  return [
    'PLANILHA OPERACIONAL DE IMPORTACAO',
    '',
    'Campos obrigatorios antes do import:',
    '- sku',
    '- name',
    '- slug_sugerido',
    '- imagem_principal',
    '- category_slug',
    '- catalog_type',
    '- is_active',
    '- pelo menos um preco valido conforme o tipo:',
    '  UNITARIO -> preco_unitario',
    '  CAIXA_FECHADA -> preco_caixa',
    '  AMBOS -> preco_unitario e preco_caixa',
    '',
    'Campos que podem ficar vazios quando nao houver base segura:',
    '- quantidade_por_caixa',
    '- preco_unitario ou preco_caixa nao aplicavel ao tipo escolhido',
    '',
    'Revisar antes do import:',
    '- confirmar nome comercial correto',
    '- confirmar categoria pelo slug real existente no admin',
    '- confirmar tipo do catalogo',
    '- confirmar preco correto',
    '- confirmar se quantidade_por_caixa faz sentido para itens de caixa',
    '- confirmar se a imagem principal abre corretamente',
    '',
    'Nunca alterar manualmente sem validacao:',
    '- sku',
    '- slug_sugerido, exceto se houver conflito real de slug',
    '- imagem_principal quando a URL/arquivo ja vier da auditoria segura',
    '- qualquer SKU bloqueado em manual_review.csv',
    '',
    'Modo de uso:',
    '- preencher apenas as colunas pendentes',
    '- manter status_preenchimento e campos_pendentes como controle operacional',
    '- exportar para Excel ou CSV e usar no fluxo atual do admin/importador',
  ].join('\n');
}

function buildSummary(rows) {
  return {
    total_skus: rows.length,
    completos: rows.filter((row) => row.status_preenchimento === 'COMPLETO').length,
    pendentes: rows.filter((row) => row.status_preenchimento === 'PENDENTE').length,
    pendencias_por_produto: rows.map((row) => ({
      sku: row.sku,
      status_preenchimento: row.status_preenchimento,
      campos_pendentes: row.campos_pendentes ? row.campos_pendentes.split(', ').filter(Boolean) : [],
      imagem_principal: row.imagem_principal,
      slug_sugerido: row.slug_sugerido,
    })),
    outputs: {
      admin_import_operacional_csv: OUTPUT_CSV,
      admin_import_operacional_xlsx: OUTPUT_XLSX,
      admin_import_instrucoes_txt: OUTPUT_TXT,
      admin_import_resumo_json: OUTPUT_JSON,
    },
  };
}

function main() {
  const sourceRows = readCsvRows(SOURCE_CSV);
  const rows = buildOperationalRows(sourceRows);
  const instructions = buildInstructionsText();
  const summary = buildSummary(rows);

  const csvSheet = XLSX.utils.json_to_sheet(rows, { header: REQUIRED_ORDER });
  const csvWorkbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(csvWorkbook, csvSheet, 'Importacao');
  XLSX.writeFile(csvWorkbook, OUTPUT_CSV, { bookType: 'csv' });

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(rows, { header: REQUIRED_ORDER }), 'Importacao');
  XLSX.utils.book_append_sheet(
    workbook,
    XLSX.utils.aoa_to_sheet(instructions.split('\n').map((line) => [line])),
    'Instrucoes',
  );
  XLSX.writeFile(workbook, OUTPUT_XLSX);

  fs.writeFileSync(OUTPUT_TXT, instructions, 'utf8');
  fs.writeFileSync(OUTPUT_JSON, JSON.stringify(summary, null, 2), 'utf8');

  console.log(JSON.stringify(summary, null, 2));
}

main();
