const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const ROOT = process.cwd();
const ARTIFACTS_DIR = path.join(ROOT, 'artifacts', 'catalog_audit');
const PUBLIC_IMAGES_DIR = path.join(ROOT, 'public', 'imported-product-images-clean');
const EXECUTE = process.argv.includes('--execute');

const REQUIRED_ENV_KEYS = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
];

const BLOCKED_SKUS = [
  'A-05-TYPE-C',
  'A-607-Q',
  'A-607-Q-MC',
  'A-607-W-PB',
  'A-607-Y-2',
  'AG-690-C',
  'AL-15-CC',
  'AL-305-V8',
  'AL-306-5G',
  'AL-C91-TYPE-C',
  'AL-HDMI-10M',
  'AL-U-32',
  'C-052',
  'EL-3111-5G',
  'EL-3111-CC',
  'EL-3111-TY',
  'EL-3111-V8',
  'F-060',
  'F-060-BW',
  'I12-TWS',
  'J-60',
  'J-70-PRO-B-2',
  'K9-IP-2IN1',
  'M-10',
];

const SAFE_PRODUCTS = [
  {
    sku: 'AJ-3452',
    nome: 'Guarda Chuva 23 Polegadas AJ-3452',
    category_slug: 'guarda-chuva',
    category_name: 'Guarda Chuva',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 31.9,
    quantidade_por_caixa: 60,
    imagem_principal: '/imported-product-images-clean/AJ-3452.png',
    evidence:
      'Imagem AJ-3452: guarda chuva, 23 polegadas, comprimento 105cm, PCS/CX 60, UNID.CX R$ 31,9.',
  },
  {
    sku: 'AJ-3453',
    nome: 'Guarda Chuva 21 Polegadas AJ-3453',
    category_slug: 'guarda-chuva',
    category_name: 'Guarda Chuva',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 26.6,
    quantidade_por_caixa: 60,
    imagem_principal: '/imported-product-images-clean/AJ-3453.png',
    evidence:
      'Imagem AJ-3453: guarda chuva, 21 polegadas, comprimento 98cm, PCS/CX 60, UNID.CX R$ 26,6.',
  },
  {
    sku: 'AL-1010',
    nome: 'Rastreador AL-1010',
    category_slug: 'rastreador',
    category_name: 'Rastreador',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 13.3,
    quantidade_por_caixa: 100,
    imagem_principal: '/imported-product-images-clean/AL-1010.png',
    evidence:
      'Imagem AL-1010: rastreador, bateria CR2032, iOS, PCS/CX 100, UNID.CX R$ 13,3.',
  },
  {
    sku: 'AL-2659',
    nome: 'Telescopio Monocular AL-2659',
    category_slug: 'telescopio',
    category_name: 'Telescopio',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 42.6,
    quantidade_por_caixa: 50,
    imagem_principal: '/imported-product-images-clean/AL-2659.png',
    evidence:
      'Imagem AL-2659: telescopio/monocular, PCS/CX 50, UNID.CX R$ 42,6.',
  },
  {
    sku: 'AL-A155',
    nome: 'Adaptador Bluetooth 3.5mm AL-A155',
    category_slug: 'adaptador-bluetooth',
    category_name: 'Adaptador Bluetooth',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 3.7,
    quantidade_por_caixa: 1000,
    imagem_principal: '/imported-product-images-clean/AL-A155.png',
    evidence:
      'Imagem AL-A155: adaptador bluetooth 3.5mm, PCS/CX 1000, UNID.CX R$ 3,7.',
  },
  {
    sku: 'AL-A230',
    nome: 'Adaptador Bluetooth USB AL-A230',
    category_slug: 'adaptador-bluetooth',
    category_name: 'Adaptador Bluetooth',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 3.7,
    quantidade_por_caixa: 1000,
    imagem_principal: '/imported-product-images-clean/AL-A230.png',
    evidence:
      'Imagem AL-A230: adaptador bluetooth USB, PCS/CX 1000, UNID.CX R$ 3,7.',
  },
  {
    sku: 'AL-C223',
    nome: 'Cadeado de Capacete AL-C223',
    category_slug: 'cadeado',
    category_name: 'Cadeado',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 7.9,
    quantidade_por_caixa: 250,
    imagem_principal: '/imported-product-images-clean/AL-C223.png',
    evidence:
      'Imagem AL-C223: cadeado/bloqueio do capacete, PCS/CX 250, UNID.CX R$ 7,9.',
  },
  {
    sku: 'AL-D890',
    nome: 'Camera de Seguranca Bocal AL-D890',
    category_slug: 'camera-de-seguranca',
    category_name: 'Camera de Seguranca',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 43.9,
    quantidade_por_caixa: 100,
    imagem_principal: '/imported-product-images-clean/AL-D890.png',
    evidence:
      'Imagem AL-D890 C款: camera de seguranca bocal, smart, PixLink, PCS/CX 100, UNID.CX R$ 43,9.',
  },
  {
    sku: 'AL-S380',
    nome: 'Camera de Seguranca AL-S380',
    category_slug: 'camera-de-seguranca',
    category_name: 'Camera de Seguranca',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 77.3,
    quantidade_por_caixa: 50,
    imagem_principal: '/imported-product-images-clean/AL-S380.png',
    evidence:
      'Imagem AL-S380: camera de seguranca 3 antenas, app Yoosee, PCS/CX 50, UNID.CX R$ 77,3.',
  },
  {
    sku: 'AU-4U',
    nome: 'Hub USB 4 Portas AU-4U',
    category_slug: 'hub-usb',
    category_name: 'Hub USB',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 13.9,
    quantidade_por_caixa: 100,
    imagem_principal: '/imported-product-images-clean/AU-4U.png',
    evidence:
      'Imagem AU-4U: hub USB 4 portas, PCS/CX 100, UNID.CX R$ 13,9.',
  },
  {
    sku: 'PN-951',
    nome: 'Powerbank 10000mAh PN-951',
    category_slug: 'powerbank',
    category_name: 'Powerbank',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 35.9,
    quantidade_por_caixa: 100,
    imagem_principal: '/imported-product-images-clean/PN-951.png',
    evidence:
      'Imagem PN-951: powerbank 10000mAh, PCS/CX 100, UNID.CX R$ 35,9.',
  },
  {
    sku: 'PN-952',
    nome: 'Powerbank 5000mAh PN-952',
    category_slug: 'powerbank',
    category_name: 'Powerbank',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 24.3,
    quantidade_por_caixa: 100,
    imagem_principal: '/imported-product-images-clean/PN-952.png',
    evidence:
      'Imagem PN-952: powerbank 5000mAh, PCS/CX 100, UNID.CX R$ 24,3.',
  },
  {
    sku: 'T10',
    nome: 'Smartwatch T10',
    category_slug: 'smartwatch',
    category_name: 'Smartwatch',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 77.3,
    quantidade_por_caixa: 50,
    imagem_principal: '/imported-product-images-clean/T10.png',
    evidence:
      'Imagem T10: smartwatch, 6 pulseiras, bateria 180mAh, PCS/CX 50, UNID.CX R$ 77,3.',
  },
  {
    sku: 'T11',
    nome: 'Smartwatch T11',
    category_slug: 'smartwatch',
    category_name: 'Smartwatch',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 77.3,
    quantidade_por_caixa: 50,
    imagem_principal: '/imported-product-images-clean/T11.png',
    evidence:
      'Imagem T11: smartwatch, 6 pulseiras, bateria 180mAh, PCS/CX 50, UNID.CX R$ 77,3.',
  },
  {
    sku: 'TX04',
    nome: 'Rastreador TX04',
    category_slug: 'rastreador',
    category_name: 'Rastreador',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 25.3,
    quantidade_por_caixa: 100,
    imagem_principal: '/imported-product-images-clean/TX04.png',
    evidence:
      'Imagem TX04: rastreador, bateria CR2032, iOS, PCS/CX 100, UNID.CX R$ 25,3.',
  },
  {
    sku: 'ZQ-01',
    nome: 'Kit de Bolas ZQ-01',
    category_slug: 'kit-de-bolas',
    category_name: 'Kit de Bolas',
    tipo_catalogo: 'CAIXA_FECHADA',
    preco_unitario: 11.9,
    quantidade_por_caixa: 800,
    imagem_principal: '/imported-product-images-clean/ZQ-01.png',
    evidence:
      'Imagem ZQ-01: kit de bolas, PCS/CX 800, UNID.CX R$ 11,9.',
  },
];

