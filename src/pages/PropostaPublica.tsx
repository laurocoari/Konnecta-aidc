import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Download, Lock, CheckCircle2, XCircle, Clock } from "lucide-react";
import { toast } from "sonner";

const statusLabels: Record<string, string> = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  revisada: "Revisada",
};

const statusIcons: Record<string, any> = {
  rascunho: Clock,
  enviada: Clock,
  aprovada: CheckCircle2,
  recusada: XCircle,
  revisada: Clock,
};

export default function PropostaPublica() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");
  
  const [loading, setLoading] = useState(true);
  const [proposal, setProposal] = useState<any>(null);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    loadProposal();
  }, [token]);

  const loadProposal = async () => {
    if (!token) {
      setError("Token inválido ou não fornecido");
      setLoading(false);
      return;
    }

    try {
      // Buscar proposta pelo token (acesso público)
      const { data, error } = await supabase
        .from("proposals")
        .select(`
          *,
          cliente:clients(*),
          items:proposal_items(*)
        `)
        .eq("token_publico", token)
        .single();

      if (error) throw error;

      if (!data) {
        setError("Proposta não encontrada");
        return;
      }

      setProposal(data);
    } catch (error: any) {
      console.error("Erro ao carregar proposta:", error);
      setError("Erro ao carregar proposta: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
        body: { proposalId: proposal.id },
      });

      if (error) throw error;

      const blob = new Blob([data.html], { type: 'text/html' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `proposta-${proposal.codigo}-v${proposal.versao}.html`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success("Download iniciado!");
    } catch (error: any) {
      console.error("Erro ao baixar PDF:", error);
      toast.error("Erro ao baixar PDF");
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', { 
      style: 'currency', 
      currency: 'BRL' 
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('pt-BR');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Carregando proposta...</p>
        </div>
      </div>
    );
  }

  if (error || !proposal) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <div className="text-center max-w-md mx-auto p-8 bg-card rounded-lg shadow-lg">
          <Lock className="h-16 w-16 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Acesso Negado</h1>
          <p className="text-muted-foreground">{error || "Proposta não encontrada"}</p>
        </div>
      </div>
    );
  }

  const StatusIcon = statusIcons[proposal.status] || Clock;

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Cabeçalho */}
        <div className="bg-card rounded-lg shadow-lg p-8 mb-6">
          <div className="flex justify-between items-start mb-6">
            <div>
              <h1 className="text-3xl font-bold text-primary mb-2">
                KONNECTA CONSULTORIA
              </h1>
              <div className="text-sm text-muted-foreground space-y-1">
                <p><strong>FRANCY LAURO PACHECO PEREIRA</strong></p>
                <p>Rua Rio Ebro, Nº7, QD12</p>
                <p>69090-643 – Manaus, AM</p>
                <p>Telefone: (92) 3242-1311</p>
                <p>CNPJ: 05.601.700/0001-55</p>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 justify-end mb-2">
                <StatusIcon className="h-5 w-5" />
                <span className="font-semibold">{statusLabels[proposal.status]}</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Emitida em: {formatDate(proposal.data_proposta)}
              </p>
              <p className="text-sm text-muted-foreground">
                Válida até: {formatDate(proposal.validade)}
              </p>
            </div>
          </div>

          <div className="text-center border-t border-b py-4 my-6">
            <h2 className="text-2xl font-bold text-primary">
              Proposta Comercial Nº {proposal.codigo} - Versão {proposal.versao}
            </h2>
          </div>

          {/* Dados do Cliente */}
          <div className="bg-muted/50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold mb-3 text-primary">PARA</h3>
            <div className="space-y-1 text-sm">
              <p><strong>Cliente:</strong> {proposal.cliente.nome}</p>
              <p><strong>CNPJ:</strong> {proposal.cliente.cnpj}</p>
              <p><strong>Endereço:</strong> {proposal.cliente.endereco}</p>
              <p><strong>Cidade/UF:</strong> {proposal.cliente.cidade}/{proposal.cliente.estado}</p>
            </div>
          </div>

          {/* Introdução */}
          {proposal.introducao && (
            <div className="mb-6">
              <h3 className="font-semibold mb-3 text-primary">APRESENTAÇÃO</h3>
              <p className="text-sm whitespace-pre-wrap">{proposal.introducao}</p>
            </div>
          )}

          {/* Itens */}
          <div className="mb-6">
            <h3 className="font-semibold mb-3 text-primary">ITENS DA PROPOSTA</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted">
                  <tr>
                    <th className="p-2 text-left">Descrição</th>
                    <th className="p-2 text-left">Código</th>
                    <th className="p-2 text-center">Un.</th>
                    <th className="p-2 text-center">Qtde</th>
                    <th className="p-2 text-right">Preço Unit.</th>
                    <th className="p-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {proposal.items.map((item: any, index: number) => (
                    <tr key={index} className="border-b">
                      <td className="p-2">{item.descricao}</td>
                      <td className="p-2">{item.codigo || '-'}</td>
                      <td className="p-2 text-center">{item.unidade}</td>
                      <td className="p-2 text-center">{item.quantidade}</td>
                      <td className="p-2 text-right">{formatCurrency(item.preco_unitario)}</td>
                      <td className="p-2 text-right font-semibold">{formatCurrency(item.total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Resumo */}
            <div className="mt-4 flex justify-end">
              <div className="w-80 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span className="font-semibold">{formatCurrency(proposal.total_itens)}</span>
                </div>
                {proposal.desconto_total > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Desconto:</span>
                    <span className="font-semibold">-{formatCurrency(proposal.desconto_total)}</span>
                  </div>
                )}
                {proposal.despesas_adicionais > 0 && (
                  <div className="flex justify-between">
                    <span>Despesas Adicionais:</span>
                    <span className="font-semibold">{formatCurrency(proposal.despesas_adicionais)}</span>
                  </div>
                )}
                <div className="flex justify-between border-t pt-2 text-lg font-bold text-primary">
                  <span>TOTAL GERAL:</span>
                  <span>{formatCurrency(proposal.total_geral)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Condições Comerciais */}
          {proposal.condicoes_comerciais && (
            <div className="mb-6 bg-muted/50 p-4 rounded-lg border-l-4 border-primary">
              <h3 className="font-semibold mb-3 text-primary">CONDIÇÕES COMERCIAIS</h3>
              <p className="text-sm whitespace-pre-wrap">
                {proposal.condicoes_comerciais.texto || 
                 'Condições comerciais a serem definidas conforme negociação.'}
              </p>
            </div>
          )}

          {/* Validade */}
          <div className="bg-yellow-50 dark:bg-yellow-950/30 p-4 rounded-lg border-l-4 border-yellow-500">
            <p className="text-sm">
              <strong>⏰ Validade desta Proposta:</strong> {formatDate(proposal.validade)}
            </p>
          </div>

          {/* Botões */}
          <div className="mt-6 flex gap-4">
            <Button onClick={handleDownloadPDF} className="flex-1">
              <Download className="mr-2 h-4 w-4" />
              Baixar PDF
            </Button>
          </div>
        </div>

        {/* Rodapé */}
        <div className="text-center text-sm text-muted-foreground">
          <p className="font-semibold">Konnecta Consultoria – Todos os direitos reservados</p>
          <p>Sistema CRM Konnecta – www.konnecta.com.br</p>
        </div>
      </div>
    </div>
  );
}
