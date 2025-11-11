import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Plus, FileText, Calendar, DollarSign, Eye, Download, History, GitBranch, Edit } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import PropostaFormDialog from "@/components/Propostas/PropostaFormDialog";
import NovaVersaoDialog from "@/components/Propostas/NovaVersaoDialog";
import HistoricoVersoesDialog from "@/components/Propostas/HistoricoVersoesDialog";

const statusColors = {
  rascunho: "secondary",
  enviada: "default",
  aprovada: "success",
  recusada: "destructive",
  substituida: "warning",
} as const;

const statusLabels = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  substituida: "Substituída",
};

export default function Propostas() {
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<any>(null);
  const [novaVersaoDialogOpen, setNovaVersaoDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [selectedCodigo, setSelectedCodigo] = useState("");

  useEffect(() => {
    loadPropostas();
  }, []);

  const loadPropostas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          *,
          cliente:clients(nome, cnpj)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setPropostas(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar propostas");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (proposta: any) => {
    setSelectedProposta(proposta);
    setFormDialogOpen(true);
  };

  const handleNovaVersao = (proposta: any) => {
    setSelectedProposta(proposta);
    setNovaVersaoDialogOpen(true);
  };

  const handleHistorico = (codigo: string) => {
    setSelectedCodigo(codigo);
    setHistoricoDialogOpen(true);
  };

  const handleFormSuccess = () => {
    loadPropostas();
    setSelectedProposta(null);
  };

  // Calcular estatísticas
  const stats = {
    total: propostas.length,
    rascunho: propostas.filter((p) => p.status === "rascunho").length,
    enviadas: propostas.filter((p) => p.status === "enviada").length,
    aprovadas: propostas.filter((p) => p.status === "aprovada").length,
    valorTotal: propostas
      .filter((p) => p.status === "aprovada")
      .reduce((sum, p) => sum + parseFloat(p.total_geral), 0),
  };

  // Filtrar propostas
  const filteredPropostas = propostas.filter((proposta) => {
    const matchStatus = filterStatus === "all" || proposta.status === filterStatus;
    const matchSearch =
      proposta.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      proposta.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchStatus && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propostas Comerciais</h1>
          <p className="text-muted-foreground">
            Crie e gerencie propostas com controle de versões
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setSelectedProposta(null);
            setFormDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Total de Propostas</p>
          <p className="mt-1 text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Rascunhos</p>
          <p className="mt-1 text-3xl font-bold text-muted-foreground">
            {stats.rascunho}
          </p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Aprovadas</p>
          <p className="mt-1 text-3xl font-bold text-success">{stats.aprovadas}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Valor Aprovado</p>
          <p className="mt-1 text-3xl font-bold text-primary">
            R$ {(stats.valorTotal / 1000).toFixed(1)}k
          </p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Buscar por número ou cliente..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="recusada">Recusada</SelectItem>
              <SelectItem value="substituida">Substituída</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filteredPropostas.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhuma proposta encontrada
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.map((proposta) => (
                <TableRow key={proposta.id}>
                  <TableCell className="font-mono font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {proposta.codigo}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">v{proposta.versao}</Badge>
                  </TableCell>
                  <TableCell>{proposta.cliente?.nome}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 font-semibold text-success">
                      <DollarSign className="h-4 w-4" />
                      R${" "}
                      {proposta.total_geral.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(proposta.data_proposta), "dd/MM/yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="h-3 w-3" />
                      {format(new Date(proposta.validade), "dd/MM/yyyy")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant={statusColors[proposta.status as keyof typeof statusColors]}
                    >
                      {statusLabels[proposta.status as keyof typeof statusLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(proposta)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleNovaVersao(proposta)}
                        title="Nova Versão"
                        disabled={proposta.status === "substituida"}
                      >
                        <GitBranch className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleHistorico(proposta.codigo)}
                        title="Histórico de Versões"
                      >
                        <History className="h-4 w-4" />
                      </Button>
                      {proposta.pdf_url && (
                        <Button variant="ghost" size="sm" title="Baixar PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <PropostaFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        proposta={selectedProposta}
        onSuccess={handleFormSuccess}
      />

      <NovaVersaoDialog
        open={novaVersaoDialogOpen}
        onOpenChange={setNovaVersaoDialogOpen}
        proposta={selectedProposta}
        onSuccess={handleFormSuccess}
      />

      <HistoricoVersoesDialog
        open={historicoDialogOpen}
        onOpenChange={setHistoricoDialogOpen}
        codigo={selectedCodigo}
      />
    </div>
  );
}
