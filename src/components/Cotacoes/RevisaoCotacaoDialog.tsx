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
  DollarSign,
  Package,
  AlertTriangle,
  Plus,
  Link2,
  X,
  Zap,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { findBestProductMatch, findAllProductMatches } from "@/lib/productMatching";
import { ProdutoFormDialog } from "@/components/Produtos/ProdutoFormDialog";
import { ProductMatchModal } from "./ProductMatchModal";
import { ProductLinkDialog } from "./ProductLinkDialog";
import { QuickSupplierDialog } from "./QuickSupplierDialog";
import { AddToExistingCotacaoDialog } from "./AddToExistingCotacaoDialog";

interface RevisaoCotacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: any;
  onSuccess: () => void;
}

export function RevisaoCotacaoDialog({
  open,
  onOpenChange,
  extractedData,
  onSuccess,
}: RevisaoCotacaoDialogProps) {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [dollarRate, setDollarRate] = useState<number>(5.0);
  
  // Modals
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [quickSupplierDialogOpen, setQuickSupplierDialogOpen] = useState(false);
  const [productLinkDialogOpen, setProductLinkDialogOpen] = useState(false);
  const [productMatchModalOpen, setProductMatchModalOpen] = useState(false);
  
  // Estados para modals
  const [itemToCreateProduct, setItemToCreateProduct] = useState<any>(null);
  const [itemToEditProduct, setItemToEditProduct] = useState<any>(null);
  const [itemToLinkProduct, setItemToLinkProduct] = useState<any>(null);
  const [itemWithMatches, setItemWithMatches] = useState<any>(null);
  const [matchesForItem, setMatchesForItem] = useState<any[]>([]);
  const [existingCotacaoDialogOpen, setExistingCotacaoDialogOpen] = useState(false);
  const [existingCotacao, setExistingCotacao] = useState<any>(null);

  useEffect(() => {
    if (open && extractedData) {
      loadProducts();
      loadSuppliers();
      loadDollarRate();
      processItems();
    }
  }, [open, extractedData]);

  const loadDollarRate = async () => {
    try {
      const { data } = await supabase
        .from("quote_settings")
        .select("valor_dolar_atual")
        .single();
      if (data?.valor_dolar_atual) {
        setDollarRate(data.valor_dolar_atual);
      }
    } catch (error) {
      console.error("Error loading dollar rate:", error);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, codigo, codigo_fabricante, ncm, custo_dolar, moeda_preferencial, brand_id, categoria")
      .order("nome");
    if (data) setProducts(data);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, nome")
      .order("nome");
    if (data) setSuppliers(data);
  };

  const processItems = async () => {
    if (!extractedData?.items) return;

    const processedItems = await Promise.all(
      extractedData.items.map(async (item: any) => {
        // Tentar encontrar produto por part_number primeiro
        let match = null;
        if (item.part_number) {
          const productByPart = products.find(
            (p) => p.codigo_fabricante?.toLowerCase() === item.part_number.toLowerCase()
          );
          if (productByPart) {
            match = { product: productByPart, score: 1.0, matchType: "code" as const };
          }
        }

        // Se não encontrou, usar fuzzy match
        if (!match) {
          match = await findBestProductMatch(
            item.descricao,
            item.part_number,
            products
          );
        }

        // Calcular valores convertidos
        const precoUnit = item.preco_unitario || 0;
        const valorOriginal = extractedData.moeda === "USD" ? precoUnit : precoUnit;
        const valorConvertido = extractedData.moeda === "USD" 
          ? precoUnit * dollarRate 
          : precoUnit;

        return {
          ...item,
          product_id: match?.product?.id || null,
          product_suggested: match?.product || null,
          match_score: match?.score || 0,
          needs_review: !match || match.score < 0.8,
          editing: false,
          valor_original: valorOriginal,
          valor_convertido: valorConvertido,
          custo_dolar: extractedData.moeda === "USD" ? precoUnit : precoUnit / dollarRate,
        };
      })
    );

    setItems(processedItems);
    
    // Verificar se há itens com matches bons para mostrar modal
    checkForAutoMatches(processedItems);
  };

  const checkForAutoMatches = async (processedItems: any[]) => {
    for (const item of processedItems) {
      if (!item.product_id && item.needs_review) {
        // Buscar todos os matches
        const allMatches = await findAllProductMatches(
          item.descricao,
          item.part_number,
          products,
          0.7 // threshold de 70%
        );
        
        if (allMatches.length > 0) {
          setItemWithMatches(item);
          setMatchesForItem(allMatches);
          setProductMatchModalOpen(true);
          break; // Mostrar apenas o primeiro
        }
      }
    }
  };

  const handleLinkProduct = (productId: string) => {
    if (!itemToLinkProduct && !itemWithMatches) return;
    
    const item = itemToLinkProduct || itemWithMatches;
    const index = items.findIndex((i) => i === item);
    
    if (index !== -1) {
      const product = products.find((p) => p.id === productId);
      const newItems = [...items];
      newItems[index].product_id = productId;
      newItems[index].product_suggested = product;
      newItems[index].needs_review = false;
      setItems(newItems);
      toast.success("Produto vinculado com sucesso!");
    }
    
    setProductLinkDialogOpen(false);
    setProductMatchModalOpen(false);
    setItemToLinkProduct(null);
    setItemWithMatches(null);
  };

  const handleEditItem = (index: number) => {
    const newItems = [...items];
    newItems[index].editing = true;
    setItems(newItems);
  };

  const handleSaveItem = (index: number) => {
    const newItems = [...items];
    newItems[index].editing = false;
    
    // Recalcular valores se moeda for USD
    if (extractedData?.moeda === "USD") {
      const precoUnit = parseFloat(newItems[index].preco_unitario) || 0;
      newItems[index].valor_original = precoUnit;
      newItems[index].valor_convertido = precoUnit * dollarRate;
      newItems[index].custo_dolar = precoUnit;
    }
    
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Recalcular total se quantidade ou preço mudar
    if (field === "quantidade" || field === "preco_unitario") {
      const qty = parseFloat(newItems[index].quantidade) || 0;
      const price = parseFloat(newItems[index].preco_unitario) || 0;
      newItems[index].total = qty * price;
      
      // Recalcular valores convertidos
      if (extractedData?.moeda === "USD") {
        newItems[index].valor_original = price;
        newItems[index].valor_convertido = price * dollarRate;
        newItems[index].custo_dolar = price;
      }
    }
    
    setItems(newItems);
  };

  const handleCreateProduct = (item: any) => {
    setItemToCreateProduct(item);
    setNewProductDialogOpen(true);
  };

  const handleEditProduct = (item: any) => {
    if (!item.product_id) return;
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return;
    
    setItemToEditProduct({ ...item, product });
    setEditProductDialogOpen(true);
  };

  const handleProductCreated = async () => {
    if (!itemToCreateProduct) return;
    await loadProducts();
    
    setTimeout(async () => {
      await loadProducts();
      const { data: newProducts } = await supabase
        .from("products")
        .select("id, nome, codigo, codigo_fabricante")
        .eq("codigo_fabricante", itemToCreateProduct.part_number)
        .order("created_at", { ascending: false })
        .limit(1);

      if (newProducts && newProducts.length > 0) {
        const newProduct = newProducts[0];
        const index = items.findIndex((i) => i === itemToCreateProduct);
        if (index !== -1) {
          const newItems = [...items];
          newItems[index].product_id = newProduct.id;
          newItems[index].product_suggested = newProduct;
          newItems[index].needs_review = false;
          setItems(newItems);
        }
        toast.success("Produto criado e vinculado!");
      }
    }, 1000);

    setNewProductDialogOpen(false);
    setItemToCreateProduct(null);
  };

  const handleProductUpdated = async () => {
    await loadProducts();
    toast.success("Produto atualizado!");
    setEditProductDialogOpen(false);
    setItemToEditProduct(null);
  };

  const handleSupplierCreated = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    loadSuppliers();
  };

  const handleDollarRateChange = (newRate: number) => {
    setDollarRate(newRate);
    // Recalcular todos os valores convertidos
    const newItems = items.map((item) => {
      if (extractedData?.moeda === "USD") {
        const precoUnit = item.preco_unitario || 0;
        return {
          ...item,
          valor_convertido: precoUnit * newRate,
          custo_dolar: precoUnit,
        };
      }
      return item;
    });
    setItems(newItems);
  };

  const handleSaveQuotes = async () => {
    if (!selectedSupplier) {
      toast.error("Selecione um fornecedor");
      return;
    }

    const unlinkedItems = items.filter((item) => !item.product_id);
    if (unlinkedItems.length > 0) {
      toast.error(
        `${unlinkedItems.length} item(ns) ainda não foram vinculados a produtos. Por favor, vincule todos os itens antes de salvar.`
      );
      return;
    }

    if (!extractedData?.moeda) {
      toast.error("Moeda não definida");
      return;
    }

    // Verificar se há cotação ativa do mesmo fornecedor
    const { data: existingCotacao } = await supabase
      .from("cotacoes_compras")
      .select(`
        id,
        numero_cotacao,
        quantidade_itens,
        supplier:suppliers(id, nome)
      `)
      .eq("supplier_id", selectedSupplier)
      .eq("status", "ativo")
      .maybeSingle();

    if (existingCotacao) {
      // Mostrar dialog de decisão
      setExistingCotacao(existingCotacao);
      setExistingCotacaoDialogOpen(true);
      return;
    }

    // Criar nova cotação
    await createNewCotacao();
  };

  const addItemsToExistingCotacao = async (cotacaoId: string) => {
    setLoading(true);
    try {
      const itemsToSave = items.map((item) => ({
        cotacao_id: cotacaoId,
        product_id: item.product_id,
        part_number: item.part_number || null,
        descricao: item.descricao,
        ncm: item.ncm || null,
        quantidade: item.quantidade,
        preco_unitario: item.valor_convertido || item.preco_unitario,
        total: item.total || item.quantidade * (item.valor_convertido || item.preco_unitario),
        moeda: extractedData.moeda || "BRL",
        valor_original: item.valor_original || item.preco_unitario,
        valor_convertido: item.valor_convertido || item.preco_unitario,
        custo_dolar: item.custo_dolar || null,
        imediato: item.imediato || false,
        status: item.needs_review ? "revisar" : "pendente",
        observacoes: `Adicionado via IA - ${new Date().toLocaleString("pt-BR")}`,
      }));

      const { error } = await supabase
        .from("cotacoes_compras_itens")
        .insert(itemsToSave);

      if (error) throw error;

      toast.success(`${itemsToSave.length} item(ns) adicionado(s) à cotação existente!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding items to existing cotacao:", error);
      toast.error(error.message || "Erro ao adicionar itens");
    } finally {
      setLoading(false);
    }
  };

  const createNewCotacao = async () => {
    setLoading(true);
    try {
      // Calcular total da cotação
      const totalCotacao = items.reduce(
        (sum, item) => sum + (item.total || item.quantidade * (item.valor_convertido || item.preco_unitario)),
        0
      );

      // Criar cabeçalho da cotação
      const { data: cotacao, error: cotacaoError } = await supabase
        .from("cotacoes_compras")
        .insert({
          supplier_id: selectedSupplier,
          moeda: extractedData.moeda || "BRL",
          taxa_cambio: extractedData.moeda === "USD" ? dollarRate : null,
          condicao_pagamento: extractedData.condicao_pagamento || null,
          prazo_entrega: null, // Pode ser preenchido depois
          data_cotacao: new Date().toISOString().split("T")[0],
          validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
          observacoes: `Importado via IA - ${new Date().toLocaleString("pt-BR")}`,
          distribuidor: extractedData.distribuidor || null,
          revenda: extractedData.revenda || null,
          cliente_final: extractedData.cliente_final || null,
          transportadora: extractedData.transportadora || null,
          status: "ativo",
          total_cotacao: totalCotacao,
          quantidade_itens: items.length,
        })
        .select()
        .single();

      if (cotacaoError) throw cotacaoError;

      // Criar itens da cotação
      const itemsToSave = items.map((item) => ({
        cotacao_id: cotacao.id,
        product_id: item.product_id,
        part_number: item.part_number || null,
        descricao: item.descricao,
        ncm: item.ncm || null,
        quantidade: item.quantidade,
        preco_unitario: item.valor_convertido || item.preco_unitario,
        total: item.total || item.quantidade * (item.valor_convertido || item.preco_unitario),
        moeda: extractedData.moeda || "BRL",
        valor_original: item.valor_original || item.preco_unitario,
        valor_convertido: item.valor_convertido || item.preco_unitario,
        custo_dolar: item.custo_dolar || null,
        imediato: item.imediato || false,
        status: item.needs_review ? "revisar" : "pendente",
        observacoes: null,
      }));

      const { error: itemsError } = await supabase
        .from("cotacoes_compras_itens")
        .insert(itemsToSave);

      if (itemsError) throw itemsError;

      toast.success(`Cotação ${cotacao.numero_cotacao} criada com ${items.length} item(ns)!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating cotacao:", error);
      toast.error(error.message || "Erro ao criar cotação");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = "BRL") => {
    const symbol = currency === "USD" ? "US$" : "R$";
    return `${symbol} ${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}`;
  };

  const getItemStatus = (item: any) => {
    if (!item.product_id) {
      return { label: "Não vinculado", variant: "destructive" as const, icon: AlertTriangle };
    }
    if (item.imediato) {
      return { label: "Imediato", variant: "default" as const, icon: Zap };
    }
    if (item.needs_review) {
      return { label: "Revisar", variant: "destructive" as const, icon: AlertTriangle };
    }
    return { label: "Bom para salvar", variant: "default" as const, icon: CheckCircle2, className: "bg-green-600 hover:bg-green-700" };
  };

  const unlinkedCount = items.filter((i) => !i.product_id).length;
  const linkedCount = items.filter((i) => i.product_id).length;
  const totalBRL = items.reduce(
    (sum, item) => sum + (item.valor_convertido || item.total || 0),
    0
  );
  const totalOriginal = items.reduce(
    (sum, item) => sum + (item.total || 0),
    0
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Revisar e Salvar Cotação
            </DialogTitle>
            <DialogDescription>
              Revise os itens extraídos, vincule produtos e salve as cotações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações gerais */}
            <Card className="p-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fornecedor *</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuickSupplierDialogOpen(true)}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Novo
                    </Button>
                  </div>
                  <Select
                    value={selectedSupplier}
                    onValueChange={setSelectedSupplier}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Input
                    value={extractedData?.moeda || "BRL"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de Câmbio</Label>
                  {extractedData?.moeda === "USD" ? (
                    <Input
                      type="number"
                      step="0.0001"
                      value={dollarRate}
                      onChange={(e) => handleDollarRateChange(parseFloat(e.target.value) || 5.0)}
                      className="bg-background"
                    />
                  ) : (
                    <Input value="-" disabled className="bg-muted" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Total {extractedData?.moeda || "BRL"}</Label>
                  <Input
                    value={formatCurrency(totalOriginal, extractedData?.moeda)}
                    disabled
                    className="bg-muted font-semibold"
                  />
                  {extractedData?.moeda === "USD" && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totalBRL, "BRL")} convertido
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Alerta de itens não vinculados */}
            {unlinkedCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {unlinkedCount} item(ns) não vinculado(s). Por favor, vincule todos os itens antes de salvar.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabela de itens */}
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
                  {items.map((item, index) => {
                    const status = getItemStatus(item);
                    const StatusIcon = status.icon;
                    
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          {item.editing ? (
                            <Input
                              value={item.descricao}
                              onChange={(e) =>
                                handleItemChange(index, "descricao", e.target.value)
                              }
                              className="w-full"
                            />
                          ) : (
                            <div>
                              <p className="font-medium">{item.descricao}</p>
                              {item.product_suggested && !item.product_id && (
                                <Badge variant="outline" className="mt-1 text-xs">
                                  Sugerido: {item.product_suggested.nome}
                                </Badge>
                              )}
                              {item.product_id && (
                                <Badge variant="default" className="mt-1 text-xs bg-green-500">
                                  Vinculado: {item.product_suggested?.nome || "Produto"}
                                </Badge>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.editing ? (
                            <Input
                              value={item.part_number || ""}
                              onChange={(e) =>
                                handleItemChange(index, "part_number", e.target.value)
                              }
                              className="w-full"
                            />
                          ) : (
                            <span className="text-sm font-mono">
                              {item.part_number || "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.editing ? (
                            <Input
                              value={item.ncm || ""}
                              onChange={(e) =>
                                handleItemChange(index, "ncm", e.target.value)
                              }
                              className="w-full"
                            />
                          ) : (
                            <span className="text-sm font-mono">{item.ncm || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.editing ? (
                            <Input
                              type="number"
                              value={item.quantidade}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "quantidade",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-20 ml-auto"
                            />
                          ) : (
                            item.quantidade
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.editing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={item.preco_unitario}
                              onChange={(e) =>
                                handleItemChange(
                                  index,
                                  "preco_unitario",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-32 ml-auto"
                            />
                          ) : (
                            <div>
                              <p>
                                {formatCurrency(
                                  item.valor_original || item.preco_unitario,
                                  extractedData?.moeda
                                )}
                              </p>
                              {extractedData?.moeda === "USD" && (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.valor_convertido, "BRL")}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total || 0, extractedData?.moeda)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status.variant}
                            className={`gap-1 ${status.className || ""}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.editing ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveItem(index)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(index)}
                                  title="Editar item"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {!item.product_id ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setItemToLinkProduct(item);
                                        setProductLinkDialogOpen(true);
                                      }}
                                      title="Vincular produto"
                                    >
                                      <Link2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCreateProduct(item)}
                                      title="Cadastrar novo produto"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(item)}
                                    title="Editar produto"
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Rodapé com estatísticas */}
            <Card className="p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vinculados</p>
                  <p className="text-2xl font-bold text-green-600">{linkedCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Não Vinculados</p>
                  <p className="text-2xl font-bold text-red-600">{unlinkedCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalOriginal, extractedData?.moeda)}
                  </p>
                  {extractedData?.moeda === "USD" && (
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(totalBRL, "BRL")}
                    </p>
                  )}
                </div>
              </div>
              {unlinkedCount > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Tentar vincular automaticamente os itens restantes
                      toast.info("Funcionalidade de vinculação automática em desenvolvimento");
                    }}
                  >
                    Vincular {unlinkedCount} item(ns) automaticamente
                  </Button>
                </div>
              )}
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveQuotes} 
                disabled={loading || unlinkedCount > 0 || !selectedSupplier || !extractedData?.moeda}
                title={
                  !selectedSupplier 
                    ? "Selecione um fornecedor" 
                    : !extractedData?.moeda 
                    ? "Moeda não definida"
                    : unlinkedCount > 0 
                    ? `${unlinkedCount} item(ns) não vinculado(s)`
                    : "Salvar cotação"
                }
              >
                {loading ? "Salvando..." : "Salvar Cotação no Sistema"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
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
            custo_dolar:
              extractedData?.moeda === "USD"
                ? itemToCreateProduct.preco_unitario
                : null,
            moeda_preferencial: extractedData?.moeda || "BRL",
            categoria: "",
            tipo: "venda",
          }}
          onClose={handleProductCreated}
        />
      )}

      {itemToEditProduct && itemToEditProduct.product && itemToEditProduct.product.id && (
        <ProdutoFormDialog
          open={editProductDialogOpen}
          onOpenChange={(open) => {
            setEditProductDialogOpen(open);
            if (!open) {
              setItemToEditProduct(null);
            }
          }}
          product={itemToEditProduct.product}
          onClose={handleProductUpdated}
        />
      )}

      <QuickSupplierDialog
        open={quickSupplierDialogOpen}
        onOpenChange={setQuickSupplierDialogOpen}
        onSuccess={handleSupplierCreated}
      />

      <ProductLinkDialog
        open={productLinkDialogOpen}
        onOpenChange={setProductLinkDialogOpen}
        item={itemToLinkProduct}
        products={products}
        onLink={handleLinkProduct}
      />

      {itemWithMatches && (
        <ProductMatchModal
          open={productMatchModalOpen}
          onOpenChange={setProductMatchModalOpen}
          item={itemWithMatches}
          matches={matchesForItem}
          onLink={handleLinkProduct}
          onViewOthers={() => {
            setProductMatchModalOpen(false);
            setItemToLinkProduct(itemWithMatches);
            setProductLinkDialogOpen(true);
          }}
          onSkip={() => {
            setProductMatchModalOpen(false);
            setItemWithMatches(null);
            setMatchesForItem([]);
          }}
        />
      )}

      {existingCotacao && (
        <AddToExistingCotacaoDialog
          open={existingCotacaoDialogOpen}
          onOpenChange={setExistingCotacaoDialogOpen}
          cotacao={existingCotacao}
          onAddToExisting={async () => {
            setExistingCotacaoDialogOpen(false);
            await addItemsToExistingCotacao(existingCotacao.id);
          }}
          onCreateNew={async () => {
            setExistingCotacaoDialogOpen(false);
            setExistingCotacao(null);
            await createNewCotacao();
          }}
        />
      )}
    </>
  );
}
