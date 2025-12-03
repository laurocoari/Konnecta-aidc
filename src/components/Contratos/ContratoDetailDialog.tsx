import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ContractWithRelations } from "@/lib/contractService";
import { calculateProximoVencimento } from "@/lib/contractStatus";
import { logger } from "@/lib/logger";
import {
  FileText,
  Calendar,
  DollarSign,
  Building2,
  User,
  Mail,
  Phone,
  Eye,
  Download,
  Edit,
  ExternalLink,
} from "lucide-react";
import { Loader2 } from "lucide-react";

interface ContratoDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contractId: string | null;
  onSuccess?: () => void;
}

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

const statusLabels = {
  ativo: "Ativo",
  vencendo: "Vencendo",
  concluido: "Concluído",
  rescindido: "Rescindido",
  rascunho: "Rascunho",
  em_analise: "Em Análise",
  aprovado: "Aprovado",
  assinado: "Assinado",
  encerrado: "Encerrado",
};

const tipoLabels = {
  locacao: "Locação",
  venda: "Venda",
  comodato: "Comodato",
  servico: "Serviço",
};

export function ContratoDetailDialog({
  open,
  onOpenChange,
  contractId,
  onSuccess,
}: ContratoDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [contract, setContract] = useState<ContractWithRelations | null>(null);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [generatingPDF, setGeneratingPDF] = useState(false);

  useEffect(() => {
    if (open && contractId) {
      loadContract();
    } else {
      setContract(null);
    }
  }, [open, contractId]);

  const loadContract = async () => {
    if (!contractId) return;

    setLoading(true);
    try {
      logger.db(`Carregando detalhes do contrato ${contractId}`);

      const { data, error } = await supabase
        .from("contracts")
        .select(`
          *,
          cliente:clients(
            id,
            nome,
            cnpj,
            email,
            telefone,
            endereco,
            cidade,
            estado,
            cep
          ),
          modelo:contract_templates(
            id,
            nome,
            tipo
          ),
          proposta:proposals(
            id,
            codigo,
            total_geral
          )
        `)
        .eq("id", contractId)
        .single();

      if (error) {
        logger.error("CONTRACT", "Erro ao carregar contrato", error);
        throw error;
      }

      // Carregar itens
      const { data: itemsData, error: itemsError } = await supabase
        .from("contract_items")
        .select("*")
        .eq("contract_id", contractId)
        .order("created_at", { ascending: true });

      if (itemsError) {
        logger.warn("CONTRACT", "Erro ao carregar itens", itemsError);
      }

      setContract({
        ...data,
        items: itemsData || [],
      } as ContractWithRelations);

      logger.db(`✅ Contrato carregado: ${data.numero}`);
    } catch (error: any) {
      logger.error("CONTRACT", "Erro ao carregar contrato", error);
      toast.error("Erro ao carregar contrato: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (!contract) return;

    setGeneratingPDF(true);
    try {
      logger.info("CONTRACT", `Gerando PDF do contrato ${contract.numero}`);

      // Obter sessão do usuário para autenticação
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      // Chamar Edge Function para gerar HTML
      const { data, error } = await supabase.functions.invoke('generate-contract-pdf', {
        body: { contractId: contract.id },
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        logger.error("CONTRACT", "Erro na Edge Function", error);
        // Tentar extrair mensagem de erro mais detalhada
        const errorMessage = error.message || "Erro ao gerar PDF";
        throw new Error(errorMessage);
      }

      if (!data) {
        throw new Error("Resposta vazia da Edge Function");
      }

      if (data.error) {
        logger.error("CONTRACT", "Erro retornado pela Edge Function", data.error);
        throw new Error(data.error);
      }

      if (!data.html) {
        throw new Error("HTML não foi gerado");
      }

      setHtmlContent(data.html);

      // Criar elemento temporário para renderizar HTML
      const tempDiv = document.createElement("div");
      tempDiv.id = "temp-contract-pdf";
      tempDiv.innerHTML = data.html;
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "210mm";
      document.body.appendChild(tempDiv);

      try {
        // Importar função de geração de PDF
        const { generateContractPDF } = await import("@/lib/contractPdfGenerator");
        await generateContractPDF("temp-contract-pdf", `contrato-${contract.numero}`);
        toast.success("PDF gerado e baixado com sucesso!");
      } finally {
        document.body.removeChild(tempDiv);
      }

      // Atualizar link público se foi gerado
      if (data.linkPublico) {
        await loadContract();
        onSuccess?.();
      }
    } catch (error: any) {
      logger.error("CONTRACT", "Erro ao gerar PDF", error);
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleGeneratePublicLink = async () => {
    if (!contract) return;

    try {
      // Gerar token público
      const token = crypto.randomUUID();

      const { error } = await supabase
        .from("contracts")
        .update({
          token_publico: token,
          link_publico: `${window.location.origin}/contrato-publico?token=${token}`,
        })
        .eq("id", contract.id);

      if (error) throw error;

      toast.success("Link público gerado com sucesso!");
      await loadContract();
      onSuccess?.();
    } catch (error: any) {
      logger.error("CONTRACT", "Erro ao gerar link público", error);
      toast.error("Erro ao gerar link público: " + error.message);
    }
  };

  if (!contractId) return null;

  const proximoVencimento = contract
    ? calculateProximoVencimento(
        contract.data_inicio,
        contract.data_fim,
        contract.valor_mensal
      )
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[900px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Detalhes do Contrato
          </DialogTitle>
          <DialogDescription>
            Informações completas do contrato {contract?.numero}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            <span className="ml-2 text-muted-foreground">Carregando...</span>
          </div>
        ) : contract ? (
          <div className="space-y-6">
            {/* Informações do Contrato */}
            <Card className="p-4">
              <h3 className="font-semibold mb-4">Informações do Contrato</h3>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Número</p>
                  <p className="font-mono font-medium">{contract.numero}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Tipo</p>
                  <Badge variant="outline" className="mt-1">
                    {tipoLabels[contract.tipo as keyof typeof tipoLabels] || contract.tipo}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Status</p>
                  <Badge
                    variant={
                      statusColors[contract.status as keyof typeof statusColors] || "default"
                    }
                    className="mt-1"
                  >
                    {statusLabels[contract.status as keyof typeof statusLabels] || contract.status}
                  </Badge>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Versão</p>
                  <p className="font-medium">v{contract.versao}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data Início
                  </p>
                  <p className="font-medium">
                    {format(new Date(contract.data_inicio), "dd/MM/yyyy", { locale: ptBR })}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    Data Término
                  </p>
                  <p className="font-medium">
                    {contract.data_fim
                      ? format(new Date(contract.data_fim), "dd/MM/yyyy", { locale: ptBR })
                      : "Não definida"}
                  </p>
                </div>
                {proximoVencimento && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      Próximo Vencimento
                    </p>
                    <p className="font-medium">
                      {format(new Date(proximoVencimento), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <DollarSign className="h-3 w-3" />
                    Valor Total
                  </p>
                  <p className="font-semibold text-success">
                    R$ {contract.valor_total.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })}
                  </p>
                </div>
                {contract.valor_mensal && (
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <DollarSign className="h-3 w-3" />
                      Valor Mensal
                    </p>
                    <p className="font-semibold text-success">
                      R$ {contract.valor_mensal.toLocaleString("pt-BR", {
                        minimumFractionDigits: 2,
                      })}
                      /mês
                    </p>
                  </div>
                )}
              </div>
            </Card>

            {/* Informações do Cliente */}
            {contract.cliente && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Cliente
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground flex items-center gap-1">
                      <User className="h-3 w-3" />
                      Nome
                    </p>
                    <p className="font-medium">{contract.cliente.nome}</p>
                  </div>
                  {contract.cliente.cnpj && (
                    <div>
                      <p className="text-sm text-muted-foreground">CNPJ</p>
                      <p className="font-mono text-sm">{contract.cliente.cnpj}</p>
                    </div>
                  )}
                  {contract.cliente.email && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        E-mail
                      </p>
                      <p className="text-sm">{contract.cliente.email}</p>
                    </div>
                  )}
                  {contract.cliente.telefone && (
                    <div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        Telefone
                      </p>
                      <p className="text-sm">{contract.cliente.telefone}</p>
                    </div>
                  )}
                </div>
              </Card>
            )}

            {/* Informações da Proposta */}
            {contract.proposta && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Proposta de Origem</h3>
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <span className="font-mono">{contract.proposta.codigo}</span>
                  <span className="text-sm text-muted-foreground">
                    (R$ {contract.proposta.total_geral.toLocaleString("pt-BR", {
                      minimumFractionDigits: 2,
                    })})
                  </span>
                </div>
              </Card>
            )}

            {/* Modelo Utilizado */}
            {contract.modelo && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Modelo Utilizado</h3>
                <p className="font-medium">{contract.modelo.nome}</p>
                <Badge variant="outline" className="mt-2">
                  {tipoLabels[contract.modelo.tipo as keyof typeof tipoLabels] || contract.modelo.tipo}
                </Badge>
              </Card>
            )}

            {/* Itens do Contrato */}
            {contract.items && contract.items.length > 0 && (
              <Card className="p-4">
                <h3 className="font-semibold mb-4">Itens do Contrato</h3>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Descrição</TableHead>
                      <TableHead className="text-right">Quantidade</TableHead>
                      <TableHead className="text-right">Valor Unitário</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {contract.items.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>{item.descricao}</TableCell>
                        <TableCell className="text-right">{item.quantidade}</TableCell>
                        <TableCell className="text-right">
                          R$ {item.valor_unitario.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          R$ {item.valor_total.toLocaleString("pt-BR", {
                            minimumFractionDigits: 2,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </Card>
            )}

            {/* Observações */}
            {contract.observacoes && (
              <Card className="p-4">
                <h3 className="font-semibold mb-2">Observações</h3>
                <p className="text-sm whitespace-pre-wrap">{contract.observacoes}</p>
              </Card>
            )}

            {/* Ações */}
            <div className="flex gap-2 justify-end">
              <Button 
                variant="outline" 
                onClick={handleExportPDF}
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2" />
                    Exportar PDF
                  </>
                )}
              </Button>
              {!contract.link_publico && (
                <Button variant="outline" onClick={handleGeneratePublicLink}>
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Gerar Link Público
                </Button>
              )}
              {contract.link_publico && (
                <Button
                  variant="outline"
                  onClick={() => {
                    navigator.clipboard.writeText(contract.link_publico!);
                    toast.success("Link copiado para a área de transferência!");
                  }}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  Copiar Link
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-8">
            Contrato não encontrado
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}

