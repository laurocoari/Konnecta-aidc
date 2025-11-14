import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Plus,
  Search,
  FileText,
  Building2,
  Package,
  DollarSign,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CotacaoFormDialog } from "@/components/Cotacoes/CotacaoFormDialog";

export default function CotacoesCompras() {
  const [cotações, setCotações] = useState<any[]>([]);
  const [filteredCotações, setFilteredCotações] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterProduct, setFilterProduct] = useState<string>("todos");
  const [filterSupplier, setFilterSupplier] = useState<string>("todos");
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<any>(null);

  useEffect(() => {
    loadCotações();
    loadProducts();
    loadSuppliers();
  }, []);

  useEffect(() => {
    filterCotações();
  }, [cotações, searchTerm, filterStatus, filterProduct, filterSupplier]);

  const loadCotações = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("product_quotes")
        .select(`
          *,
          product:products(id, nome, codigo),
          supplier:suppliers(id, nome, cnpj)
        `)
        .order("data_cotacao", { ascending: false });

      if (error) throw error;
      setCotações(data || []);
    } catch (error: any) {
      console.error("Error loading cotações:", error);
      toast.error("Erro ao carregar cotações");
    } finally {
      setLoading(false);
    }
  };

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, codigo")
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

  const filterCotações = () => {
    let filtered = [...cotações];

    if (searchTerm) {
      filtered = filtered.filter(
        (c) =>
          c.product?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.product?.codigo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.supplier?.nome?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "todos") {
      filtered = filtered.filter((c) => c.status === filterStatus);
    }

    if (filterProduct !== "todos") {
      filtered = filtered.filter((c) => c.product_id === filterProduct);
    }

    if (filterSupplier !== "todos") {
      filtered = filtered.filter((c) => c.supplier_id === filterSupplier);
    }

    setFilteredCotações(filtered);
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      ativo: { label: "Ativo", variant: "default" },
      expirado: { label: "Expirado", variant: "secondary" },
      selecionado: { label: "Selecionado", variant: "outline" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const handleNew = () => {
    setSelectedCotacao(null);
    setDialogOpen(true);
  };

  const handleEdit = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Cotações de Compras</h1>
          <p className="text-muted-foreground">
            Gerencie cotações de preços de produtos por fornecedor
          </p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Nova Cotação
        </Button>
      </div>

      {/* Filtros */}
      <Card className="glass-strong p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por produto ou fornecedor..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger>
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Status</SelectItem>
              <SelectItem value="ativo">Ativo</SelectItem>
              <SelectItem value="expirado">Expirado</SelectItem>
              <SelectItem value="selecionado">Selecionado</SelectItem>
              <SelectItem value="cancelado">Cancelado</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterProduct} onValueChange={setFilterProduct}>
            <SelectTrigger>
              <SelectValue placeholder="Produto" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Produtos</SelectItem>
              {products.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.codigo} - {p.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={filterSupplier} onValueChange={setFilterSupplier}>
            <SelectTrigger>
              <SelectValue placeholder="Fornecedor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os Fornecedores</SelectItem>
              {suppliers.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.nome}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      {/* Tabela */}
      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando cotações...
        </div>
      ) : filteredCotações.length === 0 ? (
        <Card className="glass-strong p-12 text-center">
          <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma cotação encontrada. Clique em "Nova Cotação" para começar.
          </p>
        </Card>
      ) : (
        <Card className="glass-strong">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Produto</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead className="text-right">Preço Unitário</TableHead>
                <TableHead className="text-center">Qtd. Mínima</TableHead>
                <TableHead>Prazo Entrega</TableHead>
                <TableHead>Data Cotação</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredCotações.map((cotacao) => (
                <TableRow key={cotacao.id}>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {cotacao.product?.nome || "N/A"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {cotacao.product?.codigo || ""}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{cotacao.supplier?.nome || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {formatCurrency(cotacao.preco_unitario)}
                  </TableCell>
                  <TableCell className="text-center">
                    {cotacao.quantidade_minima || "-"}
                  </TableCell>
                  <TableCell>{cotacao.prazo_entrega || "-"}</TableCell>
                  <TableCell>{formatDate(cotacao.data_cotacao)}</TableCell>
                  <TableCell>
                    {cotacao.validade ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(cotacao.validade)}
                      </div>
                    ) : (
                      "-"
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(cotacao.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(cotacao)}
                    >
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      <CotacaoFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        cotacao={selectedCotacao}
        onSuccess={loadCotações}
      />
    </div>
  );
}