const SAFE_IMAGE_UPDATE = {
  sku: 'J-60-AIR39',
  expectedBefore: 'produto_p18_img8.jpg',
  newImage: '/imported-product-images-clean/J-60-AIR39.png',
  evidence:
    'Arte recortada J-60(AIR_39款) validada e copiada para alias ASCII J-60-AIR39.png.',
};

function loadEnv() {
  const candidates = ['.env.local', '.env.production', '.env'];
  for (const candidate of candidates) {
    const fullPath = path.join(ROOT, candidate);
    if (!fs.existsSync(fullPath)) continue;
    const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
    for (const line of lines) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (!match) continue;
      const key = match[1];
      if (!process.env[key]) {
        process.env[key] = match[2];
      }
    }
  }
}

function assertEnv() {
  const missing = REQUIRED_ENV_KEYS.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`);
  }
  return {
    NEXT_PUBLIC_SUPABASE_URL: 'ok',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'ok (masked)',
    SUPABASE_SERVICE_ROLE_KEY: 'ok (masked)',
  };
}

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function slugify(value) {
  return String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-{2,}/g, '-');
}

function money(value) {
  return Math.round(Number(value) * 100) / 100;
}

function toCsv(rows, columns) {
  const escape = (value) => {
    if (value === null || value === undefined) return '';
    const stringValue =
      typeof value === 'object' ? JSON.stringify(value) : String(value);
    return `"${stringValue.replace(/"/g, '""')}"`;
  };

  return [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => escape(row[column])).join(',')),
  ].join('\n');
}

