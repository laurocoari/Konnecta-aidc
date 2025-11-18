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
  Brain,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CotacaoEditDialog } from "@/components/Cotacoes/CotacaoEditDialog";
import { ImportacaoInteligenteDialog } from "@/components/Cotacoes/ImportacaoInteligenteDialog";
import { RevisaoCotacaoDialog } from "@/components/Cotacoes/RevisaoCotacaoDialog";
import { findBestProductMatch } from "@/lib/productMatching";

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
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [revisaoDialogOpen, setRevisaoDialogOpen] = useState(false);
  const [extractedData, setExtractedData] = useState<any>(null);

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
        .from("cotacoes_compras")
        .select(`
          *,
          supplier:suppliers(id, nome, cnpj),
          itens:cotacoes_compras_itens(count)
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
          c.numero_cotacao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.supplier?.nome?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          c.distribuidor?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterStatus !== "todos") {
      filtered = filtered.filter((c) => c.status === filterStatus);
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
      revisar: { label: "Revisar", variant: "destructive" },
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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={() => setImportDialogOpen(true)}>
            <Brain className="h-4 w-4" />
            Importar Cotação (IA)
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <Card className="glass-strong p-4">
        <div className="grid gap-4 md:grid-cols-3">
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
                <TableHead>Número</TableHead>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Moeda</TableHead>
                <TableHead className="text-right">Total</TableHead>
                <TableHead className="text-center">Itens</TableHead>
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
                    <div className="font-medium font-mono">
                      {cotacao.numero_cotacao || "N/A"}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      <span>{cotacao.supplier?.nome || "N/A"}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cotacao.moeda || "BRL"}</Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {cotacao.moeda === "USD" ? "US$" : "R$"}{" "}
                    {formatCurrency(cotacao.total_cotacao || 0).replace("R$", "").trim()}
                  </TableCell>
                  <TableCell className="text-center">
                    <Badge variant="secondary">
                      {cotacao.quantidade_itens || 0} item(ns)
                    </Badge>
                  </TableCell>
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
                      Ver Itens / Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {selectedCotacao && (
        <CotacaoEditDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          cotacao={selectedCotacao}
          onSuccess={loadCotações}
        />
      )}

      <ImportacaoInteligenteDialog
        open={importDialogOpen}
        onOpenChange={setImportDialogOpen}
        onItemsExtracted={(data) => {
          setExtractedData(data);
          setImportDialogOpen(false);
          setRevisaoDialogOpen(true);
        }}
      />

      {extractedData && (
        <RevisaoCotacaoDialog
          open={revisaoDialogOpen}
          onOpenChange={setRevisaoDialogOpen}
          extractedData={extractedData}
          onSuccess={() => {
            loadCotações();
            setExtractedData(null);
            setRevisaoDialogOpen(false);
          }}
        />
      )}
    </div>
  );
}




