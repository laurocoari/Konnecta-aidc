import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, FileText, Calendar, DollarSign, Download, Eye, AlertCircle, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { loadContratos, ContractWithRelations } from "@/lib/contractService";
import { calculateProximoVencimento } from "@/lib/contractStatus";
import { ContratoFormDialog } from "@/components/Contratos/ContratoFormDialog";
import { ContratoDetailDialog } from "@/components/Contratos/ContratoDetailDialog";
import { logger } from "@/lib/logger";

const statusColors = {
  ativo: "success",
  vencendo: "warning",
  concluido: "default",
  rescindido: "destructive",
  rascunho: "secondary",
  em_analise: "secondary",
  aprovado: "default",
  assinado: "default",
  encerrado: "default",
} as const;

export default function Contratos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [contratos, setContratos] = useState<ContractWithRelations[]>([]);
  const [selectedContractId, setSelectedContractId] = useState<string | null>(null);
  const [detailDialogOpen, setDetailDialogOpen] = useState(false);

  useEffect(() => {
    loadContratosData();
  }, []);

  const loadContratosData = async () => {
    setLoading(true);
    try {
      const data = await loadContratos();
      setContratos(data);
    } catch (error: any) {
      logger.error("CONTRACT", "Erro ao carregar contratos", error);
      toast.error("Erro ao carregar contratos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSuccess = () => {
    loadContratosData();
  };

  const handleViewContract = (contractId: string) => {
    setSelectedContractId(contractId);
    setDetailDialogOpen(true);
  };

  // Calcular estatísticas
  const stats = {
    ativos: contratos.filter((c) => c.status === "ativo").length,
    vencendo: contratos.filter((c) => c.status === "vencendo").length,
    valorMensal: contratos
      .filter((c) => c.status === "ativo" && c.tipo === "locacao" && c.valor_mensal)
      .reduce((sum, c) => sum + (c.valor_mensal || 0), 0),
    taxaRenovacao: calcularTaxaRenovacao(),
  };

  function calcularTaxaRenovacao(): number {
    const concluidos = contratos.filter((c) => c.status === "concluido").length;
    if (concluidos === 0) return 0;

    // Simplificado: considerar renovação se há novo contrato com mesmo cliente
    // Em produção, isso deveria ser mais sofisticado
    const clientesComContratos = new Set(contratos.map((c) => c.cliente_id));
    const clientesComMultiplosContratos = contratos.filter(
      (c, idx, arr) => arr.filter((c2) => c2.cliente_id === c.cliente_id).length > 1
    ).length;

    if (concluidos === 0) return 0;
    return Math.round((clientesComMultiplosContratos / concluidos) * 100);
  }

  // Filtrar contratos
  const filteredContratos = contratos.filter((contrato) => {
    const matchSearch =
      contrato.numero.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.cliente?.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contrato.cliente?.cnpj?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie contratos de venda e locação
          </p>
        </div>
        
        <Button className="gap-2" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Novo Contrato
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Contratos Ativos</p>
          <p className="mt-1 text-3xl font-bold">{stats.ativos}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Vencendo em 30 dias</p>
          <p className="mt-1 text-3xl font-bold text-warning">{stats.vencendo}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Valor Total Mensal</p>
          <p className="mt-1 text-3xl font-bold text-success">
            R$ {(stats.valorMensal / 1000).toFixed(0)}k
          </p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Taxa Renovação</p>
          <p className="mt-1 text-3xl font-bold text-primary">{stats.taxaRenovacao}%</p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contrato ou cliente..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando contratos...</span>
          </div>
        ) : filteredContratos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            {searchTerm ? "Nenhum contrato encontrado" : "Nenhum contrato cadastrado"}
          </p>
        ) : (
          <div className="space-y-4">
            {filteredContratos.map((contrato) => {
              const proximoVencimento = calculateProximoVencimento(
                contrato.data_inicio,
                contrato.data_fim,
                contrato.valor_mensal
              );

              return (
                <Card key={contrato.id} className="glass p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="rounded-lg bg-primary/10 p-3">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      
                      <div className="flex-1 space-y-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="font-semibold text-lg">
                              {contrato.cliente?.nome || "Cliente não encontrado"}
                            </h3>
                            <p className="text-sm font-mono text-muted-foreground">
                              {contrato.numero}
                            </p>
                          </div>
                          <Badge variant={statusColors[contrato.status as keyof typeof statusColors] || "default"}>
                            {contrato.status}
                          </Badge>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Tipo</p>
                            <Badge variant="outline" className="mt-1">
                              {contrato.tipo === "venda" ? "Venda" : contrato.tipo === "locacao" ? "Locação" : contrato.tipo}
                            </Badge>
                          </div>
                          
                          <div>
                            <p className="text-xs text-muted-foreground">Valor</p>
                            <div className="mt-1 flex items-center gap-1 font-semibold text-success">
                              <DollarSign className="h-4 w-4" />
                              {contrato.valor_mensal ? (
                                <>
                                  R$ {contrato.valor_mensal.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                  /mês
                                </>
                              ) : (
                                <>
                                  R$ {contrato.valor_total.toLocaleString("pt-BR", {
                                    minimumFractionDigits: 2,
                                  })}
                                </>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Vigência</p>
                            <div className="mt-1 flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(contrato.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                            </div>
                          </div>

                          <div>
                            <p className="text-xs text-muted-foreground">Próximo Vencimento</p>
                            <div className="mt-1 flex items-center gap-1 text-sm">
                              {contrato.status === "vencendo" && (
                                <AlertCircle className="h-3 w-3 text-warning" />
                              )}
                              <Calendar className="h-3 w-3" />
                              {proximoVencimento
                                ? format(new Date(proximoVencimento), "dd/MM/yyyy", { locale: ptBR })
                                : "-"}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewContract(contrato.id)}
                        title="Visualizar"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleViewContract(contrato.id)}
                        title="Exportar PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      <ContratoFormDialog
        open={open}
        onOpenChange={setOpen}
        onSuccess={handleFormSuccess}
      />

      <ContratoDetailDialog
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        contractId={selectedContractId}
        onSuccess={handleFormSuccess}
      />
    </div>
  );
}
