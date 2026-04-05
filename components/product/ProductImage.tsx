"use client";

import { useEffect, useMemo, useState } from 'react';
import Image, { ImageProps } from 'next/image';
import { getProductImageCandidates, ProductImageLike } from '@/lib/product-images';

type ProductImageProps = Omit<ImageProps, 'src'> & {
  product: ProductImageLike;
};

export function ProductImage({ product, onError, ...props }: ProductImageProps) {
  const candidateKey = `${product?.sku || ''}|${product?.imagem_principal || ''}|${Array.isArray(product?.galeria_imagens) ? product.galeria_imagens.join('|') : ''}`;
  const candidates = useMemo(() => getProductImageCandidates(product), [candidateKey]);
  const [index, setIndex] = useState(0);

  useEffect(() => {
    setIndex(0);
  }, [candidateKey]);

  const src = candidates[Math.min(index, candidates.length - 1)] || '/images/placeholder.jpg';

  return (
    <Image
      {...props}
      src={src}
      onError={(event) => {
        onError?.(event);
        setIndex((current) => (current < candidates.length - 1 ? current + 1 : current));
      }}
    />
  );
}
