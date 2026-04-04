"use client";

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Upload, FileSpreadsheet, Check, AlertTriangle, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase/client';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

interface ImportRow {
  name: string;
  sku: string;
  description?: string;
  category_slug: string;
  catalog_type?: 'UNITARIO' | 'CAIXA_FECHADA';
  price_unit?: number;
  price_box?: number;
  stock_unit?: number;
  stock_box?: number;
  quantity_per_box?: number;
  main_image?: string;
  [key: string]: any;
}

interface ValidationError {
  row: number;
  field: string;
  message: string;
}

function normalizeCatalogType(value: unknown): 'UNITARIO' | 'CAIXA_FECHADA' | null {
  const normalized = String(value || '')
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toUpperCase()
    .replace(/\s+/g, '_');

  if (!normalized) return null;
  if (normalized === 'UNITARIO' || normalized === 'UNIDADE' || normalized === 'TIPO_UNITARIO') {
    return 'UNITARIO';
  }
  if (
    normalized === 'CAIXA_FECHADA' ||
    normalized === 'CAIXA' ||
    normalized === 'TIPO_CAIXA_FECHADA'
  ) {
    return 'CAIXA_FECHADA';
  }

  return null;
}

function getRowCatalogType(
  row: Partial<ImportRow> & { tipo_catalogo?: unknown },
  fallbackType: 'UNITARIO' | 'CAIXA_FECHADA',
) {
  return normalizeCatalogType(row.catalog_type ?? row.tipo_catalogo) || fallbackType;
}

