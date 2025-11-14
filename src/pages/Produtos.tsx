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
  Zap,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ProdutoFormDialog } from "@/components/Produtos/ProdutoFormDialog";
import { ImportacaoProdutosDialog } from "@/components/Produtos/ImportacaoProdutosDialog";
import { CotacaoProdutoDialog } from "@/components/Cotacoes/CotacaoProdutoDialog";
import { importUrovoProducts } from "@/utils/importUrovoProducts";
import { SafeImage } from "@/components/ui/SafeImage";

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
  const [importingUrovo, setImportingUrovo] = useState(false);
  const [cotacaoDialogOpen, setCotacaoDialogOpen] = useState(false);
  const [selectedProductForCotacao, setSelectedProductForCotacao] = useState<any>(null);
  const [purchasePrices, setPurchasePrices] = useState<Record<string, number>>({});

  useEffect(() => {
    loadProducts();
    checkLowStock();
  }, []);

  // Recarregar produtos quando voltar para a página (para atualizar estoque)
  useEffect(() => {
    const handleFocus = () => {
      loadProducts();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, []);

  useEffect(() => {
    if (products.length > 0) {
      loadPurchasePrices();
    }
  }, [products]);

  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchTerm, filterTipo, filterEstoque, filterCategoria, sortColumn, sortDirection]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      // Carregar produtos primeiro (sempre funciona)
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      if (productsError) {
        throw productsError;
      }

      if (!productsData || productsData.length === 0) {
        setProducts([]);
        setLoading(false);
        return;
      }

      // Tentar carregar códigos de fornecedor separadamente (pode não existir ainda)
      // Dividir em lotes menores para evitar URLs muito longas
      try {
        const productIds = productsData.map((p: any) => p.id);
        
        // Processar em lotes de 20 produtos por vez para evitar URLs muito longas
        const batchSize = 20;
        const codesMap = new Map();
        
        for (let i = 0; i < productIds.length; i += batchSize) {
          const batch = productIds.slice(i, i + batchSize);
          
          const { data: supplierCodesData, error: supplierCodesError } = await supabase
            .from("product_supplier_codes")
            .select(`
              product_id,
              codigo_fornecedor,
              codigo_principal,
              supplier:suppliers(id, nome)
            `)
            .in("product_id", batch)
            .eq("codigo_principal", true);

          // Se erro 404 ou tabela não existe, ignorar silenciosamente
          if (supplierCodesError) {
            // Erro 404 significa que a tabela não existe ou não está acessível
            if (supplierCodesError.code === "PGRST116" || supplierCodesError.status === 404) {
              // Tabela não existe ou não acessível, continuar sem códigos de fornecedor
              break;
            }
            // Outros erros: logar apenas em desenvolvimento
            if (import.meta.env.DEV) {
              console.warn("Erro ao carregar códigos de fornecedor:", supplierCodesError);
            }
            break;
          }

          // Processar dados recebidos
          if (supplierCodesData) {
            supplierCodesData.forEach((sc: any) => {
              codesMap.set(sc.product_id, {
                codigo_fornecedor: sc.codigo_fornecedor,
                supplier: sc.supplier,
              });
            });
          }
        }

        // Processar produtos com códigos de fornecedor
        const processedProducts = productsData.map((product: any) => {
          const supplierCode = codesMap.get(product.id);
          return {
            ...product,
            codigo_fornecedor_principal: supplierCode?.codigo_fornecedor || product.codigo || null,
            supplier_principal: supplierCode?.supplier || null,
          };
        });

        setProducts(processedProducts);
      } catch (supplierCodesError: any) {
        // Se não conseguir carregar supplier_codes, usar apenas código do produto
        // Não logar erros esperados (404, tabela não existe)
        if (supplierCodesError?.code !== "PGRST116" && supplierCodesError?.status !== 404) {
          if (import.meta.env.DEV) {
            console.warn("Não foi possível carregar códigos de fornecedor:", supplierCodesError);
          }
        }
        const processedProducts = productsData.map((product: any) => ({
          ...product,
          codigo_fornecedor_principal: product.codigo || null,
          supplier_principal: null,
        }));
        setProducts(processedProducts);
      }
    } catch (error: any) {
      console.error("Error loading products:", error);
      toast.error("Erro ao carregar produtos: " + (error.message || "Erro desconhecido"));
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasePrices = async () => {
    if (products.length === 0) return;
    
    try {
      const productIds = products.map((p) => p.id);
      const prices: Record<string, number> = {};

      // Carregar preços em paralelo para melhor performance
      const pricePromises = productIds.map(async (productId) => {
        const { data } = await supabase.rpc("get_lowest_purchase_price", {
          p_product_id: productId,
        });
        return { productId, price: data };
      });

      const results = await Promise.all(pricePromises);
      results.forEach(({ productId, price }) => {
        if (price) {
          prices[productId] = price;
        }
      });

      setPurchasePrices(prices);
    } catch (error) {
      console.error("Error loading purchase prices:", error);
    }
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
          p.sku_interno?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          p.codigo_fornecedor_principal?.toLowerCase().includes(searchTerm.toLowerCase()) ||
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

  const handleViewCotações = (product: any) => {
    setSelectedProductForCotacao(product);
    setCotacaoDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setEditingProduct(null);
    loadProducts();
    checkLowStock();
  };

  const handleImportUrovoProducts = async () => {
    if (!confirm("Deseja importar os produtos Urovo? Esta operação pode demorar alguns minutos.")) {
      return;
    }

    setImportingUrovo(true);
    toast.info("Iniciando importação de produtos Urovo...");

    try {
      const result = await importUrovoProducts();
      await loadProducts();
      await checkLowStock();
      
      if (result.errors.length > 0) {
        toast.warning(`Importação concluída com alguns erros. Verifique o console para detalhes.`);
      } else {
        toast.success(`${result.successCount} produtos Urovo importados com sucesso!`);
      }
    } catch (error: any) {
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setImportingUrovo(false);
    }
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
          <Button 
            variant="secondary" 
            onClick={handleImportUrovoProducts} 
            className="gap-2"
            disabled={importingUrovo}
          >
            <Zap className="h-4 w-4" />
            {importingUrovo ? "Importando..." : "Importar Urovo"}
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
                  <TableHead className="cursor-pointer" onClick={() => handleSort("sku_interno")}>
                    <div className="flex items-center gap-1">
                      SKU Interno <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TableHead>
                  <TableHead className="cursor-pointer" onClick={() => handleSort("codigo")}>
                    <div className="flex items-center gap-1">
                      Código Fornecedor <ArrowUpDown className="h-3 w-3" />
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
                  <TableHead className="text-right">Preço Compra</TableHead>
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
                    <TableCell colSpan={15} className="text-center py-8">
                      Carregando produtos...
                    </TableCell>
                  </TableRow>
                ) : filteredProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={15} className="text-center py-8 text-muted-foreground">
                      Nenhum produto encontrado
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredProducts.map((product) => {
                    const stockStatus = getStockStatus(product);
                    return (
                      <TableRow key={product.id}>
                        <TableCell>
                          <SafeImage
                            src={product.imagem_principal}
                            alt={product.nome}
                            className="w-12 h-12 object-cover rounded"
                          />
                        </TableCell>
                        <TableCell className="font-mono text-sm font-semibold text-primary">
                          {product.sku_interno || "N/A"}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          <div className="flex flex-col">
                            <span>{product.codigo_fornecedor_principal || product.codigo || "N/A"}</span>
                            {product.supplier_principal && (
                              <span className="text-xs text-muted-foreground">
                                {product.supplier_principal.nome}
                              </span>
                            )}
                          </div>
                        </TableCell>
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
                          {purchasePrices[product.id] ? (
                            <div className="flex items-center justify-end gap-1">
                              <span className="font-semibold text-success">
                                R$ {purchasePrices[product.id].toLocaleString("pt-BR", {
                                  minimumFractionDigits: 2,
                                })}
                              </span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => handleViewCotações(product)}
                                title="Ver cotações"
                              >
                                <FileText className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs"
                              onClick={() => handleViewCotações(product)}
                            >
                              Cotar
                            </Button>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {product.custo_medio
                            ? `R$ ${product.custo_medio.toLocaleString("pt-BR", {
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

      {selectedProductForCotacao && (
        <CotacaoProdutoDialog
          open={cotacaoDialogOpen}
          onOpenChange={(open) => {
            setCotacaoDialogOpen(open);
            if (!open) {
              setSelectedProductForCotacao(null);
              loadPurchasePrices();
            }
          }}
          productId={selectedProductForCotacao.id}
          productName={selectedProductForCotacao.nome}
        />
      )}
    </div>
  );
}
