"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Plus, Search, Pencil, Trash2, FolderOpen, ArrowLeft, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { supabase } from "@/lib/supabase/client";
import { Categoria } from "@/types";
import toast from "react-hot-toast";

export default function CategoriasPage() {
  const [categories, setCategories] = useState<Categoria[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Categoria | null>(null);
  
  const [formData, setFormData] = useState({
    nome: "",
    slug: "",
    descricao: "",
    imagem_url: "",
    order_index: 0,
    is_active: true,
  });

  useEffect(() => {
    fetchCategories();
  }, []);

  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from("categorias")
        .select("*")
        .order("order_index", { ascending: true });

      if (error) throw error;
      setCategories(data as Categoria[] || []);
    } catch (error) {
      toast.error("Erro ao carregar categorias");
    } finally {
      setIsLoading(false);
    }
  };

  const generateSlug = (nome: string) => {
    return nome
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
  };

  const handleOpenDialog = (category?: Categoria) => {
    if (category) {
      setEditingCategory(category);
      setFormData({
        nome: category.nome,
        slug: category.slug,
        descricao: category.descricao || "",
        imagem_url: category.imagem_url || "",
        order_index: category.order_index,
        is_active: category.is_active,
      });
    } else {
      setEditingCategory(null);
      setFormData({
        nome: "",
        slug: "",
        descricao: "",
        imagem_url: "",
        order_index: categories.length,
        is_active: true,
      });
    }
    setIsDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setIsDialogOpen(false);
    setEditingCategory(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.nome.trim()) {
      toast.error("Nome da categoria é obrigatório");
      return;
    }

    const slug = formData.slug.trim() || generateSlug(formData.nome);

    try {
      if (editingCategory) {
        // Update
        const { error } = await supabase
          .from("categorias")
          .update({
            nome: formData.nome.trim(),
            slug,
            descricao: formData.descricao.trim() || null,
            imagem_url: formData.imagem_url.trim() || null,
            order_index: formData.order_index,
            is_active: formData.is_active,
          })
          .eq("id", editingCategory.id);

        if (error) throw error;
        toast.success("Categoria atualizada com sucesso!");
      } else {
        // Create
        const { error } = await supabase.from("categorias").insert({
          nome: formData.nome.trim(),
          slug,
          descricao: formData.descricao.trim() || null,
          imagem_url: formData.imagem_url.trim() || null,
          order_index: formData.order_index,
          is_active: formData.is_active,
        });

        if (error) {
          if (error.message.includes("slug")) {
            toast.error("Slug já existe. Use outro.");
          } else {
            toast.error("Erro ao salvar categoria");
          }
          return;
        }
        toast.success("Categoria criada com sucesso!");
      }

      handleCloseDialog();
      fetchCategories();
    } catch (error) {
      toast.error("Erro ao salvar categoria");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir esta categoria?\n\nProdutos associados ficarão sem categoria.")) return;

    try {
      const { error } = await supabase
        .from("categorias")
        .delete()
        .eq("id", id);

      if (error) throw error;

      toast.success("Categoria excluída com sucesso!");
      fetchCategories();
    } catch (error) {
      toast.error("Erro ao excluir categoria");
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.nome.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cat.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="p-6 lg:p-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold mb-2">Categorias</h1>
            <p className="text-muted-foreground">
              Gerencie as categorias dos produtos
            </p>
          </div>
          <Button 
            onClick={() => handleOpenDialog()}
            className="bg-neon-blue text-black hover:bg-neon-blue/90"
          >
            <Plus className="h-4 w-4 mr-2" />
            Nova Categoria
          </Button>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Buscar categorias..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Categories Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Slug</TableHead>
                  <TableHead>Ordem</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filteredCategories.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <FolderOpen className="h-8 w-8 text-muted-foreground" />
                        <p>Nenhuma categoria encontrada.</p>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenDialog()}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Criar primeira categoria
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCategories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {category.imagem_url ? (
                            <img
                              src={category.imagem_url}
                              alt={category.nome}
                              className="w-10 h-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
                              <FolderOpen className="h-5 w-5 text-muted-foreground" />
                            </div>
                          )}
                          <span className="font-medium">{category.nome}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-sm text-muted-foreground">
                        {category.slug}
                      </TableCell>
                      <TableCell>{category.order_index}</TableCell>
                      <TableCell>
                        <Badge variant={category.is_active ? "default" : "secondary"}>
                          {category.is_active ? "Ativa" : "Inativa"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleOpenDialog(category)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(category.id)}
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

        {/* Dialog for Create/Edit */}
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>
                {editingCategory ? "Editar Categoria" : "Nova Categoria"}
              </DialogTitle>
            </DialogHeader>
            
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nome *</Label>
                <Input
                  value={formData.nome}
                  onChange={(e) => setFormData({ 
                    ...formData, 
                    nome: e.target.value,
                    slug: editingCategory ? formData.slug : generateSlug(e.target.value)
                  })}
                  placeholder="Ex: Fones de Ouvido"
                />
              </div>

              <div className="space-y-2">
                <Label>Slug (URL)</Label>
                <Input
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  placeholder="fones-de-ouvido"
                />
                <p className="text-xs text-muted-foreground">
                  Gerado automaticamente do nome, mas pode ser editado
                </p>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Textarea
                  value={formData.descricao}
                  onChange={(e) => setFormData({ ...formData, descricao: e.target.value })}
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <Label>URL da Imagem</Label>
                <Input
                  value={formData.imagem_url}
                  onChange={(e) => setFormData({ ...formData, imagem_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.imagem_url && (
                  <img 
                    src={formData.imagem_url} 
                    alt="Preview" 
                    className="w-16 h-16 object-cover rounded-lg mt-2" 
                  />
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Ordem</Label>
                  <Input
                    type="number"
                    value={formData.order_index}
                    onChange={(e) => setFormData({ ...formData, order_index: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={formData.is_active}
                      onCheckedChange={(v) => setFormData({ ...formData, is_active: v as boolean })}
                    />
                    <Label className="cursor-pointer">Ativa</Label>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button type="button" variant="outline" onClick={handleCloseDialog}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button type="submit" className="bg-neon-blue text-black hover:bg-neon-blue/90">
                  <Save className="h-4 w-4 mr-2" />
                  {editingCategory ? "Atualizar" : "Criar"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  );
}