export default function ImportPage() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isExportingProducts, setIsExportingProducts] = useState(false);
  const [preview, setPreview] = useState<ImportRow[]>([]);
  const [errors, setErrors] = useState<ValidationError[]>([]);
  const [importType, setImportType] = useState<'UNITARIO' | 'CAIXA_FECHADA'>('UNITARIO');

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const validateRow = (row: any, index: number): ValidationError[] => {
    const errors: ValidationError[] = [];
    const rowCatalogType = getRowCatalogType(row, importType);

    if (!row.name) {
      errors.push({ row: index + 1, field: 'name', message: 'Nome é obrigatório' });
    }
    if (!row.sku) {
      errors.push({ row: index + 1, field: 'sku', message: 'SKU é obrigatório' });
    }
    if (!row.category_slug) {
      errors.push({ row: index + 1, field: 'category_slug', message: 'Categoria é obrigatória' });
    }
    
    // Validação específica por tipo de importação
    if (rowCatalogType === 'UNITARIO') {
      if (!row.price_unit || isNaN(row.price_unit)) {
        errors.push({ row: index + 1, field: 'price_unit', message: 'Preço unitário é obrigatório para produtos unitários' });
      }
    } else {
      if (!row.price_box || isNaN(row.price_box)) {
        errors.push({ row: index + 1, field: 'price_box', message: 'Preço da caixa é obrigatório para produtos caixa fechada' });
      }
    }

    return errors;
  };

  const processFile = async (file: File) => {
    setIsProcessing(true);
    setErrors([]);
    setPreview([]);

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const allErrors: ValidationError[] = [];
      const validRows: ImportRow[] = [];

      jsonData.forEach((rawRow: any, index) => {
        // Clone the row to avoid mutating the original object. Convert price
        // fields (strings like "R$ 6,26" or "6.26") to numbers. Remove any
        // currency symbols and replace commas with dots. Do similar conversion
        // for quantities if they come as strings.
        const row: any = { ...rawRow };
        if (row.price_unit != null) {
          const cleaned = String(row.price_unit).replace(/[^0-9.,-]+/g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          row.price_unit = isNaN(parsed) ? undefined : parsed;
        }
        if (row.price_box != null) {
          const cleaned = String(row.price_box).replace(/[^0-9.,-]+/g, '').replace(',', '.');
          const parsed = parseFloat(cleaned);
          row.price_box = isNaN(parsed) ? undefined : parsed;
        }
        if (row.stock_unit != null && typeof row.stock_unit === 'string') {
          const parsed = parseInt(row.stock_unit, 10);
          row.stock_unit = isNaN(parsed) ? undefined : parsed;
        }
        if (row.stock_box != null && typeof row.stock_box === 'string') {
          const parsed = parseInt(row.stock_box, 10);
          row.stock_box = isNaN(parsed) ? undefined : parsed;
        }
        row.catalog_type = getRowCatalogType(row, importType);

        const rowErrors = validateRow(row, index);
        if (rowErrors.length > 0) {
          allErrors.push(...rowErrors);
        } else {
          validRows.push(row as ImportRow);
        }
      });

      setErrors(allErrors);
      setPreview(validRows);

      if (allErrors.length === 0) {
        toast.success(`${validRows.length} produtos válidos encontrados!`);
      } else {
        toast.error(`${allErrors.length} erros encontrados na planilha`);
      }
    } catch (error) {
      console.error('Erro ao processar arquivo', error);
      toast.error('Erro ao processar arquivo');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.xlsx') || file.name.endsWith('.xls'))) {
      processFile(file);
    } else {
      toast.error('Por favor, envie um arquivo Excel (.xlsx ou .xls)');
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleImport = async () => {
    // Importa produtos em massa. Para cada linha válida, procura a categoria
    // correspondente. Se não existir, conta como erro. Usa upsert para
    // permitir atualizar produtos existentes (com base no SKU). Isso evita
    // erros por chave duplicada quando o produto já existe no catálogo.
    if (preview.length === 0) return;

    setIsProcessing(true);
    let successCount = 0;
    let errorCount = 0;

    for (const row of preview) {
      try {
        const rowCatalogType = getRowCatalogType(row, importType);
        // Obtém o ID da categoria pelo slug. Usa try/catch para evitar que um
        // erro em uma linha interrompa todo o processo.
        const { data: categoria, error: catError } = await supabase
          .from('categorias')
          .select('id')
          .eq('slug', row.category_slug)
          .single();
        if (catError || !categoria) {
          errorCount++;
          continue;
        }

        // Gera um slug único combinando nome e SKU. Remove acentos e
        // caracteres especiais. Mantém a legibilidade para SEO.
        // Normaliza e remove acentos utilizando range unicode para diacríticos.
        const generatedSlug = `${row.name
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/\s+/g, '-')
          .replace(/[^a-z0-9-]/g, '')}-${row.sku.toLowerCase()}`;

        const { error } = await supabase
          .from('produtos')
          .upsert({
            nome: row.name,
            slug: generatedSlug,
            sku: row.sku.toUpperCase(),
            descricao: row.description || null,
            categoria_id: categoria.id,
            preco_unitario: row.price_unit ?? null,
            preco_caixa: row.price_box ?? null,
            estoque_unitario: row.stock_unit ?? 0,
            estoque_caixa: row.stock_box ?? 0,
            tipo_catalogo: rowCatalogType,
            quantidade_por_caixa: row.quantity_per_box ?? null,
            imagem_principal: row.main_image || '/images/placeholder.jpg',
            is_active: true,
            is_novo: false,
            is_promocao: false,
            is_mais_vendido: false,
            is_destaque: false,
          }, { onConflict: 'sku' });

        if (error) {
          console.error('Erro ao importar produto', error);
          errorCount++;
        } else {
          successCount++;
        }
      } catch (err) {
        console.error('Erro inesperado ao importar produto', err);
        errorCount++;
      }
    }
    setIsProcessing(false);
    if (successCount > 0) {
      toast.success(`${successCount} produtos importados com sucesso!`);
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} produtos não puderam ser importados`);
    }
    setPreview([]);
    // Recarrega a página de produtos do admin para refletir as mudanças se
    // possível. Isto envia um evento para que outras telas possam atualizar.
    try {
      const event = new CustomEvent('nsProductsImported');
      window.dispatchEvent(event);
    } catch (e) {
      // ignore if dispatch fails (e.g., server environment)
    }
  };

  const downloadTemplate = () => {
    const template = [
      {
        name: 'Nome do Produto',
        sku: 'SKU001',
        description: 'Descrição do produto',
        category_slug: 'caixa-de-som',
        catalog_type: importType,
        price_unit: importType === 'UNITARIO' ? 29.90 : null,
        price_box: importType === 'CAIXA_FECHADA' ? 299.00 : null,
        stock_unit: importType === 'UNITARIO' ? 100 : 0,
        stock_box: importType === 'CAIXA_FECHADA' ? 10 : 0,
        quantity_per_box: importType === 'CAIXA_FECHADA' ? 10 : null,
        main_image: '',
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template');
    XLSX.writeFile(wb, 'template-produtos.xlsx');
  };

  const downloadRegisteredProducts = async () => {
    setIsExportingProducts(true);

    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          nome,
          sku,
          descricao,
          tipo_catalogo,
          preco_unitario,
          preco_caixa,
          estoque_unitario,
          estoque_caixa,
          quantidade_por_caixa,
          imagem_principal,
          categoria:categorias(slug)
        `)
        .eq('tipo_catalogo', importType)
        .order('nome', { ascending: true });

      if (error) throw error;

      const rows = (data || []).map((product: any) => ({
        name: product.nome || '',
        sku: product.sku || '',
        description: product.descricao || '',
        category_slug: product.categoria?.slug || '',
        catalog_type: getRowCatalogType({ catalog_type: product.tipo_catalogo }, importType),
        price_unit: Number(product.preco_unitario || 0) || null,
        price_box: Number(product.preco_caixa || 0) || null,
        stock_unit: Number(product.estoque_unitario || 0) || 0,
        stock_box: Number(product.estoque_caixa || 0) || 0,
        quantity_per_box: Number(product.quantidade_por_caixa || 0) || null,
        main_image: product.imagem_principal || '',
      }));

      if (rows.length === 0) {
        toast('Nao ha produtos cadastrados neste tipo para exportar.');
        return;
      }

      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Produtos');
      XLSX.writeFile(
        wb,
        `produtos-cadastrados-${importType === 'UNITARIO' ? 'unitario' : 'caixa-fechada'}.xlsx`,
      );
      toast.success(`${rows.length} produtos exportados para edicao em massa.`);
    } catch (error) {
      console.error('Erro ao exportar produtos cadastrados', error);
      toast.error('Nao foi possivel baixar os produtos cadastrados.');
    } finally {
      setIsExportingProducts(false);
    }
  };

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Importar Produtos</h1>
          <p className="text-muted-foreground">
            Importe produtos em massa via planilha Excel
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Upload Area */}
          {/* Tipo de Venda */}
          <Card className="border-neon-blue/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <span>📦 Tipo de Venda</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4">
                Selecione para qual catálogo os produtos serão importados:
              </p>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setImportType('UNITARIO')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    importType === 'UNITARIO'
                      ? 'border-blue-500 bg-blue-500/10 text-blue-500'
                      : 'border-border hover:border-blue-500/50'
                  }`}
                >
                  <div className="font-semibold">Unitário</div>
                  <div className="text-xs opacity-70">Pedido mínimo R$200</div>
                </button>
                <button
                  type="button"
                  onClick={() => setImportType('CAIXA_FECHADA')}
                  className={`flex-1 px-4 py-3 rounded-lg border-2 transition-all ${
                    importType === 'CAIXA_FECHADA'
                      ? 'border-purple-500 bg-purple-500/10 text-purple-500'
                      : 'border-border hover:border-purple-500/50'
                  }`}
                >
                  <div className="font-semibold">Caixa Fechada</div>
                  <div className="text-xs opacity-70">Venda por caixa</div>
                </button>
              </div>
              <p className="text-xs text-muted-foreground mt-3">
                💡 <strong>Importante:</strong> Use a coluna <strong>catalog_type</strong> na planilha para definir cada linha como
                {' '}<strong>UNITARIO</strong> ou <strong>CAIXA_FECHADA</strong>. Se ela não vier preenchida, o sistema usa
                {' '}“{importType === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}” como padrão.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Upload da Planilha</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
                  border-2 border-dashed rounded-xl p-12 text-center transition-colors
                  ${isDragging 
                    ? 'border-neon-blue bg-neon-blue/5' 
                    : 'border-border hover:border-muted-foreground'
                  }
                `}
              >
                <Upload className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-lg font-medium mb-2">
                  Arraste e solte sua planilha aqui
                </p>
                <p className="text-sm text-muted-foreground mb-4">
                  ou clique para selecionar o arquivo
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-input"
                />
                <label htmlFor="file-input">
                  <Button variant="outline" className="cursor-pointer" asChild>
                    <span>Selecionar Arquivo</span>
                  </Button>
                </label>
              </div>

              <Button
                variant="outline"
                className="w-full"
                onClick={downloadTemplate}
              >
                <Download className="h-4 w-4 mr-2" />
                Baixar Template
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={downloadRegisteredProducts}
                disabled={isExportingProducts}
              >
                {isExportingProducts ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
                    Gerando planilha...
                  </>
                ) : (
                  <>
                    <FileSpreadsheet className="h-4 w-4 mr-2" />
                    Baixar produtos cadastrados
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Instructions */}
          <Card>
            <CardHeader>
              <CardTitle>Instruções</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    <strong>name</strong> - Nome do produto (obrigatório)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    <strong>sku</strong> - Código único do produto (obrigatório)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    <strong>category_slug</strong> - Slug da categoria (obrigatório)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    <strong>catalog_type</strong> - UNITARIO ou CAIXA_FECHADA
                  </span>
                </li>
                {importType === 'UNITARIO' ? (
                  <li className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-green-500 mt-0.5" />
                    <span>
                      <strong>price_unit</strong> - Preço unitário (obrigatório)
                    </span>
                  </li>
                ) : (
                  <>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>
                        <strong>price_box</strong> - Preço da caixa (obrigatório)
                      </span>
                    </li>
                    <li className="flex items-start gap-2">
                      <Check className="h-4 w-4 text-green-500 mt-0.5" />
                      <span>
                        <strong>quantity_per_box</strong> - Quantidade de peças por caixa
                      </span>
                    </li>
                  </>
                )}
                <li className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5" />
                  <span>
                    <strong>main_image</strong> - URL da imagem principal
                  </span>
                </li>
              </ul>
              <div className="mt-4 p-3 bg-blue-500/10 rounded-lg">
                <p className="text-sm text-blue-500">
                  📌 <strong>Se a coluna catalog_type estiver vazia, o importador usa {importType === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'} como padrão.</strong>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview */}
        {preview.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Pré-visualização ({preview.length} produtos)</CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    A coluna <strong>catalog_type</strong> da planilha define o tipo do produto. O seletor acima é usado apenas como fallback.
                  </p>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={isProcessing}
                  className="bg-neon-blue text-black hover:bg-neon-blue/90"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-black mr-2" />
                      Importando...
                    </>
                  ) : (
                    <>
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Importar Produtos
                    </>
                  )}
                </Button>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Nome</th>
                        <th className="text-left py-2">SKU</th>
                        <th className="text-left py-2">Categoria</th>
                        <th className="text-left py-2">Tipo</th>
                        <th className="text-right py-2">Preço</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.slice(0, 5).map((row, index) => {
                        const rowCatalogType = getRowCatalogType(row, importType);
                        const price =
                          rowCatalogType === 'CAIXA_FECHADA' ? row.price_box : row.price_unit;

                        return (
                          <tr key={index} className="border-b">
                            <td className="py-2">{row.name}</td>
                            <td className="py-2">{row.sku}</td>
                            <td className="py-2">{row.category_slug}</td>
                            <td className="py-2">
                              <Badge variant={rowCatalogType === 'UNITARIO' ? 'default' : 'secondary'}>
                                {rowCatalogType === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}
                              </Badge>
                            </td>
                            <td className="py-2 text-right">R$ {price ?? 0}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {preview.length > 5 && (
                    <p className="text-center text-sm text-muted-foreground mt-4">
                      ... e mais {preview.length - 5} produtos
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-8"
          >
            <Card className="border-red-500/30">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-500">
                  <AlertTriangle className="h-5 w-5" />
                  Erros Encontrados ({errors.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {errors.map((error, index) => (
                    <div
                      key={index}
                      className="p-3 bg-red-500/10 rounded-lg text-sm"
                    >
                      <span className="font-medium">Linha {error.row}:</span>{' '}
                      {error.message}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
