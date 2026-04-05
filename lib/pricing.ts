type CatalogType = 'UNITARIO' | 'CAIXA_FECHADA';

type PricingProduct = {
  preco_unitario?: number | null;
  preco_caixa?: number | null;
  preco_promocional_unitario?: number | null;
  preco_promocional_caixa?: number | null;
  quantidade_por_caixa?: number | null;
  price_unit?: number | null;
  price_box?: number | null;
  promotional_price_unit?: number | null;
  promotional_price_box?: number | null;
  quantity_per_box?: number | null;
  box_quantity?: number | null;
};

function toPositiveNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getUnitPrice(product: PricingProduct): number {
  return toPositiveNumber(product.preco_unitario ?? product.price_unit) || 0;
}

export function getBoxQuantity(product: PricingProduct): number | null {
  return (
    toPositiveNumber(
      product.quantidade_por_caixa ?? product.quantity_per_box ?? product.box_quantity,
    ) || null
  );
}

export function getBoxPrice(product: PricingProduct): number {
  const unitPrice = getUnitPrice(product);
  const boxQuantity = getBoxQuantity(product);

  if (unitPrice > 0 && boxQuantity) {
    return unitPrice * boxQuantity;
  }

  return (
    toPositiveNumber(product.preco_caixa ?? product.price_box) ||
    unitPrice
  );
}

export function getCatalogOriginalPrice(
  product: PricingProduct,
  catalogType: CatalogType,
): number {
  return catalogType === 'CAIXA_FECHADA' ? getBoxPrice(product) : getUnitPrice(product);
}

export function getCatalogPrice(
  product: PricingProduct,
  catalogType: CatalogType,
): number {
  if (catalogType === 'UNITARIO') {
    return (
      toPositiveNumber(
        product.preco_promocional_unitario ?? product.promotional_price_unit,
      ) || getUnitPrice(product)
    );
  }

  return (
    toPositiveNumber(
      product.preco_promocional_caixa ?? product.promotional_price_box,
    ) || getBoxPrice(product)
  );
}

export function getBoxUnitPrice(product: PricingProduct): number | null {
  const boxQuantity = getBoxQuantity(product);
  if (!boxQuantity) return null;

  return getBoxPrice(product) / boxQuantity;
}

export function getBoxLabel(product: PricingProduct, boxCount = 1): string | null {
  const boxQuantity = getBoxQuantity(product);
  if (!boxQuantity) return null;

  const totalUnits = boxQuantity * Math.max(boxCount, 1);
  return `${boxCount} caixa${boxCount > 1 ? 's' : ''} (${totalUnits} unidade${totalUnits > 1 ? 's' : ''})`;
}
