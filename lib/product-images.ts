import { Produto } from '@/types';
import { GENERATED_PRODUCT_IMAGE_MANIFEST } from '@/lib/generated-product-image-manifest';

export type ProductImageLike = Partial<Pick<Produto, 'sku' | 'imagem_principal' | 'galeria_imagens'>> & {
  sku?: string | null;
  imagem_principal?: string | null;
  galeria_imagens?: string[] | null;
};

function normalizeSkuKey(value: unknown) {
  return String(value || '').trim().toUpperCase();
}

function isUsableImage(value: unknown) {
  const src = String(value || '').trim();
  if (!src) return false;
  return !src.includes('/images/placeholder.jpg');
}

function uniqueImages(items: string[]) {
  return Array.from(new Set(items.map((item) => String(item || '').trim()).filter(Boolean)));
}

const FORCE_IMPORTED_PRODUCT_IMAGE_SKUS = new Set([
  'AL-2336',
  'AL-3829',
  'AL-8391',
  'AL-3936',
]);

const BLOCK_IMPORTED_PRODUCT_IMAGE_SKUS = new Set([
  'J-60-AIR31',
  'J-80-PRO',
  'J-85-PRO',
  'J-88-PRO',
]);

const PRODUCT_IMAGE_OVERRIDES: Record<string, string[]> = {
  'AL-2336': [],
  'AL-3829': [
    '/imported-product-images-renamed/produtos_imagens_renomeadas/AL-3829.jpg',
    '/imported-product-images-renamed/produtos_imagens_renomeadas/AL-3829_1.jpg',
  ],
  'AL-8391': [
    '/imported-product-images-renamed/produtos_imagens_renomeadas/AL-8391.jpg',
    '/imported-product-images-renamed/produtos_imagens_renomeadas/AL-8391_1.jpg',
  ],
  'AL-3936': [
    '/imported-product-images-renamed/produtos_imagens_renomeadas/AL-3936_1.jpg',
    '/imported-product-images-renamed/produtos_imagens_renomeadas/AL-3936.jpg',
  ],
};

export function getImportedProductImagesBySku(sku: string | null | undefined) {
  const key = normalizeSkuKey(sku);
  if (BLOCK_IMPORTED_PRODUCT_IMAGE_SKUS.has(key)) {
    return [];
  }
  return PRODUCT_IMAGE_OVERRIDES[key] ?? GENERATED_PRODUCT_IMAGE_MANIFEST[key] ?? [];
}

export function getProductImageCandidates(product: ProductImageLike) {
  const existingPrimary = isUsableImage(product.imagem_principal)
    ? [String(product.imagem_principal)]
    : [];
  const existingGallery = Array.isArray(product.galeria_imagens)
    ? product.galeria_imagens.filter(isUsableImage).map((item) => String(item))
    : [];
  const imported = getImportedProductImagesBySku(product.sku);
  const key = normalizeSkuKey(product.sku);
  const preferImported = FORCE_IMPORTED_PRODUCT_IMAGE_SKUS.has(key);

  return uniqueImages([
    ...(preferImported ? imported : existingPrimary),
    ...(preferImported ? [] : existingGallery),
    ...(preferImported ? existingPrimary : imported),
    ...(preferImported ? existingGallery : []),
    '/images/placeholder.jpg',
  ]);
}

export function getProductPrimaryImage(product: ProductImageLike) {
  return getProductImageCandidates(product)[0] || '/images/placeholder.jpg';
}

export function getProductImageGallery(product: ProductImageLike) {
  return getProductImageCandidates(product);
}
