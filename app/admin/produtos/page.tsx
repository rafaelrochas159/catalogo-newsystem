"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Plus, Search, Pencil, Trash2, Eye, FileSpreadsheet } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { supabase } from '@/lib/supabase/client';
import { Produto } from '@/types';
import { formatPrice } from '@/lib/utils';
import { getProductPrimaryImage } from '@/lib/product-images';
import toast from 'react-hot-toast';

export default function ProductsPage() {
  const [products, setProducts] = useState<Produto[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('produtos')
        .select(`
          *,
          categoria:categorias(*)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProducts(data as Produto[] || []);
    } catch (error) {
      toast.error('Erro ao carregar produtos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este produto?')) return;

    try {
      const { error } = await supabase
        .from('produtos')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Produto excluído com sucesso!');
      fetchProducts();
    } catch (error) {
      toast.error('Erro ao excluir produto');
    }
  };

  const filteredProducts = products.filter((product) =>
    product.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Produtos</h1>
            <p className="text-muted-foreground">
              Gerencie os produtos do catálogo
            </p>
          </div>
          <div className="flex gap-2">
            <Link href="/admin/importar">
              <Button variant="outline">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Importar Excel
              </Button>
            </Link>
            <Link href="/admin/produtos/novo">
              <Button className="bg-neon-blue text-black hover:bg-neon-blue/90">
                <Plus className="h-4 w-4 mr-2" />
                Novo Produto
              </Button>
            </Link>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar produtos..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        <div className="mb-6 flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="px-3 py-1 text-sm">
            Total cadastrados: {products.length}
          </Badge>
          {searchQuery.trim() && (
            <Badge variant="secondary" className="px-3 py-1 text-sm">
              Exibindo na busca: {filteredProducts.length}
            </Badge>
          )}
        </div>

        {/* Products Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Preço</TableHead>
                  <TableHead>Estoque</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      Nenhum produto encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-muted overflow-hidden">
                            <img
                              src={getProductPrimaryImage(product)}
                              alt={product.nome}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <span className="font-medium">{product.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell>{product.sku}</TableCell>
                      <TableCell>{product.categoria?.nome}</TableCell>
                      <TableCell>
                        <Badge 
                          variant="outline"
                          className={
                            product.tipo_catalogo === 'UNITARIO' 
                              ? 'border-blue-500 text-blue-500' 
                              : 'border-purple-500 text-purple-500'
                          }
                        >
                          {product.tipo_catalogo === 'UNITARIO' ? 'Unitário' : 'Caixa Fechada'}
                        </Badge>
                        {product.tipo_catalogo === 'AMBOS' && (
                          <Badge variant="outline" className="ml-2 border-emerald-500 text-emerald-500">
                            Unitario + Caixa
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{formatPrice(product.preco_unitario)}</TableCell>
                      <TableCell>{product.estoque_unitario}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant={product.is_active ? 'default' : 'secondary'}>
                            {product.is_active ? 'Ativo' : 'Inativo'}
                          </Badge>
                          {product.destaque_home && (
                            <Badge className="bg-neon-blue text-black">Home</Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/produto/${product.slug}`} target="_blank">
                            <Button variant="ghost" size="icon">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link href={`/admin/produtos/${product.id}/editar`}>
                            <Button variant="ghost" size="icon">
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(product.id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
