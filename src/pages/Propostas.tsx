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
import { Plus, FileText, Calendar, DollarSign, Eye, Download, History, GitBranch, Edit, ShoppingCart, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { logger } from "@/lib/logger";
import PropostaFormDialog from "@/components/Propostas/PropostaFormDialog";
import NovaVersaoDialog from "@/components/Propostas/NovaVersaoDialog";
import HistoricoVersoesDialog from "@/components/Propostas/HistoricoVersoesDialog";
import { PropostaPreviewDialog } from "@/components/Propostas/PropostaPreviewDialog";
import { SalesOrderDetailDialog } from "@/components/Vendas/SalesOrderDetailDialog";
import { DeletePropostaDialog } from "@/components/Propostas/DeletePropostaDialog";
import { BulkDeletePropostasDialog } from "@/components/Propostas/BulkDeletePropostasDialog";
import { useNavigate } from "react-router-dom";
import { formatarMoeda } from "@/lib/currencyConverter";

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

const tipoOperacaoColors = {
  venda_direta: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  venda_agenciada: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  locacao_direta: "bg-green-100 text-green-800 hover:bg-green-100",
  locacao_agenciada: "bg-orange-100 text-orange-800 hover:bg-orange-100",
} as const;

const tipoOperacaoLabels = {
  venda_direta: "Venda Direta",
  venda_agenciada: "Venda Agenciada",
  locacao_direta: "Locação Direta",
  locacao_agenciada: "Locação Agenciada",
};

// Tipo para proposta agrupada com versões
type PropostaComVersoes = {
  id: string;
  codigo: string;
  versao: number;
  tipo_operacao: string;
  cliente: any;
  total_geral: number;
  custo_total: number | null;
  lucro_total: number | null;
  margem_percentual_total: number | null;
  data_proposta: string;
  validade: string;
  status: string;
  pdf_url: string | null;
  vendedor: any;
  modelo: any;
  oportunidade: any;
  created_at?: string;
  versoesAnteriores: any[];
};

// Função para agrupar propostas por código
function agruparPropostasPorCodigo(propostas: any[]): PropostaComVersoes[] {
  const grupos = new Map<string, any[]>();
  
  // Agrupar por código
  propostas.forEach(proposta => {
    const codigo = proposta.codigo;
    if (!grupos.has(codigo)) {
      grupos.set(codigo, []);
    }
    grupos.get(codigo)!.push(proposta);
  });
  
  // Para cada grupo, determinar versão mais recente e separar anteriores
  const resultado: PropostaComVersoes[] = [];
  
  grupos.forEach((versoes, codigo) => {
    // Ordenar por versão (maior primeiro) e depois por created_at (mais recente primeiro)
    versoes.sort((a, b) => {
      if (b.versao !== a.versao) {
        return b.versao - a.versao;
      }
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    
    const versaoAtual = versoes[0];
    const versoesAnteriores = versoes.slice(1);
    
    resultado.push({
      ...versaoAtual,
      versoesAnteriores: versoesAnteriores.sort((a, b) => b.versao - a.versao), // Ordenar do mais recente para o mais antigo
    });
  });
  
  // Ordenar resultado por data de criação da versão mais recente (mais recente primeiro)
  resultado.sort((a, b) => {
    const dataA = new Date(a.created_at || a.data_proposta).getTime();
    const dataB = new Date(b.created_at || b.data_proposta).getTime();
    return dataB - dataA;
  });
  
  return resultado;
}

export default function Propostas() {
  const navigate = useNavigate();
  const [propostas, setPropostas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedProposta, setSelectedProposta] = useState<any>(null);
  const [novaVersaoDialogOpen, setNovaVersaoDialogOpen] = useState(false);
  const [historicoDialogOpen, setHistoricoDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedCodigo, setSelectedCodigo] = useState("");
  const [selectedProposalId, setSelectedProposalId] = useState("");
  const [selectedVersao, setSelectedVersao] = useState(1);
  const [salesOrdersMap, setSalesOrdersMap] = useState<Record<string, any>>({});
  const [salesOrderDialogOpen, setSalesOrderDialogOpen] = useState(false);
  const [selectedSalesOrder, setSelectedSalesOrder] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [propostaToDelete, setPropostaToDelete] = useState<any>(null);
  const [selectedPropostas, setSelectedPropostas] = useState<Set<string>>(new Set());
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [expandedPropostas, setExpandedPropostas] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadPropostas();
  }, []);

  useEffect(() => {
    // Carregar pedidos relacionados às propostas aprovadas
    if (propostas.length > 0) {
      loadRelatedSalesOrders();
    }
  }, [propostas]);

  const loadRelatedSalesOrders = async () => {
    try {
      const aprovadasIds = propostas
        .filter((p) => p.status === "aprovada")
        .map((p) => p.id);

      if (aprovadasIds.length === 0) {
        setSalesOrdersMap({});
        return;
      }

      const { data, error } = await supabase
        .from("sales_orders")
        .select("id, numero_pedido, proposta_id")
        .in("proposta_id", aprovadasIds);

      if (error) throw error;

      const map: Record<string, any> = {};
      (data || []).forEach((order) => {
        if (order.proposta_id) {
          map[order.proposta_id] = order;
        }
      });

      setSalesOrdersMap(map);
    } catch (error: any) {
      console.error("Error loading related sales orders:", error);
    }
  };

  const handleGoToSalesOrder = async (proposta: any) => {
    const salesOrder = salesOrdersMap[proposta.id];
    
    if (salesOrder) {
      // Buscar dados completos do pedido
      const { data, error } = await supabase
        .from("sales_orders")
        .select("*")
        .eq("id", salesOrder.id)
        .single();

      if (error) {
        toast.error("Erro ao carregar pedido");
        return;
      }

      setSelectedSalesOrder(data);
      setSalesOrderDialogOpen(true);
    } else {
      toast.info("Pedido ainda não foi criado. Ele será criado automaticamente.");
    }
  };

  const loadPropostas = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          *,
          cliente:clients(
            id,
            nome,
            cnpj,
            email,
            telefone,
            cidade,
            estado
          ),
          modelo:proposal_templates(
            id,
            nome,
            tipo
          ),
          oportunidade:opportunities(
            id,
            product_name,
            tipo_oportunidade,
            valor_estimado
          )
        `)
        .order("created_at", { ascending: false });
      
      // Carregar dados do vendedor separadamente
      if (data) {
        const vendedorIds = [...new Set(data.map(p => p.vendedor_id).filter(Boolean))];
        if (vendedorIds.length > 0) {
          const { data: vendedoresData } = await supabase
            .from("profiles")
            .select("id, full_name, role")
            .in("id", vendedorIds);
          
          if (vendedoresData) {
            const vendedoresMap = new Map(vendedoresData.map(v => [v.id, v]));
            data.forEach(proposta => {
              if (proposta.vendedor_id && vendedoresMap.has(proposta.vendedor_id)) {
                proposta.vendedor = vendedoresMap.get(proposta.vendedor_id);
              }
            });
          }
        }
      }

      if (error) throw error;
      setPropostas(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar propostas:", error);
      toast.error("Erro ao carregar propostas: " + error.message);
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

  const handlePreview = (proposta: any) => {
    setSelectedProposalId(proposta.id);
    setSelectedCodigo(proposta.codigo);
    setSelectedVersao(proposta.versao);
    setPreviewDialogOpen(true);
  };

  const handleDeleteClick = (proposta: any) => {
    logger.ui(`Clicou em deletar proposta: ${proposta.codigo} (ID: ${proposta.id})`);
    setPropostaToDelete(proposta);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!propostaToDelete) {
      logger.warn("DELETE", "Tentativa de deletar proposta sem proposta selecionada");
      return;
    }

    logger.info("DELETE", `Iniciando exclusão da proposta ${propostaToDelete.codigo} (ID: ${propostaToDelete.id})`);

    try {
      // Verificar se há contratos vinculados (NO ACTION constraint)
      logger.db(`Verificando contratos vinculados à proposta ${propostaToDelete.id}`);
      const { data: contratos, error: contratosError } = await supabase
        .from("contracts")
        .select("id, numero")
        .eq("proposta_id", propostaToDelete.id);

      if (contratosError) {
        logger.error("DELETE", "Erro ao verificar contratos", contratosError);
        throw contratosError;
      }

      if (contratos && contratos.length > 0) {
        logger.warn("DELETE", `Não é possível excluir: ${contratos.length} contrato(s) vinculado(s)`, contratos);
        toast.error(
          `Não é possível excluir a proposta. Existem ${contratos.length} contrato(s) vinculado(s) a esta proposta.`
        );
        return;
      }

      logger.db(`Deletando proposta ${propostaToDelete.id} e itens relacionados`);
      
      // Verificar permissões primeiro
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("Usuário não autenticado");
      }
      logger.info("DELETE", `Usuário autenticado: ${user.email} (${user.id})`);

      // Verificar se a proposta ainda existe antes de deletar
      const { data: propostaExists, error: checkError } = await supabase
        .from("proposals")
        .select("id")
        .eq("id", propostaToDelete.id)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        logger.error("DELETE", "Erro ao verificar proposta", checkError);
        throw checkError;
      }

      if (!propostaExists) {
        logger.warn("DELETE", "Proposta não encontrada ou já foi deletada");
        toast.error("A proposta não foi encontrada ou já foi excluída.");
        await loadPropostas();
        setPropostaToDelete(null);
        return;
      }

      // Deletar a proposta (proposal_items e roi_simulations serão deletados em CASCADE)
      // rental_receipts e sales_orders terão proposta_id setado para NULL automaticamente
      const { error: propostaError } = await supabase
        .from("proposals")
        .delete()
        .eq("id", propostaToDelete.id);

      if (propostaError) {
        logger.error("DELETE", "Erro ao deletar proposta", {
          error: propostaError,
          code: propostaError.code,
          message: propostaError.message,
          details: propostaError.details,
          hint: propostaError.hint,
        });
        throw propostaError;
      }

      // Verificar se foi deletado com sucesso (sem .single() para evitar erro 406)
      const { data: propostaAindaExiste, error: verifyError } = await supabase
        .from("proposals")
        .select("id")
        .eq("id", propostaToDelete.id)
        .maybeSingle();

      if (!propostaAindaExiste) {
        logger.info("DELETE", `✅ Proposta ${propostaToDelete.codigo} excluída com sucesso`);
        toast.success("Proposta excluída com sucesso");
        await loadPropostas();
        setPropostaToDelete(null);
      } else {
        logger.warn("DELETE", `⚠️ A proposta ainda existe após tentativa de exclusão. Verifique permissões RLS.`);
        toast.error("Não foi possível excluir a proposta. Verifique suas permissões ou se há dependências.");
      }
    } catch (error: any) {
      logger.error("DELETE", "Erro ao excluir proposta", error);
      toast.error("Erro ao excluir proposta: " + error.message);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedPropostas.size === 0) {
      logger.warn("DELETE", "Tentativa de deletar sem propostas selecionadas");
      return;
    }

    const propostaIds = Array.from(selectedPropostas);
    logger.info("DELETE", `Iniciando exclusão em massa de ${propostaIds.length} proposta(s)`, propostaIds);

    try {
      // Verificar se há contratos vinculados
      logger.db(`Verificando contratos vinculados às propostas selecionadas`);
      const { data: contratos, error: contratosError } = await supabase
        .from("contracts")
        .select("id, numero, proposta_id")
        .in("proposta_id", propostaIds);

      if (contratosError) {
        logger.error("DELETE", "Erro ao verificar contratos", contratosError);
        throw contratosError;
      }

      if (contratos && contratos.length > 0) {
        const propostasComContratos = new Set(contratos.map(c => c.proposta_id));
        const propostasSemContratos = propostaIds.filter(id => !propostasComContratos.has(id));
        
        logger.warn("DELETE", `${contratos.length} contrato(s) encontrado(s)`, {
          contratos,
          propostasComContratos: Array.from(propostasComContratos),
          propostasSemContratos,
        });

        if (propostasSemContratos.length === 0) {
          toast.error(
            `Não é possível excluir as propostas selecionadas. Todas têm contratos vinculados.`
          );
          return;
        }

        // Perguntar se deseja excluir apenas as sem contratos
        const confirmar = window.confirm(
          `${propostasComContratos.size} proposta(s) têm contratos vinculados e não podem ser excluídas.\n\n` +
          `Deseja excluir apenas as ${propostasSemContratos.length} proposta(s) sem contratos?`
        );

        if (!confirmar) {
          return;
        }

        // Deletar apenas as sem contratos
        const { error: propostaError } = await supabase
          .from("proposals")
          .delete()
          .in("id", propostasSemContratos);

        if (propostaError) {
          logger.error("DELETE", "Erro ao deletar propostas", propostaError);
          throw propostaError;
        }

        // Verificar se foram deletadas
        const { data: propostasAindaExistem } = await supabase
          .from("proposals")
          .select("id")
          .in("id", propostasSemContratos);

        const deletadas = propostasSemContratos.length - (propostasAindaExistem?.length || 0);
        
        if (deletadas > 0) {
          logger.info("DELETE", `✅ ${deletadas} proposta(s) excluída(s) com sucesso`);
          toast.success(`${deletadas} proposta(s) excluída(s) com sucesso`);
          await loadPropostas();
          setSelectedPropostas(new Set());
        } else {
          logger.warn("DELETE", `⚠️ Nenhuma proposta foi deletada. Verifique permissões RLS.`);
          toast.error("Não foi possível excluir as propostas. Verifique suas permissões.");
        }
      } else {
        // Nenhum contrato vinculado, pode deletar todas
        logger.db(`Deletando ${propostaIds.length} proposta(s) e itens relacionados`);
        const { error: propostaError } = await supabase
          .from("proposals")
          .delete()
          .in("id", propostaIds);

        if (propostaError) {
          logger.error("DELETE", "Erro ao deletar propostas", propostaError);
          throw propostaError;
        }

        // Verificar se foram deletadas
        const { data: propostasAindaExistem } = await supabase
          .from("proposals")
          .select("id")
          .in("id", propostaIds);

        const deletadas = propostaIds.length - (propostasAindaExistem?.length || 0);
        
        if (deletadas > 0) {
          logger.info("DELETE", `✅ ${deletadas} proposta(s) excluída(s) com sucesso`);
          toast.success(`${deletadas} proposta(s) excluída(s) com sucesso`);
          await loadPropostas();
          setSelectedPropostas(new Set());
        } else {
          logger.warn("DELETE", `⚠️ Nenhuma proposta foi deletada. Verifique permissões RLS.`);
          toast.error("Não foi possível excluir as propostas. Verifique suas permissões.");
        }
      }
    } catch (error: any) {
      logger.error("DELETE", "Erro ao excluir propostas em massa", error);
      toast.error("Erro ao excluir propostas: " + error.message);
    }
  };

  const handleFormSuccess = async (salesOrderCreated?: any) => {
    const propostaId = selectedProposta?.id;
    await loadPropostas();
    setSelectedProposta(null);
    
    // Se um pedido foi criado automaticamente, atualizar o mapa de pedidos
    if (salesOrderCreated && propostaId) {
      setSalesOrdersMap(prev => ({
        ...prev,
        [propostaId]: salesOrderCreated,
      }));
    } else {
      // Recarregar pedidos relacionados para propostas aprovadas
      await loadRelatedSalesOrders();
    }
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

  // Agrupar propostas por código
  const propostasAgrupadas = agruparPropostasPorCodigo(propostas);
  
  // Filtrar propostas agrupadas
  // Se qualquer versão do grupo bater no filtro, mantém o grupo
  const filteredPropostas = propostasAgrupadas.filter((propostaGrupo) => {
    const todasVersoes = [propostaGrupo, ...propostaGrupo.versoesAnteriores];
    
    // Verificar se alguma versão bate nos filtros
    const matchStatus = filterStatus === "all" || todasVersoes.some(v => v.status === filterStatus);
    const matchTipo = filterTipo === "all" || todasVersoes.some(v => v.tipo_operacao === filterTipo);
    const matchSearch =
      propostaGrupo.codigo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      todasVersoes.some(v => v.cliente?.nome?.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchStatus && matchTipo && matchSearch;
  });
  
  const toggleExpanded = (codigo: string) => {
    setExpandedPropostas(prev => {
      const next = new Set(prev);
      if (next.has(codigo)) {
        next.delete(codigo);
      } else {
        next.add(codigo);
      }
      return next;
    });
  };

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
        <div className="flex gap-4 mb-6 items-center">
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
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="rascunho">Rascunho</SelectItem>
              <SelectItem value="enviada">Enviada</SelectItem>
              <SelectItem value="aprovada">Aprovada</SelectItem>
              <SelectItem value="recusada">Recusada</SelectItem>
              <SelectItem value="substituida">Substituída</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os tipos</SelectItem>
              <SelectItem value="venda_direta">Venda Direta</SelectItem>
              <SelectItem value="venda_agenciada">Venda Agenciada</SelectItem>
              <SelectItem value="locacao_direta">Locação Direta</SelectItem>
              <SelectItem value="locacao_agenciada">Locação Agenciada</SelectItem>
            </SelectContent>
          </Select>
          {selectedPropostas.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-muted-foreground">
                {selectedPropostas.size} proposta(s) selecionada(s)
              </span>
              <Button
                variant="destructive"
                size="sm"
                onClick={() => setBulkDeleteDialogOpen(true)}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Deletar Selecionadas
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedPropostas(new Set())}
              >
                Limpar Seleção
              </Button>
            </div>
          )}
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
                <TableHead className="w-12">
                  <Checkbox
                    checked={selectedPropostas.size > 0 && selectedPropostas.size === filteredPropostas.length}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedPropostas(new Set(filteredPropostas.map(p => p.id)));
                      } else {
                        setSelectedPropostas(new Set());
                      }
                    }}
                  />
                </TableHead>
                <TableHead>Número</TableHead>
                <TableHead>Versão</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Custo</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Margem</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPropostas.map((proposta) => {
                const isExpanded = expandedPropostas.has(proposta.codigo);
                const temVersoesAnteriores = proposta.versoesAnteriores.length > 0;
                
                return (
                  <>
                      <TableRow key={proposta.id}>
                        <TableCell>
                          <Checkbox
                            checked={selectedPropostas.has(proposta.id)}
                            onCheckedChange={(checked) => {
                              const newSelected = new Set(selectedPropostas);
                              if (checked) {
                                newSelected.add(proposta.id);
                              } else {
                                newSelected.delete(proposta.id);
                              }
                              setSelectedPropostas(newSelected);
                            }}
                          />
                        </TableCell>
                        <TableCell className="font-mono font-medium">
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            {proposta.codigo}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">v{proposta.versao}</Badge>
                            {temVersoesAnteriores && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-6 px-2 text-xs ${
                                  isExpanded
                                    ? "bg-muted/50 text-muted-foreground hover:bg-muted"
                                    : "bg-primary/10 text-primary hover:bg-primary/20 border border-primary/20"
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleExpanded(proposta.codigo);
                                }}
                              >
                                {isExpanded ? (
                                  <>
                                    <ChevronDown className="h-3 w-3 mr-1" />
                                    Ocultar
                                  </>
                                ) : (
                                  <>
                                    <History className="h-3 w-3 mr-1" />
                                    Ver versões ({proposta.versoesAnteriores.length})
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                  <TableCell>
                    <Badge
                      className={tipoOperacaoColors[proposta.tipo_operacao as keyof typeof tipoOperacaoColors] || ""}
                    >
                      {tipoOperacaoLabels[proposta.tipo_operacao as keyof typeof tipoOperacaoLabels] || "N/A"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">{proposta.cliente?.nome || "N/A"}</span>
                      {proposta.cliente?.cnpj && (
                        <span className="text-xs text-muted-foreground">
                          CNPJ: {proposta.cliente.cnpj}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1 font-semibold text-success">
                      {formatarMoeda(proposta.total_geral, "BRL")}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="text-sm font-medium text-muted-foreground">
                      {proposta.custo_total != null
                        ? `R$ ${Number(proposta.custo_total).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}`
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`text-sm font-semibold ${
                      proposta.lucro_total != null && Number(proposta.lucro_total) >= 0
                        ? "text-success"
                        : proposta.lucro_total != null
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}>
                      {proposta.lucro_total != null
                        ? `R$ ${Number(proposta.lucro_total).toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}`
                        : "-"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className={`text-sm font-semibold ${
                      proposta.margem_percentual_total != null && Number(proposta.margem_percentual_total) >= 0
                        ? "text-success"
                        : proposta.margem_percentual_total != null
                        ? "text-destructive"
                        : "text-muted-foreground"
                    }`}>
                      {proposta.margem_percentual_total != null
                        ? `${Number(proposta.margem_percentual_total).toFixed(2)}%`
                        : "-"}
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
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={statusColors[proposta.status as keyof typeof statusColors]}
                      >
                        {statusLabels[proposta.status as keyof typeof statusLabels]}
                      </Badge>
                      {proposta.status === "aprovada" && salesOrdersMap[proposta.id] && (
                        <Badge variant="outline" className="gap-1">
                          <ShoppingCart className="h-3 w-3" />
                          {salesOrdersMap[proposta.id].numero_pedido}
                        </Badge>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handlePreview(proposta)}
                        title="Visualizar/Gerar PDF"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
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
                      {proposta.status === "aprovada" && (
                        <>
                          {salesOrdersMap[proposta.id] ? (
                            <Button
                              variant="default"
                              size="sm"
                              onClick={() => handleGoToSalesOrder(proposta)}
                              title={`Ver Pedido ${salesOrdersMap[proposta.id].numero_pedido}`}
                              className="gap-1"
                            >
                              <ShoppingCart className="h-4 w-4" />
                              <span className="text-xs">{salesOrdersMap[proposta.id].numero_pedido}</span>
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleGoToSalesOrder(proposta)}
                              title="Ir para Pedido de Venda"
                            >
                              <ShoppingCart className="h-4 w-4" />
                            </Button>
                          )}
                        </>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(proposta)}
                        title="Excluir Proposta"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
                
                {/* Versões anteriores expandidas */}
                {temVersoesAnteriores && isExpanded && (
                  <TableRow>
                    <TableCell colSpan={13} className="bg-muted/30 p-0">
                      <div className="p-4">
                        <h4 className="text-sm font-semibold mb-3 flex items-center gap-2">
                          <History className="h-4 w-4" />
                          Versões Anteriores ({proposta.versoesAnteriores.length})
                        </h4>
                        <div className="space-y-2">
                          {proposta.versoesAnteriores.map((versaoAnterior) => (
                            <div
                              key={versaoAnterior.id}
                              className="flex items-center gap-4 p-3 rounded-lg bg-background/50 border border-border/50"
                            >
                              <div className="flex items-center gap-2 min-w-[80px]">
                                <Badge variant="outline">v{versaoAnterior.versao}</Badge>
                              </div>
                              <div className="flex-1 grid grid-cols-5 gap-4 text-sm">
                                <div>
                                  <span className="text-muted-foreground text-xs">Status</span>
                                  <div className="mt-1">
                                    <Badge
                                      variant={statusColors[versaoAnterior.status as keyof typeof statusColors]}
                                    >
                                      {statusLabels[versaoAnterior.status as keyof typeof statusLabels]}
                                    </Badge>
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Valor</span>
                                  <div className="mt-1 font-semibold text-success">
                                    {formatarMoeda(versaoAnterior.total_geral, "BRL")}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Data</span>
                                  <div className="mt-1 flex items-center gap-1 text-muted-foreground">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(versaoAnterior.data_proposta), "dd/MM/yyyy")}
                                  </div>
                                </div>
                                <div>
                                  <span className="text-muted-foreground text-xs">Validade</span>
                                  <div className="mt-1 flex items-center gap-1">
                                    <Calendar className="h-3 w-3" />
                                    {format(new Date(versaoAnterior.validade), "dd/MM/yyyy")}
                                  </div>
                                </div>
                                <div className="flex items-end gap-2">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedProposalId(versaoAnterior.id);
                                      setSelectedCodigo(versaoAnterior.codigo);
                                      setSelectedVersao(versaoAnterior.versao);
                                      setPreviewDialogOpen(true);
                                    }}
                                    title="Visualizar"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleHistorico(versaoAnterior.codigo)}
                                    title="Histórico"
                                  >
                                    <History className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
                  </>
                );
              })}
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

      <PropostaPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        proposalId={selectedProposalId}
        codigo={selectedCodigo}
        versao={selectedVersao}
      />

      {selectedSalesOrder && (
        <SalesOrderDetailDialog
          open={salesOrderDialogOpen}
          onOpenChange={setSalesOrderDialogOpen}
          salesOrder={selectedSalesOrder}
          onSuccess={() => {
            loadPropostas();
            setSelectedSalesOrder(null);
          }}
        />
      )}

      <DeletePropostaDialog
        open={deleteDialogOpen}
        onOpenChange={(open) => {
          logger.ui(`Delete dialog ${open ? 'aberto' : 'fechado'}`);
          setDeleteDialogOpen(open);
          if (!open) {
            setPropostaToDelete(null);
          }
        }}
        propostaCodigo={propostaToDelete?.codigo || ""}
        onConfirm={handleDeleteConfirm}
      />

      <BulkDeletePropostasDialog
        open={bulkDeleteDialogOpen}
        onOpenChange={(open) => {
          setBulkDeleteDialogOpen(open);
          if (!open) {
            setSelectedPropostas(new Set());
          }
        }}
        quantidade={selectedPropostas.size}
        onConfirm={async () => {
          await handleBulkDelete();
          setBulkDeleteDialogOpen(false);
        }}
      />
    </div>
  );
}
