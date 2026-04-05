"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Package, Box, Tag, Image as ImageIcon, Upload, X, Loader2, Plus, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/lib/supabase/client";
import { getBoxPrice } from "@/lib/pricing";
import toast from "react-hot-toast";

interface Category {
  id: string;
  nome: string;
}

export default function NovoProdutoPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [newGalleryUrl, setNewGalleryUrl] = useState("");
  const mainImageInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  
  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    description: "",
    category_id: "",
    price_unit: "",
    price_box: "",
    stock_unit: "",
    stock_box: "",
    catalog_type: "UNITARIO" as "UNITARIO" | "CAIXA_FECHADA" | "AMBOS",
    quantity_per_box: "",
    box_weight: "",
    box_length: "",
    box_width: "",
    box_height: "",
    main_image: "",
    video_url: "",
    is_featured: false,
    is_promotion: false,
    is_new: false,
    is_bestseller: false,
    highlight_on_home: false,
    related_product_ids_input: "",
  });
  const isBoxCatalog = formData.catalog_type === "CAIXA_FECHADA" || formData.catalog_type === "AMBOS";
  const boxQuantityValue = parseInt(formData.quantity_per_box, 10);
  const computedBoxPrice = getBoxPrice({
    preco_unitario: parseFloat(formData.price_unit) || 0,
    quantidade_por_caixa: Number.isFinite(boxQuantityValue) ? boxQuantityValue : null,
  });

  useEffect(() => {
    const fetchCategories = async () => {
      const { data } = await supabase
        .from("categorias")
        .select("id, nome")
        .eq("is_active", true)
        .order("nome");
      setCategories(data || []);
    };
    fetchCategories();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim() || !formData.sku.trim() || !formData.category_id || !formData.price_unit) {
      toast.error("Preencha todos os campos obrigatórios");
      return;
    }
    if (isBoxCatalog && (!Number.isFinite(boxQuantityValue) || boxQuantityValue <= 0)) {
      toast.error("Informe uma quantidade por caixa maior que zero.");
      return;
    }

    setIsLoading(true);

    try {
      const slug = `${formData.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")}-${formData.sku.toLowerCase()}`;

      const boxDimensions = formData.box_length && formData.box_width && formData.box_height
        ? { length: parseFloat(formData.box_length), width: parseFloat(formData.box_width), height: parseFloat(formData.box_height) }
        : null;

      const priceUnit = parseFloat(formData.price_unit);
      const priceBox = isBoxCatalog ? computedBoxPrice : null;

      const productData = {
        nome: formData.name.trim(),
        slug,
        sku: formData.sku.trim().toUpperCase(),
        descricao: formData.description.trim() || null,
        categoria_id: formData.category_id || null,
        preco_unitario: isNaN(priceUnit) ? 0 : priceUnit,
        preco_caixa: priceBox && !isNaN(priceBox) ? priceBox : null,
        estoque_unitario: parseInt(formData.stock_unit) || 0,
        estoque_caixa: parseInt(formData.stock_box) || 0,
        tipo_catalogo: formData.catalog_type,
        quantidade_por_caixa: formData.quantity_per_box ? parseInt(formData.quantity_per_box) : null,
        peso_caixa: formData.box_weight ? parseFloat(formData.box_weight) : null,
        dimensoes_caixa: boxDimensions,
        imagem_principal: formData.main_image.trim() || "/images/placeholder.jpg",
        video_url: formData.video_url.trim() || null,
        is_destaque: formData.is_featured,
        is_promocao: formData.is_promotion,
        is_novo: formData.is_new,
        is_mais_vendido: formData.is_bestseller,
        destaque_home: formData.highlight_on_home,
        related_product_ids: formData.related_product_ids_input
          .split(',')
          .map((value) => value.trim())
          .filter(Boolean),
        is_active: true,
      };

      const { error } = await supabase.from("produtos").insert({
        ...productData,
        galeria_imagens: galleryImages.length > 0 ? galleryImages : null,
      });

      if (error) {
        console.error("Erro ao salvar:", error);
        if (error.message?.toLowerCase().includes("sku") || error.message?.toLowerCase().includes("unique")) {
          toast.error("SKU já existe. Use outro.");
        } else if (error.message?.includes("foreign key")) {
          toast.error("Categoria inválida.");
        } else {
          toast.error(`Erro ao salvar: ${error.message}`);
        }
        return;
      }

      toast.success("Produto cadastrado com sucesso!");
      router.push("/admin/produtos");
    } catch (error) {
      toast.error("Erro ao salvar produto");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImageUpload = async (file: File, type: "main" | "gallery") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande. Máximo 5MB");
      return;
    }

    setIsUploading(true);

    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `products/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error } = await supabase.storage
        .from("images")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (error) {
        console.error("Upload error:", error);
        // Se bucket não existe, converte para base64
        if (error.message?.includes("bucket") || error.message?.includes("not found")) {
          toast.error("Storage não configurado. Use URL de imagem externa.");
        } else {
          toast.error("Erro ao fazer upload da imagem");
        }
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("images")
        .getPublicUrl(fileName);

      if (type === "main") {
        setFormData({ ...formData, main_image: publicUrl });
      } else {
        setGalleryImages([...galleryImages, publicUrl]);
      }

      toast.success("Imagem enviada com sucesso!");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao fazer upload da imagem");
    } finally {
      setIsUploading(false);
    }
  };

  // Upload alternativo usando base64 (quando storage não está disponível)
  const handleImageUploadBase64 = async (file: File, type: "main" | "gallery") => {
    if (!file.type.startsWith("image/")) {
      toast.error("Selecione uma imagem válida");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error("Imagem muito grande para preview. Máximo 2MB");
      return;
    }

    setIsUploading(true);

    try {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        if (type === "main") {
          setFormData({ ...formData, main_image: base64 });
        } else {
          setGalleryImages([...galleryImages, base64]);
        }
        toast.success("Imagem carregada (modo preview)!");
        setIsUploading(false);
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Erro ao carregar imagem");
      setIsUploading(false);
    }
  };

  const handleAddGalleryUrl = () => {
    if (!newGalleryUrl.trim()) return;
    setGalleryImages([...galleryImages, newGalleryUrl.trim()]);
    setNewGalleryUrl("");
  };

  const handleRemoveGalleryImage = (index: number) => {
    setGalleryImages(galleryImages.filter((_, i) => i !== index));
  };

  return (
    <div className="p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="flex items-center gap-4">
          <Link href="/admin/produtos">
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Novo Produto</h1>
            <p className="text-muted-foreground">Cadastre um novo produto</p>
          </div>
        </div>
        <Link href="/admin/importar">
          <Button variant="outline">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Importar em Massa
          </Button>
        </Link>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            {/* Informações Básicas */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-neon-blue" />
                  Informações Básicas
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Nome do Produto *</Label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="Ex: Fone de Ouvido Bluetooth"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>SKU *</Label>
                  <Input
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    placeholder="Ex: FONE-001"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Categoria *</Label>
                  <Select
                    value={formData.category_id}
                    onValueChange={(value) => setFormData({ ...formData, category_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id}>
                          {cat.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Relacionados para cross-sell</Label>
                  <Input
                    value={formData.related_product_ids_input}
                    onChange={(e) => setFormData({ ...formData, related_product_ids_input: e.target.value })}
                    placeholder="IDs dos produtos separados por virgula"
                  />
                  <p className="text-xs text-muted-foreground">
                    Use IDs dos produtos para fallback manual de upsell e cross-sell.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Preços */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5 text-neon-blue" />
                  Preços e Estoque
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Unitário (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price_unit}
                      onChange={(e) => setFormData({ ...formData, price_unit: e.target.value })}
                      placeholder="0,00"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Estoque Unitário</Label>
                    <Input
                      type="number"
                      value={formData.stock_unit}
                      onChange={(e) => setFormData({ ...formData, stock_unit: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Preço Caixa (R$)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={isBoxCatalog && computedBoxPrice > 0 ? computedBoxPrice.toFixed(2) : ""}
                      readOnly
                      placeholder="0,00"
                    />
                    <p className="text-xs text-muted-foreground">
                      Calculado automaticamente: preço unitário x quantidade por caixa.
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label>Estoque Caixa</Label>
                    <Input
                      type="number"
                      value={formData.stock_box}
                      onChange={(e) => setFormData({ ...formData, stock_box: e.target.value })}
                      placeholder="0"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tipo de Venda */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Box className="h-5 w-5 text-neon-blue" />
                  Tipo de Venda
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {["UNITARIO", "CAIXA_FECHADA", "AMBOS"].map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setFormData({ ...formData, catalog_type: type as any })}
                      className={`px-4 py-2 rounded-lg border transition-colors ${
                        formData.catalog_type === type
                          ? "border-neon-blue bg-neon-blue/10 text-neon-blue"
                          : "border-border hover:bg-muted"
                      }`}
                    >
                      {type === "UNITARIO" ? "Unitário" : "Caixa Fechada"}
                      {type === "AMBOS" && <span className="ml-2 text-xs opacity-80">+ Unitario</span>}
                    </button>
                  ))}
                </div>

                <p className="text-sm text-muted-foreground bg-muted p-3 rounded-lg">
                  <strong>💡 Dica:</strong> "<strong>Unitário</strong>" aparece apenas no catálogo unitário (pedido mínimo R$200). 
                  "<strong>Caixa Fechada</strong>" aparece apenas no catálogo de caixa fechada. Cada produto deve ser cadastrado separadamente para cada catálogo.
                </p>

                {(formData.catalog_type === "CAIXA_FECHADA" || formData.catalog_type === "AMBOS") && (
                  <div className="pt-4 border-t space-y-4">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Qtd por Caixa *</Label>
                        <Input
                          type="number"
                          min="1"
                          value={formData.quantity_per_box}
                          onChange={(e) => setFormData({ ...formData, quantity_per_box: e.target.value })}
                          placeholder="Ex: 10"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Peso (kg)</Label>
                        <Input
                          type="number"
                          step="0.01"
                          value={formData.box_weight}
                          onChange={(e) => setFormData({ ...formData, box_weight: e.target.value })}
                          placeholder="Ex: 2.5"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Dimensões (cm)</Label>
                      <div className="grid grid-cols-3 gap-2">
                        <Input
                          placeholder="C"
                          value={formData.box_length}
                          onChange={(e) => setFormData({ ...formData, box_length: e.target.value })}
                        />
                        <Input
                          placeholder="L"
                          value={formData.box_width}
                          onChange={(e) => setFormData({ ...formData, box_width: e.target.value })}
                        />
                        <Input
                          placeholder="A"
                          value={formData.box_height}
                          onChange={(e) => setFormData({ ...formData, box_height: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Mídia */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ImageIcon className="h-5 w-5 text-neon-blue" />
                  Mídia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Imagem Principal */}
                <div className="space-y-2">
                  <Label>Imagem Principal</Label>
                  <div className="flex items-start gap-4">
                    {formData.main_image ? (
                      <div className="relative">
                        <img 
                          src={formData.main_image} 
                          alt="Preview" 
                          className="w-24 h-24 object-cover rounded-lg border" 
                        />
                        <button
                          type="button"
                          onClick={() => setFormData({ ...formData, main_image: "" })}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ) : (
                      <div
                        onClick={() => mainImageInputRef.current?.click()}
                        className="w-24 h-24 border-2 border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors"
                      >
                        {isUploading ? (
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        ) : (
                          <>
                            <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                            <span className="text-xs text-muted-foreground">Upload</span>
                          </>
                        )}
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <Input
                        value={formData.main_image}
                        onChange={(e) => setFormData({ ...formData, main_image: e.target.value })}
                        placeholder="https://... ou faça upload"
                      />
                      <input
                        ref={mainImageInputRef}
                        type="file"
                        accept="image/*"
                        onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "main")}
                        className="hidden"
                      />
                      <p className="text-xs text-muted-foreground">
                        Clique na caixa para fazer upload ou cole uma URL
                      </p>
                    </div>
                  </div>
                </div>

                {/* Galeria de Imagens */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>Galeria de Imagens</Label>
                  <div className="flex gap-2">
                    <Input
                      value={newGalleryUrl}
                      onChange={(e) => setNewGalleryUrl(e.target.value)}
                      placeholder="https://..."
                    />
                    <Button type="button" onClick={handleAddGalleryUrl} variant="outline">
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button 
                      type="button" 
                      onClick={() => galleryInputRef.current?.click()} 
                      variant="outline"
                      disabled={isUploading}
                    >
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                    </Button>
                    <input
                      ref={galleryInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleImageUpload(e.target.files[0], "gallery")}
                      className="hidden"
                    />
                  </div>
                  {galleryImages.length > 0 && (
                    <div className="flex gap-2 flex-wrap mt-2">
                      {galleryImages.map((url, index) => (
                        <div key={index} className="relative">
                          <img 
                            src={url} 
                            alt={`Gallery ${index}`} 
                            className="w-16 h-16 object-cover rounded-lg border" 
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveGalleryImage(index)}
                            className="absolute -top-1 -right-1 bg-red-500 text-white rounded-full p-0.5 hover:bg-red-600"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Vídeo */}
                <div className="space-y-2 pt-4 border-t">
                  <Label>URL do Vídeo</Label>
                  <Input
                    value={formData.video_url}
                    onChange={(e) => setFormData({ ...formData, video_url: e.target.value })}
                    placeholder="https://youtube.com/..."
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Status */}
            <Card>
              <CardHeader>
                <CardTitle>Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_new}
                    onCheckedChange={(v) => setFormData({ ...formData, is_new: v as boolean })}
                  />
                  <Label className="cursor-pointer">Produto Novo</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_promotion}
                    onCheckedChange={(v) => setFormData({ ...formData, is_promotion: v as boolean })}
                  />
                  <Label className="cursor-pointer">Em Promoção</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_bestseller}
                    onCheckedChange={(v) => setFormData({ ...formData, is_bestseller: v as boolean })}
                  />
                  <Label className="cursor-pointer">Mais Vendido</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.is_featured}
                    onCheckedChange={(v) => setFormData({ ...formData, is_featured: v as boolean })}
                  />
                  <Label className="cursor-pointer">Em Destaque</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={formData.highlight_on_home}
                    onCheckedChange={(v) => setFormData({ ...formData, highlight_on_home: v as boolean })}
                  />
                  <Label className="cursor-pointer">Destaque na Home</Label>
                </div>
              </CardContent>
            </Card>

            {/* Preview */}
            <Card>
              <CardHeader>
                <CardTitle>Preview</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="aspect-video bg-muted rounded-lg overflow-hidden mb-2">
                  {formData.main_image ? (
                    <img src={formData.main_image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="h-8 w-8" />
                    </div>
                  )}
                </div>
                <p className="font-medium truncate">{formData.name || "Produto"}</p>
                <p className="text-neon-blue font-bold">
                  {isBoxCatalog && computedBoxPrice > 0
                    ? `Caixa: R$ ${computedBoxPrice.toFixed(2)}`
                    : formData.price_unit ? `R$ ${parseFloat(formData.price_unit).toFixed(2)}` : "R$ 0,00"}
                </p>
                <div className="flex gap-1 mt-2 flex-wrap">
                  {formData.is_new && <Badge className="bg-green-500">Novo</Badge>}
                  {formData.is_promotion && <Badge className="bg-red-500">Promo</Badge>}
                  {formData.is_bestseller && <Badge className="bg-yellow-500">Top</Badge>}
                  {formData.is_featured && <Badge className="bg-purple-500">Destaque</Badge>}
                  {formData.highlight_on_home && <Badge className="bg-neon-blue text-black">Home</Badge>}
                </div>
              </CardContent>
            </Card>

            {/* Ações */}
            <div className="flex flex-col gap-2">
              <Button
                type="submit"
                disabled={isLoading}
                className="w-full bg-neon-blue text-black hover:bg-neon-blue/90"
              >
                {isLoading ? "Salvando..." : <><Save className="h-4 w-4 mr-2" /> Salvar</>}
              </Button>
              <Link href="/admin/produtos" className="w-full">
                <Button variant="outline" className="w-full">
                  <ArrowLeft className="h-4 w-4 mr-2" /> Voltar
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