function writeJson(fileName, data) {
  ensureDir(ARTIFACTS_DIR);
  fs.writeFileSync(
    path.join(ARTIFACTS_DIR, fileName),
    JSON.stringify(data, null, 2),
    'utf8',
  );
}

function writeCsv(fileName, rows, columns) {
  ensureDir(ARTIFACTS_DIR);
  fs.writeFileSync(path.join(ARTIFACTS_DIR, fileName), toCsv(rows, columns), 'utf8');
}

function localImagePath(publicPath) {
  return path.join(ROOT, 'public', publicPath.replace(/^\//, ''));
}

function ensureAsciiImageAliases() {
  const aliases = [
    {
      source: path.join(PUBLIC_IMAGES_DIR, 'AL-D890_C款.png'),
      target: path.join(PUBLIC_IMAGES_DIR, 'AL-D890.png'),
    },
    {
      source: path.join(PUBLIC_IMAGES_DIR, 'J-60(AIR_39款).png'),
      target: path.join(PUBLIC_IMAGES_DIR, 'J-60-AIR39.png'),
    },
  ];

  for (const alias of aliases) {
    if (!fs.existsSync(alias.source)) {
      throw new Error(`Missing source image for alias: ${alias.source}`);
    }
    if (!fs.existsSync(alias.target)) {
      fs.copyFileSync(alias.source, alias.target);
    }
  }
}

function validateSafeDataset() {
  const skuSet = new Set();
  const slugSet = new Set();
  const errors = [];

  for (const product of SAFE_PRODUCTS) {
    if (BLOCKED_SKUS.includes(product.sku)) {
      errors.push(`Blocked SKU included in safe set: ${product.sku}`);
    }

    if (skuSet.has(product.sku)) {
      errors.push(`Duplicate SKU in safe set: ${product.sku}`);
    }
    skuSet.add(product.sku);

    const suggestedSlug = `${slugify(product.nome)}-${slugify(product.sku)}`;
    if (slugSet.has(suggestedSlug)) {
      errors.push(`Duplicate slug in safe set: ${suggestedSlug}`);
    }
    slugSet.add(suggestedSlug);

    const imagePath = localImagePath(product.imagem_principal);
    if (!fs.existsSync(imagePath)) {
      errors.push(`Missing image file for ${product.sku}: ${product.imagem_principal}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}

async function fetchExistingState(supabase) {
  const categoryResponse = await supabase
    .from('categorias')
    .select('id,nome,slug,order_index,is_active');
  if (categoryResponse.error) throw categoryResponse.error;

  const skus = [...SAFE_PRODUCTS.map((product) => product.sku), SAFE_IMAGE_UPDATE.sku];
  const productResponse = await supabase
    .from('produtos')
    .select(
      'id,sku,nome,slug,imagem_principal,tipo_catalogo,preco_unitario,preco_caixa,quantidade_por_caixa,categoria_id,is_active,created_at,updated_at',
    )
    .in('sku', skus);
  if (productResponse.error) throw productResponse.error;

  return {
    categories: categoryResponse.data || [],
    products: productResponse.data || [],
  };
}

async function ensureCategories(supabase, existingCategories) {
  const bySlug = new Map(existingCategories.map((item) => [item.slug, item]));
  const created = [];
  let nextOrderIndex =
    existingCategories.reduce(
      (maxValue, category) => Math.max(maxValue, category.order_index || 0),
      0,
    ) + 1;

  for (const product of SAFE_PRODUCTS) {
    if (bySlug.has(product.category_slug)) continue;

    const payload = {
      nome: product.category_name,
      slug: product.category_slug,
      descricao: null,
      imagem_url: null,
      order_index: nextOrderIndex++,
      is_active: true,
    };

    const insert = await supabase.from('categorias').insert(payload).select().single();
    if (insert.error) throw insert.error;

    bySlug.set(product.category_slug, insert.data);
    created.push(insert.data);
  }

  return { bySlug, created };
}

function planCategories(existingCategories) {
  const bySlug = new Map(existingCategories.map((item) => [item.slug, item]));
  const missing = [];

  for (const product of SAFE_PRODUCTS) {
    if (bySlug.has(product.category_slug)) continue;
    missing.push({
      nome: product.category_name,
      slug: product.category_slug,
      descricao: null,
      imagem_url: null,
      is_active: true,
    });
  }

  return { bySlug, missing };
}

function buildProductPayload(product, categoryId) {
  const precoCaixa = money(product.preco_unitario * product.quantidade_por_caixa);
  return {
    nome: product.nome,
    slug: `${slugify(product.nome)}-${slugify(product.sku)}`,
    sku: product.sku,
    descricao: null,
    categoria_id: categoryId,
    preco_unitario: product.preco_unitario,
    preco_caixa: precoCaixa,
    estoque_unitario: 0,
    estoque_caixa: 0,
    quantidade_por_caixa: product.quantidade_por_caixa,
    imagem_principal: product.imagem_principal,
    galeria_imagens: null,
    tipo_catalogo: product.tipo_catalogo,
    is_active: true,
    is_novo: false,
    is_promocao: false,
    is_mais_vendido: false,
    is_destaque: false,
    destaque_home: false,
  };
}

async function upsertSafeProducts(supabase, categoryBySlug) {
  const rows = [];

  for (const product of SAFE_PRODUCTS) {
    const category = categoryBySlug.get(product.category_slug);
    if (!category) {
      throw new Error(`Missing category for ${product.sku}: ${product.category_slug}`);
    }

    const payload = buildProductPayload(product, category.id);
    const response = await supabase
      .from('produtos')
      .upsert(payload, { onConflict: 'sku' })
      .select(
        'id,sku,nome,slug,imagem_principal,tipo_catalogo,preco_unitario,preco_caixa,quantidade_por_caixa,categoria_id,is_active,created_at,updated_at',
      )
      .single();

    if (response.error) throw response.error;

    rows.push({
      ...response.data,
      category_slug: product.category_slug,
      category_name: product.category_name,
      evidence: product.evidence,
    });
  }

  return rows;
}

async function applySafeImageUpdate(supabase) {
  const response = await supabase
    .from('produtos')
    .select('id,sku,nome,slug,imagem_principal')
    .eq('sku', SAFE_IMAGE_UPDATE.sku)
    .single();

  if (response.error) throw response.error;

  const beforeImage = response.data.imagem_principal;
  if (beforeImage === SAFE_IMAGE_UPDATE.newImage) {
    return {
      sku: SAFE_IMAGE_UPDATE.sku,
      updated: false,
      before_image: beforeImage,
      after_image: beforeImage,
      evidence: SAFE_IMAGE_UPDATE.evidence,
    };
  }

  const update = await supabase
    .from('produtos')
    .update({ imagem_principal: SAFE_IMAGE_UPDATE.newImage })
    .eq('sku', SAFE_IMAGE_UPDATE.sku)
    .select('id,sku,nome,slug,imagem_principal')
    .single();

  if (update.error) throw update.error;

  return {
    sku: SAFE_IMAGE_UPDATE.sku,
    updated: true,
    before_image: beforeImage,
    after_image: update.data.imagem_principal,
    evidence: SAFE_IMAGE_UPDATE.evidence,
  };
}

async function validatePublicPages(baseUrl, products) {
  const results = [];
  for (const product of products) {
    const url = `${baseUrl}/produto/${product.slug}`;
    try {
      const response = await fetch(url, {
        headers: { 'cache-control': 'no-cache' },
      });
      const html = await response.text();
      results.push({
        sku: product.sku,
        slug: product.slug,
        url,
        status: response.status,
        contains_name: html.includes(product.nome),
        contains_image: html.includes(product.imagem_principal),
      });
    } catch (error) {
      results.push({
        sku: product.sku,
        slug: product.slug,
        url,
        status: 0,
        contains_name: false,
        contains_image: false,
        error: error.message,
      });
    }
  }
  return results;
}

async function main() {
  loadEnv();
  const envStatus = assertEnv();
  ensureAsciiImageAliases();
  validateSafeDataset();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false } },
  );

  const beforeState = await fetchExistingState(supabase);
  const safeSummary = {
    mode: EXECUTE ? 'execute' : 'dry_run',
    env: envStatus,
    safe_skus: SAFE_PRODUCTS.map((item) => item.sku),
    blocked_skus: BLOCKED_SKUS,
    created_categories: [],
    imported_products: [],
    image_update: null,
    errors: [],
  };

  if (!EXECUTE) {
    const categoryPlan = planCategories(beforeState.categories);
    const dryRunProducts = SAFE_PRODUCTS.map((product) => {
      const category = categoryPlan.bySlug.get(product.category_slug);
      const payload = buildProductPayload(product, category?.id || `would-create:${product.category_slug}`);
      return {
        ...payload,
        category_slug: product.category_slug,
        category_name: product.category_name,
        evidence: product.evidence,
      };
    });

    writeJson('safe_execution_report.json', {
      ...safeSummary,
      created_categories: categoryPlan.missing,
      imported_products: dryRunProducts,
      image_update: {
        sku: SAFE_IMAGE_UPDATE.sku,
        before_image:
          beforeState.products.find((item) => item.sku === SAFE_IMAGE_UPDATE.sku)
            ?.imagem_principal || null,
        after_image: SAFE_IMAGE_UPDATE.newImage,
        evidence: SAFE_IMAGE_UPDATE.evidence,
      },
      dry_run_only: true,
    });
    console.log('Dry-run concluido. Execute com --execute para gravar.');
    return;
  }

  const categoryResult = await ensureCategories(supabase, beforeState.categories);
  safeSummary.created_categories = categoryResult.created.map((item) => ({
    id: item.id,
    nome: item.nome,
    slug: item.slug,
  }));

  const importedProducts = await upsertSafeProducts(supabase, categoryResult.bySlug);
  const imageUpdate = await applySafeImageUpdate(supabase);

  const finalRows = importedProducts.map((item) => ({
    sku: item.sku,
    nome: item.nome,
    slug: item.slug,
    category_slug: item.category_slug,
    category_name: item.category_name,
    tipo_catalogo: item.tipo_catalogo,
    preco_unitario: item.preco_unitario,
    quantidade_por_caixa: item.quantidade_por_caixa,
    preco_caixa: item.preco_caixa,
    imagem_principal: item.imagem_principal,
    is_active: item.is_active,
    evidence: item.evidence,
    db_id: item.id,
  }));

  const importedProductsJson = importedProducts.map((item) => ({
    sku: item.sku,
    nome: item.nome,
    slug: item.slug,
    category_slug: item.category_slug,
    category_name: item.category_name,
    tipo_catalogo: item.tipo_catalogo,
    preco_unitario: item.preco_unitario,
    quantidade_por_caixa: item.quantidade_por_caixa,
    preco_caixa: item.preco_caixa,
    imagem_principal: item.imagem_principal,
    is_active: item.is_active,
    evidence: item.evidence,
    db_id: item.id,
  }));

  writeCsv('imported_products_final.csv', finalRows, [
    'sku',
    'nome',
    'slug',
    'category_slug',
    'category_name',
    'tipo_catalogo',
    'preco_unitario',
    'quantidade_por_caixa',
    'preco_caixa',
    'imagem_principal',
    'is_active',
    'evidence',
    'db_id',
  ]);
  writeJson('imported_products_final.json', importedProductsJson);
  writeJson('created_categories.json', categoryResult.created.map((item) => ({
    id: item.id,
    nome: item.nome,
    slug: item.slug,
    is_active: item.is_active,
  })));

  writeJson('safe_execution_report.json', {
    ...safeSummary,
    imported_products_count: importedProducts.length,
    imported_products: importedProductsJson,
    image_update: imageUpdate,
    blocked_skus_count: BLOCKED_SKUS.length,
    touched_blocked_skus: [],
  });

  const afterState = await fetchExistingState(supabase);
  const importedMap = new Map(importedProducts.map((item) => [item.sku, item]));
  const dbValidation = SAFE_PRODUCTS.map((product) => {
    const row = afterState.products.find((item) => item.sku === product.sku);
    return {
      sku: product.sku,
      exists_in_db: Boolean(row),
      nome_ok: row?.nome === product.nome,
      tipo_catalogo_ok: row?.tipo_catalogo === product.tipo_catalogo,
      imagem_ok: row?.imagem_principal === product.imagem_principal,
      preco_unitario_ok: row?.preco_unitario === product.preco_unitario,
      quantidade_por_caixa_ok:
        row?.quantidade_por_caixa === product.quantidade_por_caixa,
      preco_caixa_ok:
        row?.preco_caixa === money(product.preco_unitario * product.quantidade_por_caixa),
      categoria_ok: Boolean(row?.categoria_id),
      slug: row?.slug || null,
    };
  });

  const imageUpdateRow = afterState.products.find(
    (item) => item.sku === SAFE_IMAGE_UPDATE.sku,
  );
  const publicPageValidation = await validatePublicPages(
    process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || 'https://catalogo-newsystem.vercel.app',
    importedProducts.concat(imageUpdateRow ? [imageUpdateRow] : []),
  );

  writeJson('post_import_validation_report.json', {
    db_validation: dbValidation,
    image_update_validation: {
      sku: SAFE_IMAGE_UPDATE.sku,
      expected_image: SAFE_IMAGE_UPDATE.newImage,
      actual_image: imageUpdateRow?.imagem_principal || null,
      ok: imageUpdateRow?.imagem_principal === SAFE_IMAGE_UPDATE.newImage,
    },
    public_page_validation: publicPageValidation,
    blocked_skus_untouched: BLOCKED_SKUS,
  });

  console.log(`Importacao segura concluida: ${importedProducts.length} produtos e 1 update de imagem.`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
