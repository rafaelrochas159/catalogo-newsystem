"use client";

import { useState } from 'react';
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
  ArrowLeft
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ProductGrid } from '@/components/product/ProductGrid';
import { ProductBadges } from '@/components/product/ProductBadges';
import { useCart } from '@/hooks/useCart';
import { useFavorites } from '@/hooks/useFavorites';
import { Produto } from '@/types';
import { formatPrice, getBoxSavings, getBoxUnitPrice, getWhatsAppLink } from '@/lib/utils';
import { COMPANY_INFO, BUSINESS_RULES } from '@/lib/constants';
import toast from 'react-hot-toast';

interface ProductPageProps {
  product: Produto;
  relatedProducts: Produto[];
}

export function ProductPage({ product, relatedProducts }: ProductPageProps) {
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [catalogType, setCatalogType] = useState<'UNITARIO' | 'CAIXA_FECHADA'>(
    product.tipo_catalogo === 'CAIXA_FECHADA' ? 'CAIXA_FECHADA' : 'UNITARIO',
  );
  const [isAdding, setIsAdding] = useState(false);
  
  const addItem = useCart((state) => state.addItem);
  const { isFavorite, toggleFavorite } = useFavorites();

  const images = [product.imagem_principal, ...(product.galeria_imagens || [])];
  
  const price = catalogType === 'UNITARIO'
    ? (product.preco_promocional_unitario || product.preco_unitario || 0)
    : (product.preco_promocional_caixa || product.preco_caixa || 0);

  const originalPrice = catalogType === 'UNITARIO'
    ? (product.preco_unitario || 0)
    : (product.preco_caixa || 0);

  const hasDiscount = price < originalPrice;
  const stock = catalogType === 'UNITARIO' ? product.estoque_unitario : product.estoque_caixa;
  const supportsUnit = product.tipo_catalogo === 'UNITARIO' || product.tipo_catalogo === 'AMBOS';
  const supportsBox = product.tipo_catalogo === 'CAIXA_FECHADA' || product.tipo_catalogo === 'AMBOS';
  const boxPricing = getBoxSavings(product);
  const unitPriceInBox = getBoxUnitPrice(product);

  const handleAddToCart = async () => {
    setIsAdding(true);
    const result = addItem(product, quantity, catalogType);
    
    if (result.success) {
      toast.success('Produto adicionado ao carrinho!');
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
      } catch (err) {
        // User cancelled
      }
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado!');
    }
  };

  return (
    <div className="min-h-screen">
      {/* Breadcrumbs */}
      <div className="border-b border-border/40">
        <div className="container py-4">
          <nav className="flex items-center gap-2 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <ChevronRight className="h-4 w-4" />
            <Link 
              href={`/categoria/${product.categoria?.slug}`}
              className="hover:text-foreground transition-colors"
            >
              {product.categoria?.nome}
            </Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground truncate max-w-[200px]">
              {product.nome}
            </span>
          </nav>
        </div>
      </div>

      <div className="container py-8">
        <div className="grid lg:grid-cols-2 gap-12">
          {/* Images */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >
            {/* Main Image */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
              <Image
                src={images[selectedImage] || '/images/placeholder.jpg'}
                alt={product.nome}
                fill
                className="object-cover"
                priority
              />
              <div className="absolute top-4 left-4">
                <ProductBadges product={product} catalogType={catalogType} />
              </div>
            </div>

            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 border-2 transition-colors ${
                      selectedImage === index 
                        ? 'border-neon-blue' 
                        : 'border-transparent hover:border-border'
                    }`}
                  >
                    <Image
                      src={image}
                      alt={`${product.nome} - ${index + 1}`}
                      fill
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </motion.div>

          {/* Info */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-6"
          >
            {/* Category */}
            <p className="text-sm text-muted-foreground uppercase tracking-wide">
              {product.categoria?.nome}
            </p>

            {/* Title */}
            <h1 className="text-3xl font-bold">{product.nome}</h1>

            {/* SKU */}
            <p className="text-sm text-muted-foreground">
              SKU: {product.sku}
            </p>

            {/* Catalog Type Selector */}
            {supportsBox && product.preco_caixa && (
              <div className="flex gap-2">
                {supportsUnit && (
                <button
                  onClick={() => setCatalogType('UNITARIO')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    catalogType === 'UNITARIO'
                      ? 'border-neon-blue bg-neon-blue/10 text-neon-blue'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Package className="h-4 w-4" />
                  Unitário
                </button>
                )}
                <button
                  onClick={() => setCatalogType('CAIXA_FECHADA')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                    catalogType === 'CAIXA_FECHADA'
                      ? 'border-neon-purple bg-neon-purple/10 text-neon-purple'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <Box className="h-4 w-4" />
                  Caixa Fechada
                  {product.quantidade_por_caixa && (
                    <span className="text-xs text-muted-foreground">
                      ({product.quantidade_por_caixa} un)
                    </span>
                  )}
                </button>
              </div>
            )}

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold text-neon-blue">
                {formatPrice(price)}
              </span>
              {hasDiscount && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatPrice(originalPrice)}
                </span>
              )}
            </div>

            {/* Discount Info */}
            {catalogType === 'UNITARIO' && (
              <div className="p-3 bg-neon-blue/10 rounded-lg">
                <p className="text-sm text-neon-blue">
                  Ganhe {BUSINESS_RULES.discountPercentage}% de desconto em compras acima de {formatPrice(BUSINESS_RULES.discountThreshold)}
                </p>
              </div>
            )}

            {supportsUnit && supportsBox && unitPriceInBox && (
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-500">
                    Economia na caixa
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Cada unidade na caixa sai por <strong className="text-foreground">{formatPrice(unitPriceInBox)}</strong>.
                  </p>
                  {boxPricing.savingsPerUnit > 0 && (
                    <p className="mt-2 text-sm text-emerald-500">
                      Economize {formatPrice(boxPricing.savingsPerUnit)} por unidade ({boxPricing.savingsPercent.toFixed(0)}%).
                    </p>
                  )}
                </div>
                <div className="rounded-xl border bg-card p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-neon-blue">
                    Escolha inteligente
                  </p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    {catalogType === 'UNITARIO'
                      ? 'Vai levar volume? A caixa reduz o custo unitario.'
                      : 'Precisa de reposicao rapida? Voce tambem pode comprar no unitario.'}
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    className="mt-3"
                    onClick={() => setCatalogType(catalogType === 'UNITARIO' ? 'CAIXA_FECHADA' : 'UNITARIO')}
                  >
                    {catalogType === 'UNITARIO' ? 'Leve mais barato na caixa' : 'Comprar unitario'}
                  </Button>
                </div>
              </div>
            )}

            <div className="flex flex-wrap gap-2 text-xs">
              <Badge variant="outline" className="border-amber-500/40 text-amber-500">Compra segura</Badge>
              <Badge variant="outline" className="border-green-500/40 text-green-500">Envio rapido</Badge>
              <Badge variant="outline" className="border-neon-blue/40 text-neon-blue">
                {stock > 0 ? 'Estoque disponivel' : 'Reposicao em breve'}
              </Badge>
            </div>

            {/* Stock */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Estoque:</span>
              <span className={`text-sm font-medium ${
                stock > 10 ? 'text-green-500' : stock > 0 ? 'text-yellow-500' : 'text-red-500'
              }`}>
                {stock > 0 ? `${stock} unidades disponíveis` : 'Indisponível'}
              </span>
            </div>

            {/* Quantity & Actions */}
            <div className="flex flex-wrap gap-4">
              {/* Quantity */}
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Qtd:</span>
                <div className="flex items-center border rounded-lg">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="px-3 py-2 hover:bg-muted transition-colors"
                    disabled={quantity <= 1}
                  >
                    -
                  </button>
                  <span className="w-12 text-center">{quantity}</span>
                  <button
                    onClick={() => setQuantity(Math.min(stock, quantity + 1))}
                    className="px-3 py-2 hover:bg-muted transition-colors"
                    disabled={quantity >= stock}
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Add to Cart */}
              <Button
                size="lg"
                className="flex-1 bg-neon-blue hover:bg-neon-blue/90 text-black font-semibold"
                onClick={handleAddToCart}
                disabled={isAdding || stock === 0}
              >
                {isAdding ? (
                  <>
                    <Check className="h-5 w-5 mr-2" />
                    Adicionado!
                  </>
                ) : (
                  <>
                    <ShoppingCart className="h-5 w-5 mr-2" />
                    {catalogType === 'CAIXA_FECHADA' ? 'Comprar caixa agora' : 'Comprar agora'}
                  </>
                )}
              </Button>

              {/* Favorite */}
              <Button
                variant="outline"
                size="icon"
                className={`h-12 w-12 ${isFavorite(product.id) ? 'text-red-500' : ''}`}
                onClick={() => toggleFavorite(product.id)}
              >
                <Heart className={`h-5 w-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
              </Button>

              {/* Share */}
              <Button
                variant="outline"
                size="icon"
                className="h-12 w-12"
                onClick={handleShare}
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Total */}
            <div className="flex items-center justify-between p-4 bg-muted rounded-lg">
              <span className="font-medium">Total:</span>
              <span className="text-2xl font-bold text-neon-blue">
                {formatPrice(price * quantity)}
              </span>
            </div>

            {/* WhatsApp */}
            <a
              href={getWhatsAppLink(COMPANY_INFO.whatsapp, `Olá! Tenho interesse no produto: ${product.nome} (SKU: ${product.sku})`)}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 p-3 border border-green-500/30 rounded-lg text-green-500 hover:bg-green-500/10 transition-colors"
            >
              <span className="text-sm">Dúvidas? Fale conosco pelo WhatsApp</span>
            </a>
          </motion.div>
        </div>

        {/* Tabs */}
        <div className="mt-12">
          <Tabs defaultValue="description">
            <TabsList className="w-full justify-start">
              <TabsTrigger value="description">Descrição</TabsTrigger>
              {product.dimensoes_caixa && (
                <TabsTrigger value="dimensions">Dimensões</TabsTrigger>
              )}
            </TabsList>
            
            <TabsContent value="description" className="mt-6">
              <div className="prose prose-invert max-w-none">
                {product.descricao ? (
                  <p>{product.descricao}</p>
                ) : (
                  <p className="text-muted-foreground">
                    Nenhuma descrição disponível para este produto.
                  </p>
                )}
              </div>
            </TabsContent>
            
            {product.dimensoes_caixa && (
              <TabsContent value="dimensions" className="mt-6">
                <div className="grid sm:grid-cols-3 gap-4">
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Comprimento</p>
                    <p className="text-lg font-medium">{(product.dimensoes_caixa as any).length} cm</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Largura</p>
                    <p className="text-lg font-medium">{(product.dimensoes_caixa as any).width} cm</p>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Altura</p>
                    <p className="text-lg font-medium">{(product.dimensoes_caixa as any).height} cm</p>
                  </div>
                </div>
                {product.peso_caixa && (
                  <div className="mt-4 p-4 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">Peso da Caixa</p>
                    <p className="text-lg font-medium">{product.peso_caixa} kg</p>
                  </div>
                )}
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <div className="mt-16">
            <h2 className="text-2xl font-bold mb-8">Produtos Relacionados</h2>
            <ProductGrid 
              products={relatedProducts} 
              catalogType="UNITARIO"
            />
          </div>
        )}
      </div>
    </div>
  );
}
