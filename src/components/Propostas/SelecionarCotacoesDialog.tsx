import { useState, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Search, Loader2, CheckCircle2 } from "lucide-react";
import { buscarCotacoes, buscarTodasCotacoesAtivas, CotacaoCompleta } from "@/lib/cotacoesService";
import { formatarMoeda } from "@/lib/currencyConverter";
import { toast } from "sonner";

interface SelecionarCotacoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCotacoesSelecionadas: (cotacoes: CotacaoCompleta[]) => void;
  clienteId?: string;
  tipoOperacao?: string;
}

export function SelecionarCotacoesDialog({
  open,
  onOpenChange,
  onCotacoesSelecionadas,
  clienteId,
  tipoOperacao,
}: SelecionarCotacoesDialogProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [cotacoes, setCotacoes] = useState<CotacaoCompleta[]>([]);
  const [cotacoesFiltradas, setCotacoesFiltradas] = useState<CotacaoCompleta[]>([]);
  const [cotacoesSelecionadas, setCotacoesSelecionadas] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [searchTimeout, setSearchTimeout] = useState<NodeJS.Timeout | null>(null);

  // Carregar todas as cotações quando o modal abrir
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setCotacoes([]);
      setCotacoesFiltradas([]);
      setCotacoesSelecionadas(new Set());
      return;
    }

    // Carregar todas as cotações ativas ao abrir
    const carregarCotacoes = async () => {
      setLoading(true);
      try {
        const todasCotacoes = await buscarTodasCotacoesAtivas();
        setCotacoes(todasCotacoes);
        setCotacoesFiltradas(todasCotacoes);
      } catch (error: any) {
        console.error("Erro ao carregar cotações:", error);
        toast.error("Erro ao carregar cotações");
      } finally {
        setLoading(false);
      }
    };

    carregarCotacoes();
  }, [open]);

  // Filtrar cotações localmente conforme o usuário digita
  useEffect(() => {
    if (searchTimeout) {
      clearTimeout(searchTimeout);
    }

    if (!searchQuery.trim()) {
      // Se não há busca, mostrar todas
      setCotacoesFiltradas(cotacoes);
      return;
    }

    // Debounce para filtrar
    const timeout = setTimeout(() => {
      filtrarCotacoes(searchQuery.trim());
    }, 300);

    setSearchTimeout(timeout);

    return () => {
      if (timeout) clearTimeout(timeout);
    };
  }, [searchQuery, cotacoes]);

  const filtrarCotacoes = useCallback((query: string) => {
    const termo = query.toLowerCase();
    
    const filtradas = cotacoes.filter((cotacao) => {
      // Buscar por número da cotação
      if (cotacao.numero_cotacao?.toLowerCase().includes(termo)) {
        return true;
      }
      
      // Buscar por nome do fornecedor
      if (cotacao.supplier?.nome?.toLowerCase().includes(termo)) {
        return true;
      }
      
      // Buscar por nome do cliente final
      if (cotacao.cliente_final?.nome?.toLowerCase().includes(termo)) {
        return true;
      }
      
      return false;
    });
    
    setCotacoesFiltradas(filtradas);
  }, [cotacoes]);

  const toggleCotacao = (cotacaoId: string) => {
    const novasSelecionadas = new Set(cotacoesSelecionadas);
    if (novasSelecionadas.has(cotacaoId)) {
      novasSelecionadas.delete(cotacaoId);
    } else {
      novasSelecionadas.add(cotacaoId);
    }
    setCotacoesSelecionadas(novasSelecionadas);
  };

  const selecionarTodas = () => {
    const todasIds = new Set(cotacoesFiltradas.map((c) => c.id));
    setCotacoesSelecionadas(todasIds);
  };

  const deselecionarTodas = () => {
    setCotacoesSelecionadas(new Set());
  };

  const handleContinuar = () => {
    if (cotacoesSelecionadas.size === 0) {
      toast.error("Selecione pelo menos uma cotação");
      return;
    }

    const cotacoesSelecionadasArray = cotacoesFiltradas.filter((c) =>
      cotacoesSelecionadas.has(c.id)
    );
    onCotacoesSelecionadas(cotacoesSelecionadasArray);
    onOpenChange(false);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString("pt-BR");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle>Selecionar Cotação(es)</DialogTitle>
          <DialogDescription>
            Busque e selecione uma ou mais cotações para importar itens para a proposta
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por número da cotação, fornecedor ou cliente final..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Ações de seleção */}
          {cotacoesFiltradas.length > 0 && (
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={selecionarTodas}
              >
                Selecionar Todas
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={deselecionarTodas}
              >
                Deselecionar Todas
              </Button>
              <div className="flex-1" />
              <Badge variant="secondary">
                {cotacoesSelecionadas.size} selecionada(s)
              </Badge>
            </div>
          )}

          {/* Lista de resultados */}
          <ScrollArea className="h-[400px] pr-4">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Buscando cotações...
                </span>
              </div>
            ) : cotacoesFiltradas.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {searchQuery.trim() ? (
                  <p>Nenhuma cotação encontrada para "{searchQuery}"</p>
                ) : (
                  <p>Nenhuma cotação disponível</p>
                )}
              </div>
            ) : (
              <div className="space-y-3">
                {cotacoesFiltradas.map((cotacao) => {
                  const isSelected = cotacoesSelecionadas.has(cotacao.id);
                  return (
                    <Card
                      key={cotacao.id}
                      className={`p-4 cursor-pointer transition-colors ${
                        isSelected
                          ? "border-primary bg-primary/5"
                          : "hover:bg-accent"
                      }`}
                      onClick={() => toggleCotacao(cotacao.id)}
                    >
                      <div className="flex items-start gap-3">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleCotacao(cotacao.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="mt-1"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold">
                                {cotacao.numero_cotacao}
                              </h3>
                              {isSelected && (
                                <CheckCircle2 className="h-4 w-4 text-primary" />
                              )}
                            </div>
                            <Badge variant="outline">
                              {formatarMoeda(cotacao.total_cotacao, cotacao.moeda)}
                            </Badge>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm text-muted-foreground">
                            <div>
                              <span className="font-medium">Fornecedor: </span>
                              {cotacao.supplier?.nome || "N/A"}
                            </div>
                            <div>
                              <span className="font-medium">Moeda: </span>
                              {cotacao.moeda}
                              {cotacao.moeda === "USD" && cotacao.taxa_cambio && (
                                <span className="ml-1">
                                  (Taxa: {cotacao.taxa_cambio.toFixed(4)})
                                </span>
                              )}
                            </div>
                            <div>
                              <span className="font-medium">Data: </span>
                              {formatarData(cotacao.data_cotacao)}
                            </div>
                            <div>
                              <span className="font-medium">Itens: </span>
                              {cotacao.quantidade_itens || cotacao.itens?.length || 0}
                            </div>
                          </div>

                          {cotacao.cliente_final && (
                            <div className="text-sm">
                              <span className="font-medium text-muted-foreground">
                                Cliente Final:{" "}
                              </span>
                              <span>{cotacao.cliente_final.nome}</span>
                              {cotacao.cliente_final.cidade && (
                                <span className="text-muted-foreground ml-2">
                                  - {cotacao.cliente_final.cidade}
                                  {cotacao.cliente_final.estado &&
                                    `/${cotacao.cliente_final.estado}`}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </ScrollArea>

          {/* Botões de ação */}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleContinuar}
              disabled={cotacoesSelecionadas.size === 0}
            >
              Continuar ({cotacoesSelecionadas.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

