import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertCircle,
  Plus,
  Search,
  Edit,
  Trash2,
  History,
  Package,
  ArrowUpDown,
  Download,
  Upload,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProdutoFormDialog } from "@/components/Produtos/ProdutoFormDialog";
import { ImportacaoProdutosDialog } from "@/components/Produtos/ImportacaoProdutosDialog";

export default function Produtos() {
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTipo, setFilterTipo] = useState<string>("todos");
  const [filterEstoque, setFilterEstoque] = useState<string>("todos");
  const [filterCategoria, setFilterCategoria] = useState<string>("todos");
  const [sortColumn, setSortColumn] = useState<string>("nome");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [openDialog, setOpenDialog] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [lowStockAlerts, setLowStockAlerts] = useState<any[]>([]);
  const [openImportDialog, setOpenImportDialog] = useState(false);

  useEffect(() => {
    loadProducts();
    checkLowStock();
  }, []);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, filterTipo, filterEstoque, filterCategoria, sortColumn, sortDirection]);

  const loadProducts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos");
    } else {
      setProducts(data || []);
    }
    setLoading(false);
  };

  const checkLowStock = async () => {
    const { data, error } = await supabase.rpc("check_low_stock");
    
    if (!error && data) {
      setLowStockAlerts(data);
      if (data.length > 0) {
        toast.warning(`${data.length} produto(s) com estoque baixo ou em falta`);
      }
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (p) =>
          p.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.ncm?.includes(searchTerm) ||
          p.categoria?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply tipo filter
    if (filterTipo !== "todos") {
      filtered = filtered.filter((p) => p.tipo === filterTipo);
    }

    // Apply categoria filter
    if (filterCategoria !== "todos") {
      filtered = filtered.filter((p) => p.categoria === filterCategoria);
    }

    // Apply estoque filter
    if (filterEstoque === "baixo") {
      filtered = filtered.filter((p) => p.estoque_atual <= p.estoque_minimo && p.estoque_atual > 0);
    } else if (filterEstoque === "em_falta") {
      filtered = filtered.filter((p) => p.estoque_atual === 0);
    }

    // Apply sorting
    filtered.sort((a, b) => {
      const aVal = a[sortColumn] ?? "";
      const bVal = b[sortColumn] ?? "";
      
      if (sortDirection === "asc") {
        return aVal > bVal ? 1 : -1;
      } else {
        return aVal < bVal ? 1 : -1;
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortColumn(column);
      setSortDirection("asc");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este produto?")) return;

    const { error } = await supabase.from("products").delete().eq("id", id);

    if (error) {
      toast.error("Erro ao excluir produto");
    } else {
      toast.success("Produto excluído com sucesso");
      loadProducts();
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    loadProducts();
    checkLowStock();
  };

  const getStockStatus = (product: any) => {
    if (product.estoque_atual === 0) {
      return { label: "Em Falta", variant: "destructive" as const };
    } else if (product.estoque_atual <= product.estoque_minimo) {
      return { label: "Baixo", variant: "warning" as const };
    }
    return { label: "OK", variant: "success" as const };
  };

  const categorias = [...new Set(products.map((p) => p.categoria).filter(Boolean))];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos & Equipamentos</h1>
          <p className="text-muted-foreground">
            Gestão completa de produtos, estoque e dados fiscais
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Exportar
          </Button>
          <Button 
            variant="outline" 
            onClick={() => setOpenImportDialog(true)} 
            className="gap-2"
          >
            <Upload className="h-4 w-4" />
            Importar CSV
          </Button>
          <Button onClick={() => setOpenDialog(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Produto
          </Button>
        </div>
      </div>

      {lowStockAlerts.length > 0 && (
        <Card className="border-warning bg-warning/10 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-warning mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-warning">Alertas de Estoque</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {lowStockAlerts.length} produto(s) requerem atenção:
              </p>
              <ul className="mt-2 space-y-1">
                {lowStockAlerts.slice(0, 3).map((alert: any) => (
                  <li key={alert.product_id} className="text-sm">
                    <strong>{alert.nome}</strong> - Estoque: {alert.estoque_atual} 
                    {alert.status === "em_falta" ? " (EM FALTA)" : ` (mínimo: ${alert.estoque_minimo})`}
                  </li>
                ))}
                {lowStockAlerts.length > 3 && (
                  <li className="text-sm font-medium">
                    + {lowStockAlerts.length - 3} outros produtos
                  </li>
                )}
              </ul>
            </div>
          </div>
        </Card>
      )}

      <Card className="glass-strong p-6">
        <div className="space-y-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome, código, categoria ou NCM..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <Select value={filterTipo} onValueChange={setFilterTipo}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os tipos</SelectItem>
                <SelectItem value="venda">Venda</SelectItem>
                <SelectItem value="locacao">Locação</SelectItem>
                <SelectItem value="ambos">Ambos</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterEstoque} onValueChange={setFilterEstoque}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Estoque" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos</SelectItem>
                <SelectItem value="baixo">Estoque Baixo</SelectItem>
                <SelectItem value="em_falta">Em Falta</SelectItem>
              </SelectContent>
            </Select>

            {categorias.length > 0 && (
              <Select value={filterCategoria} onValueChange={setFilterCategoria}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas</SelectItem>
                  {categorias.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Foto</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("codigo")}>
                    <div className="flex items-center gap-1">
                      Código <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("nome")}>
                    <div className="flex items-center gap-1">
                      Nome <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right cursor-pointer" onClick={() => handleSort("estoque_atual")}>
                    <div className="flex items-center justify-end gap-1">
                      Estoque <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="text-right">Mínimo</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Venda</TableHead>
                  <TableHead>NCM</TableHead>
                  <TableHead>EAN</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8">
                      Carregando produtos...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          {product.imagem_principal ? (
                            <img
                              src={product.imagem_principal}
                              alt={product.nome}
                              className="w-12 h-12 object-cover rounded"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
                              <Package className="h-6 w-6 text-muted-foreground" />
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-sm">{product.codigo}</TableCell>
                        <TableCell className="font-medium">{product.nome}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{product.categoria}</Badge>
                        </TableCell>
                        <TableCell className="capitalize">{product.tipo}</TableCell>
                        <TableCell className="text-right">
                          <Badge variant={stockStatus.variant}>{product.estoque_atual}</Badge>
                        </TableCell>
                        <TableCell className="text-right text-muted-foreground">
                          {product.estoque_minimo}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.valor_custo
                            ? `R$ ${product.valor_custo.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}`
                            : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.valor_venda
                            ? `R$ ${product.valor_venda.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}`
                            : product.valor_locacao
                            ? `R$ ${product.valor_locacao.toLocaleString("pt-BR", {
                                minimumFractionDigits: 2,
                              })}/mês`
                            : "-"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{product.ncm || "-"}</TableCell>
                        <TableCell className="font-mono text-xs">{product.ean || "-"}</TableCell>
                        <TableCell>
                          <Badge variant={product.status === "ativo" ? "success" : "secondary"}>
                            {product.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleEdit(product)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() => handleDelete(product.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <History className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <div>
              Mostrando {filteredProducts.length} de {products.length} produto(s)
            </div>
          </div>
        </div>
      </Card>

      <ProdutoFormDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        product={editingProduct}
        onClose={handleCloseDialog}
      />

      <ImportacaoProdutosDialog
        open={openImportDialog}
        onOpenChange={setOpenImportDialog}
        onSuccess={() => {
          loadProducts();
          toast.success("Produtos importados com sucesso!");
        }}
      />
    </div>
  );
}
