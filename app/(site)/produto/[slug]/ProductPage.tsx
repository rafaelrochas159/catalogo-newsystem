"use client";

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  ChevronRight,
  Heart,
  Share2,
  ShoppingCart,
  Check,
  Package,
  Box,
  ShieldCheck,
  Truck,
  WalletCards,
  BadgePercent,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductBadges } from '@/components/product/ProductBadges';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { openCartDrawer } from '@/lib/cart-ui';
import { Produto } from '@/types';
import { formatPrice, getBoxSavings, getBoxUnitPrice, getWhatsAppLink } from '@/lib/utils';
import { getBoxPrice, getBoxQuantity, getCatalogOriginalPrice, getCatalogPrice, getUnitPrice } from '@/lib/pricing';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';
import { authorizedFetch, getAnonymousVisitorId, trackClientEvent } from '@/lib/client-auth';
import toast from 'react-hot-toast';

interface ProductPageProps {
  product: Produto;
  relatedProducts: Produto[];
}

const trustPills = [
  { icon: ShieldCheck, label: 'Compra segura' },
  { icon: Truck, label: 'Envio rapido' },
  { icon: WalletCards, label: 'Pix e acompanhamento' },
];

export function ProductPage({ product, relatedProducts }: ProductPageProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [catalogType, setCatalogType] = useState<'UNITARIO' | 'CAIXA_FECHADA'>(
    product.tipo_catalogo === 'CAIXA_FECHADA' ? 'CAIXA_FECHADA' : 'UNITARIO',
  );
  const [isAdding, setIsAdding] = useState(false);
  const [crossSellProducts, setCrossSellProducts] = useState<Produto[]>([]);

  const addItem = useCart((state) => state.addItem);
  const { isFavorite, toggleFavorite } = useFavorites();

  const images = [product.imagem_principal, ...(product.galeria_imagens || [])];

  const price = getCatalogPrice(product, catalogType);
  const originalPrice = getCatalogOriginalPrice(product, catalogType);
  const boxQuantity = getBoxQuantity(product);
  const unitPrice = getUnitPrice(product);
  const displayPrice = catalogType === 'CAIXA_FECHADA' ? unitPrice : price;
  const displayOriginalPrice =
    catalogType === 'CAIXA_FECHADA' ? unitPrice : originalPrice;

  const hasDiscount = displayPrice < displayOriginalPrice;
  const stock = catalogType === 'UNITARIO' ? product.estoque_unitario : product.estoque_caixa;
  const supportsUnit = product.tipo_catalogo === 'UNITARIO' || product.tipo_catalogo === 'AMBOS';
  const supportsBox = product.tipo_catalogo === 'CAIXA_FECHADA' || product.tipo_catalogo === 'AMBOS';
  const boxPricing = getBoxSavings(product);
  const unitPriceInBox = getBoxUnitPrice(product);
  const isLowStock = stock > 0 && stock <= 5;
  const unitCrossSellProducts = crossSellProducts.filter(
    (item) => item.tipo_catalogo === 'UNITARIO' || item.tipo_catalogo === 'AMBOS',
  );
  const unitRelatedProducts = relatedProducts.filter(
    (item) => item.tipo_catalogo === 'UNITARIO' || item.tipo_catalogo === 'AMBOS',
  );

  useEffect(() => {
    trackClientEvent({
      eventName: 'view_item',
      page: `/produto/${product.slug}`,
      productId: product.id,
      metadata: {
        catalogType,
        stock,
      },
    });
  }, [product.id, product.slug, catalogType, stock]);

  useEffect(() => {
    const loadCrossSell = async () => {
      try {
        const searchParams = new URLSearchParams({
          context: 'product',
          productId: product.id,
          catalogType,
          anonymousId: getAnonymousVisitorId(),
          limit: '8',
        });
        const response = await authorizedFetch(`/api/recommendations/ai?${searchParams.toString()}`, { cache: 'no-store' });

        if (!response.ok) return;
        const json = await response.json();
        setCrossSellProducts(Array.isArray(json.data) ? json.data : []);
      } catch {
        setCrossSellProducts([]);
      }
    };

    void loadCrossSell();
  }, [product.id, catalogType]);

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = addItem(product, quantity, catalogType);

    if (result.success) {
      openCartDrawer({
        productName: product.nome,
        source: 'product-page',
      });
      setTimeout(() => setIsAdding(false), 1000);
    } else {
      toast.error(result.message || 'Erro ao adicionar ao carrinho');
      setIsAdding(false);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: product.nome,
          text: product.descricao || '',
          url: window.location.href,
        });
      } catch {
        // user canceled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen">
      <div className="border-b border-border/40 bg-muted/20">
        <div className="container py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">Home</Link>
            <ChevronRight className="h-4 w-4" />
            <Link href={`/categoria/${product.categoria?.slug}`} className="hover:text-foreground transition-colors">
              {product.categoria?.nome}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="max-w-[220px] truncate text-foreground">{product.nome}</span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid gap-12 lg:grid-cols-[1fr_0.95fr]">
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
            <div className="relative overflow-hidden rounded-[28px] border bg-muted">
              <div className="absolute left-4 top-4 z-10">
                <ProductBadges product={product} catalogType={catalogType} />
              </div>
              <Image
                src={images[selectedImage] || '/images/placeholder.jpg'}
                alt={product.nome}
                width={1200}
                height={1200}
                className="h-full w-full object-cover"
                priority
              />
            </div>

            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative h-20 w-20 flex-shrink-0 overflow-hidden rounded-2xl border-2 ${
                      selectedImage === index ? 'border-neon-blue' : 'border-transparent hover:border-border'
                    }`}
                  >
                    <Image src={image} alt={`${product.nome} - ${index + 1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.18em] text-muted-foreground">{product.categoria?.nome}</p>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <h1 className="text-3xl font-bold sm:text-4xl">{product.nome}</h1>
                  <p className="mt-2 text-sm text-muted-foreground">SKU: {product.sku}</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="icon" className={isFavorite(product.id) ? 'text-red-500' : ''} onClick={() => toggleFavorite(product.id, 'product-page')}>
                    <Heart className={`h-5 w-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                  </Button>
                  <Button variant="outline" size="icon" onClick={handleShare}>
                    <Share2 className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs">
              {trustPills.map((item) => (
                <span key={item.label} className="inline-flex items-center gap-2 rounded-full border px-3 py-2 text-muted-foreground">
                  <item.icon className="h-4 w-4 text-neon-blue" />
                  {item.label}
                </span>
              ))}
              <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 ${stock > 0 ? 'text-green-500' : 'text-muted-foreground'}`}>
                <Package className="h-4 w-4" />
                {stock > 0 ? (isLowStock ? `Ultimas ${stock} unidades` : 'Estoque disponivel') : 'Reposicao em breve'}
              </span>
            </div>

            {(supportsUnit || supportsBox) && (
              <div className="grid gap-3 sm:grid-cols-2">
                {supportsUnit && (
                  <button
                    onClick={() => setCatalogType('UNITARIO')}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      catalogType === 'UNITARIO' ? 'border-neon-blue bg-neon-blue/8' : 'border-border hover:bg-muted/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Package className="h-4 w-4" />
                      Comprar unitario
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Ideal para reposicao rapida e pedido mais flexivel.</p>
                  </button>
                )}
                {supportsBox && (
                  <button
                    onClick={() => setCatalogType('CAIXA_FECHADA')}
                    className={`rounded-2xl border p-4 text-left transition-colors ${
                      catalogType === 'CAIXA_FECHADA' ? 'border-neon-purple bg-neon-purple/8' : 'border-border hover:bg-muted/70'
                    }`}
                  >
                    <div className="flex items-center gap-2 text-sm font-semibold">
                      <Box className="h-4 w-4" />
                      Comprar em caixa
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">Mais margem por unidade e leitura clara de economia.</p>
                  </button>
                )}
              </div>
            )}

            <div className="overflow-hidden rounded-[28px] border border-neon-blue/15 bg-gradient-to-br from-card via-card to-neon-blue/5">
              <div className="grid gap-6 p-6">
                <div className="flex flex-wrap items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Preco principal</p>
                    <div className="mt-2 flex items-center gap-3">
                      <span className="text-4xl font-bold text-neon-blue">{formatPrice(displayPrice)}</span>
                      {hasDiscount && (
                        <span className="text-lg text-muted-foreground line-through">{formatPrice(displayOriginalPrice)}</span>
                      )}
                    </div>
                    {catalogType === 'UNITARIO' ? (
                      <p className="mt-2 text-sm text-muted-foreground">
                        {formatPrice(unitPrice)} / unidade
                      </p>
                    ) : (
                      <div className="mt-2 space-y-1 text-sm text-muted-foreground">
                        <p>{formatPrice(unitPrice)} / unidade</p>
                        {boxQuantity && (
                          <>
                            <p>Caixa com {boxQuantity} unidades</p>
                            <p>Total da caixa: <span className="font-medium text-foreground">{formatPrice(getBoxPrice(product))}</span></p>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                  {hasDiscount && (
                    <Badge className="border-0 bg-emerald-500 text-white">
                      <BadgePercent className="mr-1 h-4 w-4" />
                      Economize {formatPrice(originalPrice - price)}
                    </Badge>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-2xl border border-white/10 bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Beneficio comercial</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {catalogType === 'UNITARIO'
                        ? `Ganhe ${BUSINESS_RULES.discountPercentage}% de desconto em compras acima de ${formatPrice(BUSINESS_RULES.discountThreshold)}.`
                        : 'Caixa fechada foi destacada para elevar ticket e reduzir custo por unidade.'}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-background/80 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Decisao rapida</p>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {catalogType === 'UNITARIO'
                        ? 'Se o giro for alto, compare com a caixa e aumente sua margem.'
                        : 'Se voce precisa testar demanda, troque para unitario sem sair da pagina.'}
                    </p>
                  </div>
                </div>

                {supportsUnit && supportsBox && unitPriceInBox && (
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">Economia na caixa</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        Cada unidade sai por <strong className="text-foreground">{formatPrice(unitPriceInBox)}</strong>.
                      </p>
                      {boxPricing.savingsPerUnit > 0 && (
                        <p className="mt-2 text-sm text-emerald-500">
                          Economia de {formatPrice(boxPricing.savingsPerUnit)} por unidade ({boxPricing.savingsPercent.toFixed(0)}%).
                        </p>
                      )}
                    </div>
                    <div className="rounded-2xl border border-neon-blue/15 bg-background/80 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Comparacao clara</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {catalogType === 'UNITARIO'
                          ? 'Vai levar volume? Troque para caixa e veja a diferenca de custo imediatamente.'
                          : 'Precisa recomprar menos? Volte para unitario sem perder o contexto do produto.'}
                      </p>
                      <Button
                        type="button"
                        variant="outline"
                        className="mt-3"
                        onClick={() => setCatalogType(catalogType === 'UNITARIO' ? 'CAIXA_FECHADA' : 'UNITARIO')}
                      >
                        {catalogType === 'UNITARIO' ? 'Ver economia na caixa' : 'Voltar para unitario'}
                      </Button>
                    </div>
                  </div>
                )}

                <div className="grid gap-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">Qtd:</span>
                    <div className="flex items-center rounded-xl border">
                      <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="px-3 py-2 hover:bg-muted" disabled={quantity <= 1}>-</button>
                      <span className="w-12 text-center">{quantity}</span>
                      <button onClick={() => setQuantity(Math.min(stock, quantity + 1))} className="px-3 py-2 hover:bg-muted" disabled={quantity >= stock}>+</button>
                    </div>
                  </div>
                  <div className="rounded-2xl border border-white/10 bg-background/80 p-4 text-right sm:text-left">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">Total desta escolha</p>
                    <p className="mt-2 text-3xl font-bold text-neon-blue">{formatPrice(price * quantity)}</p>
                  </div>
                </div>

                <div className="flex flex-col gap-3 sm:flex-row">
                  <Button
                    size="lg"
                    className="flex-1 bg-neon-blue text-black hover:bg-neon-blue/90"
                    onClick={handleAddToCart}
                    disabled={isAdding || stock === 0}
                  >
                    {isAdding ? (
                      <>
                        <Check className="mr-2 h-5 w-5" />
                        Adicionado!
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="mr-2 h-5 w-5" />
                        {catalogType === 'CAIXA_FECHADA' ? 'Comprar caixa agora' : 'Comprar agora'}
                      </>
                    )}
                  </Button>
                  <a
                    href={getWhatsAppLink(COMPANY_INFO.whatsapp, `Ola! Tenho interesse no produto: ${product.nome} (SKU: ${product.sku})`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex flex-1 items-center justify-center rounded-xl border border-green-500/30 px-4 py-3 text-green-500 transition-colors hover:bg-green-500/10"
                  >
                    Tirar duvidas no WhatsApp
                  </a>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Seguranca</p>
            <p className="mt-2 text-sm text-muted-foreground">Fluxo de compra e autenticacao protegidos sem sacrificar velocidade.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Entrega</p>
            <p className="mt-2 text-sm text-muted-foreground">Mensagem mais clara sobre envio, estoque e suporte para reduzir indecisao.</p>
          </div>
          <div className="rounded-2xl border bg-card p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">Comparacao</p>
            <p className="mt-2 text-sm text-muted-foreground">Unitario e caixa agora aparecem como escolhas comerciais, nao apenas tecnicas.</p>
          </div>
        </div>

        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">Descricao</TabsTrigger>
              {product.dimensoes_caixa && <TabsTrigger value="dimensions">Dimensoes</TabsTrigger>}
            </TabsList>

            <TabsContent value="description" className="mt-6 rounded-2xl border bg-card p-6">
              {product.descricao ? (
                <p className="max-w-3xl leading-7 text-muted-foreground">{product.descricao}</p>
              ) : (
                <p className="text-muted-foreground">Nenhuma descricao disponivel para este produto.</p>
              )}
            </TabsContent>

            {product.dimensoes_caixa && (
              <TabsContent value="dimensions" className="mt-6">
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Comprimento</p>
                    <p className="mt-2 text-lg font-medium">{(product.dimensoes_caixa as any).length} cm</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Largura</p>
                    <p className="mt-2 text-lg font-medium">{(product.dimensoes_caixa as any).width} cm</p>
                  </div>
                  <div className="rounded-2xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Altura</p>
                    <p className="mt-2 text-lg font-medium">{(product.dimensoes_caixa as any).height} cm</p>
                  </div>
                </div>
                {product.peso_caixa && (
                  <div className="mt-4 rounded-2xl border bg-card p-4">
                    <p className="text-sm text-muted-foreground">Peso da caixa</p>
                    <p className="mt-2 text-lg font-medium">{product.peso_caixa} kg</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        <div className="mt-16 rounded-[28px] border border-neon-blue/15 bg-card/70 p-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold">Produtos relacionados</h2>
          </div>
          {unitCrossSellProducts.length > 0 ? (
            <ProductGrid
              products={unitCrossSellProducts}
              catalogType="UNITARIO"
            />
          ) : unitRelatedProducts.length > 0 ? (
            <ProductGrid products={unitRelatedProducts} catalogType="UNITARIO" />
          ) : (
            <div className="rounded-2xl border border-dashed p-4 text-sm text-muted-foreground">
              Ainda nao ha sinal suficiente para montar recomendacoes personalizadas deste produto. Quando houver mais interacao, este bloco passa a sugerir complementos automaticamente.
            </div>
          )}
        </div>

      </div>
    </div>
  );
}


