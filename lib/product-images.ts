import { Produto } from '@/types';
import { GENERATED_PRODUCT_IMAGE_MANIFEST } from '@/lib/generated-product-image-manifest';

type ProductImageLike = Partial<Pick<Produto, 'sku' | 'imagem_principal' | 'galeria_imagens'>> & {
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

export function getImportedProductImagesBySku(sku: string | null | undefined) {
  const key = normalizeSkuKey(sku);
  return GENERATED_PRODUCT_IMAGE_MANIFEST[key] || [];
}

export function getProductPrimaryImage(product: ProductImageLike) {
  if (isUsableImage(product.imagem_principal)) {
    return String(product.imagem_principal);
  }

  return getImportedProductImagesBySku(product.sku)[0] || '/images/placeholder.jpg';
}

export function getProductImageGallery(product: ProductImageLike) {
  const existingPrimary = isUsableImage(product.imagem_principal)
    ? [String(product.imagem_principal)]
    : [];
  const existingGallery = Array.isArray(product.galeria_imagens)
    ? product.galeria_imagens.filter(isUsableImage).map((item) => String(item))
    : [];

  if (existingPrimary.length > 0 || existingGallery.length > 0) {
    return [...existingPrimary, ...existingGallery];
  }

  const imported = getImportedProductImagesBySku(product.sku);
  return imported.length > 0 ? imported : ['/images/placeholder.jpg'];
}
