import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Edit,
  Save,
  Trash2,
  Plus,
  Link2,
  AlertTriangle,
  Copy,
  Package,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProductLinkDialog } from "./ProductLinkDialog";
import { ProdutoFormDialog } from "@/components/Produtos/ProdutoFormDialog";
import { findBestProductMatch } from "@/lib/productMatching";

interface CotacaoEditDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacao: any;
  onSuccess: () => void;
}

export function CotacaoEditDialog({
  open,
  onOpenChange,
  cotacao,
  onSuccess,
}: CotacaoEditDialogProps) {
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    condicao_pagamento: "",
    prazo_entrega: "",
    validade: "",
    observacoes: "",
    taxa_cambio: 5.0,
  });
  
  // Modals
  const [productLinkDialogOpen, setProductLinkDialogOpen] = useState(false);
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [itemToLink, setItemToLink] = useState<any>(null);
  const [itemToCreateProduct, setItemToCreateProduct] = useState<any>(null);

  useEffect(() => {
    if (open && cotacao) {
      loadCotacaoData();
      loadProducts();
    }
  }, [open, cotacao]);

  const loadCotacaoData = async () => {
    try {
      // Carregar cabeçalho
      setFormData({
        condicao_pagamento: cotacao.condicao_pagamento || "",
        prazo_entrega: cotacao.prazo_entrega || "",
        validade: cotacao.validade || "",
        observacoes: cotacao.observacoes || "",
        taxa_cambio: cotacao.taxa_cambio || 5.0,
      });

      // Carregar itens
      const { data: itensData, error } = await supabase
        .from("cotacoes_compras_itens")
        .select(`
          *,
          product:products(id, nome, codigo, codigo_fabricante)
        `)
        .eq("cotacao_id", cotacao.id)
        .order("created_at", { ascending: true });

      if (error) throw error;
      setItems(itensData || []);
    } catch (error: any) {
      console.error("Error loading cotacao data:", error);
      toast.error("Erro ao carregar dados da cotação");
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, codigo, codigo_fabricante")
      .order("nome");
    if (data) setProducts(data);
  };

  const handleSaveHeader = async () => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("cotacoes_compras")
        .update({
          condicao_pagamento: formData.condicao_pagamento,
          prazo_entrega: formData.prazo_entrega,
          validade: formData.validade,
          observacoes: formData.observacoes,
          taxa_cambio: formData.taxa_cambio,
        })
        .eq("id", cotacao.id);

      if (error) throw error;
      toast.success("Cabeçalho da cotação atualizado!");
      onSuccess();
    } catch (error: any) {
      console.error("Error saving header:", error);
      toast.error(error.message || "Erro ao salvar");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Deseja realmente excluir este item?")) return;

    try {
      const { error } = await supabase
        .from("cotacoes_compras_itens")
        .delete()
        .eq("id", itemId);

      if (error) throw error;
      toast.success("Item excluído!");
      loadCotacaoData();
      onSuccess();
    } catch (error: any) {
      console.error("Error deleting item:", error);
      toast.error(error.message || "Erro ao excluir item");
    }
  };

  const handleDuplicateItem = async (item: any) => {
    try {
      const { error } = await supabase
        .from("cotacoes_compras_itens")
        .insert({
          cotacao_id: cotacao.id,
          product_id: item.product_id,
          part_number: item.part_number,
          descricao: item.descricao,
          ncm: item.ncm,
          quantidade: item.quantidade,
          preco_unitario: item.preco_unitario,
          total: item.total,
          moeda: item.moeda,
          valor_original: item.valor_original,
          valor_convertido: item.valor_convertido,
          custo_dolar: item.custo_dolar,
          imediato: item.imediato,
          status: item.status,
        });

      if (error) throw error;
      toast.success("Item duplicado!");
      loadCotacaoData();
      onSuccess();
    } catch (error: any) {
      console.error("Error duplicating item:", error);
      toast.error(error.message || "Erro ao duplicar item");
    }
  };

  const handleLinkProduct = (productId: string) => {
    if (!itemToLink) return;
    
    const updateItem = async () => {
      try {
        const product = products.find((p) => p.id === productId);
        const { error } = await supabase
          .from("cotacoes_compras_itens")
          .update({
            product_id: productId,
            status: "pendente",
          })
          .eq("id", itemToLink.id);

        if (error) throw error;
        toast.success("Produto vinculado!");
        loadCotacaoData();
        onSuccess();
      } catch (error: any) {
        console.error("Error linking product:", error);
        toast.error(error.message || "Erro ao vincular produto");
      }
    };

    updateItem();
    setProductLinkDialogOpen(false);
    setItemToLink(null);
  };

  const handleAddNewItem = async () => {
    try {
      const { error } = await supabase
        .from("cotacoes_compras_itens")
        .insert({
          cotacao_id: cotacao.id,
          descricao: "Novo item",
          quantidade: 1,
          preco_unitario: 0,
          total: 0,
          moeda: cotacao.moeda || "BRL",
          status: "pendente",
        });

      if (error) throw error;
      toast.success("Novo item adicionado!");
      loadCotacaoData();
      onSuccess();
    } catch (error: any) {
      console.error("Error adding item:", error);
      toast.error(error.message || "Erro ao adicionar item");
    }
  };

  const formatCurrency = (value: number, currency: string = "BRL") => {
    const symbol = currency === "USD" ? "US$" : "R$";
    return `${symbol} ${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}`;
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5" />
              Editar Cotação {cotacao?.numero_cotacao}
            </DialogTitle>
            <DialogDescription>
              Gerencie o cabeçalho e itens desta cotação
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Cabeçalho */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Cabeçalho da Cotação</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Condição de Pagamento</Label>
                  <Input
                    value={formData.condicao_pagamento}
                    onChange={(e) =>
                      setFormData({ ...formData, condicao_pagamento: e.target.value })
                    }
                    placeholder="Ex: 30 dias"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Prazo de Entrega</Label>
                  <Input
                    value={formData.prazo_entrega}
                    onChange={(e) =>
                      setFormData({ ...formData, prazo_entrega: e.target.value })
                    }
                    placeholder="Ex: 15 dias úteis"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Validade</Label>
                  <Input
                    type="date"
                    value={formData.validade}
                    onChange={(e) =>
                      setFormData({ ...formData, validade: e.target.value })
                    }
                  />
                </div>
                {cotacao?.moeda === "USD" && (
                  <div className="space-y-2">
                    <Label>Taxa de Câmbio</Label>
                    <Input
                      type="number"
                      step="0.0001"
                      value={formData.taxa_cambio}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          taxa_cambio: parseFloat(e.target.value) || 5.0,
                        })
                      }
                    />
                  </div>
                )}
                <div className="space-y-2 col-span-2">
                  <Label>Observações</Label>
                  <Input
                    value={formData.observacoes}
                    onChange={(e) =>
                      setFormData({ ...formData, observacoes: e.target.value })
                    }
                    placeholder="Observações gerais da cotação"
                  />
                </div>
              </div>
              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveHeader} disabled={loading}>
                  {loading ? "Salvando..." : "Salvar Cabeçalho"}
                </Button>
              </div>
            </Card>

            {/* Itens */}
            <Card className="p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold">Itens da Cotação ({items.length})</h3>
                <Button onClick={handleAddNewItem} size="sm" variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Adicionar Item
                </Button>
              </div>

              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Produto</TableHead>
                      <TableHead>Part #</TableHead>
                      <TableHead>NCM</TableHead>
                      <TableHead className="text-right">Qtd</TableHead>
                      <TableHead className="text-right">Preço Unit.</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{item.descricao}</p>
                            {item.product ? (
                              <Badge variant="outline" className="mt-1 text-xs">
                                {item.product.nome}
                              </Badge>
                            ) : (
                              <Badge variant="destructive" className="mt-1 text-xs">
                                Não vinculado
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">
                            {item.part_number || "-"}
                          </span>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-mono">{item.ncm || "-"}</span>
                        </TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          {formatCurrency(item.preco_unitario, item.moeda)}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total, item.moeda)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              item.status === "aprovado"
                                ? "default"
                                : item.status === "revisar"
                                ? "destructive"
                                : "secondary"
                            }
                          >
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {!item.product_id && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setItemToLink(item);
                                  setProductLinkDialogOpen(true);
                                }}
                                title="Vincular produto"
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDuplicateItem(item)}
                              title="Duplicar item"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteItem(item.id)}
                              title="Excluir item"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Resumo */}
            <Card className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(
                      items.reduce((sum, item) => sum + (item.total || 0), 0),
                      cotacao?.moeda
                    )}
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      <ProductLinkDialog
        open={productLinkDialogOpen}
        onOpenChange={setProductLinkDialogOpen}
        item={itemToLink}
        products={products}
        onLink={handleLinkProduct}
      />

      {itemToCreateProduct && (
        <ProdutoFormDialog
          open={newProductDialogOpen}
          onOpenChange={(open) => {
            setNewProductDialogOpen(open);
            if (!open) {
              setItemToCreateProduct(null);
            }
          }}
          product={{
            nome: itemToCreateProduct.descricao,
            codigo_fabricante: itemToCreateProduct.part_number,
            ncm: itemToCreateProduct.ncm,
          }}
          onClose={() => {
            setNewProductDialogOpen(false);
            setItemToCreateProduct(null);
            loadProducts();
          }}
        />
      )}
    </>
  );
}

