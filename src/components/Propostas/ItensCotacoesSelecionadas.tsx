import { useState, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Package } from "lucide-react";
import { CotacaoCompleta, CotacaoItem } from "@/lib/cotacoesService";
import { formatarMoeda } from "@/lib/currencyConverter";

interface ItensCotacoesSelecionadasProps {
  cotacoes: CotacaoCompleta[];
  onImportarItens: (itensSelecionados: ItemSelecionado[]) => void;
  onCancelar: () => void;
}

export interface ItemSelecionado {
  cotacao: CotacaoCompleta;
  item: CotacaoItem;
  // Valores calculados
  valorOriginal: number;
  valorConvertidoBRL: number;
  valorConvertidoUSD: number;
  valorEscolhido: number; // O valor que será usado na proposta
  moedaEscolhida: "BRL" | "USD";
  modoConversao: "original" | "convertido_brl" | "convertido_usd";
}

type ModoConversao = "original" | "convertido_brl" | "convertido_usd";

export function ItensCotacoesSelecionadas({
  cotacoes,
  onImportarItens,
  onCancelar,
}: ItensCotacoesSelecionadasProps) {
  const [itensSelecionados, setItensSelecionados] = useState<Set<string>>(
    new Set()
  );
  const [modoConversao, setModoConversao] = useState<ModoConversao>("original");

  // Flatten todos os itens de todas as cotações com informações da cotação
  const todosItens = useMemo(() => {
    const itens: Array<{
      id: string;
      cotacao: CotacaoCompleta;
      item: CotacaoItem;
      key: string; // chave única: cotacaoId-itemId
    }> = [];

    cotacoes.forEach((cotacao) => {
      cotacao.itens?.forEach((item) => {
        itens.push({
          id: item.id,
          cotacao,
          item,
          key: `${cotacao.id}-${item.id}`,
        });
      });
    });

    return itens;
  }, [cotacoes]);

  // Obter valor original (NUNCA alterar - exatamente como está na base)
  const obterValorOriginal = (item: CotacaoItem): number => {
    // Priorizar valor_original se existir, senão usar preco_unitario
    if (item.valor_original !== null && item.valor_original !== undefined && item.valor_original > 0) {
      return item.valor_original;
    }
    return item.preco_unitario || 0;
  };

  // Calcular valores convertidos para cada item
  const calcularValoresItem = (
    item: CotacaoItem,
    cotacao: CotacaoCompleta
  ): {
    valorOriginal: number;
    valorConvertidoBRL: number;
    valorConvertidoUSD: number;
    moedaOriginal: string;
    taxaCambio: number | null;
  } => {
    const moedaOriginal = item.moeda || cotacao.moeda || "BRL";
    const taxaCambio = cotacao.taxa_cambio || null;
    const valorOriginal = obterValorOriginal(item);

    let valorConvertidoBRL: number;
    let valorConvertidoUSD: number;

    if (moedaOriginal === "USD") {
      // Se original é USD
      if (taxaCambio && taxaCambio > 0) {
        valorConvertidoBRL = valorOriginal * taxaCambio;
      } else {
        // Se não há taxa de câmbio, não pode converter - usar valor original
        valorConvertidoBRL = valorOriginal;
      }
      valorConvertidoUSD = valorOriginal; // USD original = USD convertido
    } else {
      // Se original é BRL
      valorConvertidoBRL = valorOriginal; // BRL original = BRL convertido
      if (taxaCambio && taxaCambio > 0) {
        valorConvertidoUSD = valorOriginal / taxaCambio;
      } else {
        // Se não há taxa de câmbio, não pode converter - usar valor original
        valorConvertidoUSD = valorOriginal;
      }
    }

    return {
      valorOriginal,
      valorConvertidoBRL,
      valorConvertidoUSD,
      moedaOriginal,
      taxaCambio,
    };
  };

  // Calcular valor a usar baseado no modo de conversão selecionado
  const calcularValorAUsar = (
    valores: {
      valorOriginal: number;
      valorConvertidoBRL: number;
      valorConvertidoUSD: number;
      moedaOriginal: string;
    }
  ): { valor: number; moeda: "BRL" | "USD" } => {
    if (modoConversao === "original") {
      // Usar valor original na moeda original
      return {
        valor: valores.valorOriginal,
        moeda: valores.moedaOriginal === "USD" ? "USD" : "BRL",
      };
    }

    if (modoConversao === "convertido_brl") {
      // Sempre usar valor convertido para BRL
      return {
        valor: valores.valorConvertidoBRL,
        moeda: "BRL",
      };
    }

    if (modoConversao === "convertido_usd") {
      // Sempre usar valor convertido para USD
      // Se não foi possível converter (sem taxa de câmbio), usar valor original
      return {
        valor: valores.valorConvertidoUSD,
        moeda: "USD",
      };
    }

    // Fallback: usar valor original
    return {
      valor: valores.valorOriginal,
      moeda: valores.moedaOriginal === "USD" ? "USD" : "BRL",
    };
  };

  const toggleItem = (key: string) => {
    const novasSelecionadas = new Set(itensSelecionados);
    if (novasSelecionadas.has(key)) {
      novasSelecionadas.delete(key);
    } else {
      novasSelecionadas.add(key);
    }
    setItensSelecionados(novasSelecionadas);
  };

  const selecionarTodos = () => {
    const todasKeys = new Set(todosItens.map((i) => i.key));
    setItensSelecionados(todasKeys);
  };

  const deselecionarTodos = () => {
    setItensSelecionados(new Set());
  };

  const handleImportar = () => {
    if (itensSelecionados.size === 0) {
      return;
    }

    const itensParaImportar: ItemSelecionado[] = todosItens
      .filter((i) => itensSelecionados.has(i.key))
      .map((i) => {
        const valores = calcularValoresItem(i.item, i.cotacao);
        const valorAUsar = calcularValorAUsar(valores);

        return {
          cotacao: i.cotacao,
          item: i.item,
          valorOriginal: valores.valorOriginal,
          valorConvertidoBRL: valores.valorConvertidoBRL,
          valorConvertidoUSD: valores.valorConvertidoUSD,
          valorEscolhido: valorAUsar.valor,
          moedaEscolhida: valorAUsar.moeda,
          modoConversao: modoConversao,
        };
      });

    onImportarItens(itensParaImportar);
  };

  // Agrupar itens por cotação
  const itensPorCotacao = useMemo(() => {
    const grupos: Record<string, typeof todosItens> = {};
    todosItens.forEach((item) => {
      if (!grupos[item.cotacao.id]) {
        grupos[item.cotacao.id] = [];
      }
      grupos[item.cotacao.id].push(item);
    });
    return grupos;
  }, [todosItens]);

  return (
    <div className="space-y-4">
      {/* Opções de conversão */}
      <Card className="p-4">
        <Label className="text-base font-semibold mb-3 block">
          Opções de Conversão de Custo
        </Label>
        <RadioGroup
          value={modoConversao}
          onValueChange={(value) => setModoConversao(value as ModoConversao)}
        >
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="original" id="original" />
            <Label htmlFor="original" className="cursor-pointer">
              Usar o valor original da cotação (padrão)
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="convertido_brl" id="convertido_brl" />
            <Label htmlFor="convertido_brl" className="cursor-pointer">
              Usar convertido para BRL
            </Label>
          </div>
          <div className="flex items-center space-x-2">
            <RadioGroupItem value="convertido_usd" id="convertido_usd" />
            <Label htmlFor="convertido_usd" className="cursor-pointer">
              Usar convertido para USD
            </Label>
          </div>
        </RadioGroup>
      </Card>

      {/* Ações de seleção */}
      <div className="flex gap-2 items-center">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={selecionarTodos}
        >
          Selecionar Todos
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={deselecionarTodos}
        >
          Deselecionar Todos
        </Button>
        <div className="flex-1" />
        <Badge variant="secondary">
          {itensSelecionados.size} item(ns) selecionado(s)
        </Badge>
      </div>

      {/* Lista de itens agrupados por cotação */}
      <ScrollArea className="h-[500px] pr-4">
        <div className="space-y-6">
          {Object.entries(itensPorCotacao).map(([cotacaoId, itens]) => {
            const cotacao = cotacoes.find((c) => c.id === cotacaoId);
            if (!cotacao) return null;

            return (
              <Card key={cotacaoId} className="p-4">
                <div className="mb-4 pb-3 border-b">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-lg">
                        {cotacao.numero_cotacao}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Fornecedor: {cotacao.supplier?.nome || "N/A"}
                      </p>
                      {cotacao.taxa_cambio && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Taxa de câmbio: {cotacao.taxa_cambio.toFixed(4)}
                        </p>
                      )}
                    </div>
                    <Badge variant="outline">
                      {itens.length} item(ns)
                    </Badge>
                  </div>
                </div>

                <div className="space-y-3">
                  {itens.map(({ item, key }) => {
                    const isSelected = itensSelecionados.has(key);
                    const valores = calcularValoresItem(item, cotacao);
                    const valorAUsar = calcularValorAUsar(valores);

                    return (
                      <div
                        key={key}
                        className={`p-3 border rounded-lg transition-colors ${
                          isSelected
                            ? "border-primary bg-primary/5"
                            : "hover:bg-accent"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleItem(key)}
                            className="mt-1"
                          />
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h4 className="font-medium">{item.descricao}</h4>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                  {item.part_number && (
                                    <>
                                      <span>Part Number: {item.part_number}</span>
                                      <span>•</span>
                                    </>
                                  )}
                                  <span>Qtd: {item.quantidade}</span>
                                  <span>•</span>
                                  <span>Moeda: {valores.moedaOriginal}</span>
                                </div>
                              </div>
                              {isSelected && (
                                <CheckCircle2 className="h-5 w-5 text-primary mt-1" />
                              )}
                            </div>

                            {/* Bloco de custos - sempre exibir os 3 valores */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm bg-muted/30 p-3 rounded-md">
                              <div className="bg-background/50 p-2 rounded border">
                                <span className="text-muted-foreground block text-xs mb-1 font-medium">
                                  Custo original:
                                </span>
                                <span className="font-semibold text-base">
                                  {formatarMoeda(valores.valorOriginal, valores.moedaOriginal)}
                                </span>
                              </div>
                              <div className="bg-background/50 p-2 rounded border">
                                <span className="text-muted-foreground block text-xs mb-1 font-medium">
                                  Convertido (BRL):
                                </span>
                                <span className="font-semibold text-base text-green-600 dark:text-green-400">
                                  {formatarMoeda(valores.valorConvertidoBRL, "BRL")}
                                </span>
                              </div>
                              <div className="bg-background/50 p-2 rounded border">
                                <span className="text-muted-foreground block text-xs mb-1 font-medium">
                                  Convertido (USD):
                                </span>
                                <span className="font-semibold text-base text-blue-600 dark:text-blue-400">
                                  {formatarMoeda(valores.valorConvertidoUSD, "USD")}
                                </span>
                              </div>
                              <div className={`${
                                modoConversao === "original" 
                                  ? "bg-primary/20 border-primary" 
                                  : modoConversao === "convertido_brl" 
                                    ? "bg-green-500/20 border-green-500" 
                                    : "bg-blue-500/20 border-blue-500"
                              } p-3 rounded border-2 shadow-sm`}>
                                <span className="text-muted-foreground block text-xs mb-1 font-semibold uppercase">
                                  Custo a usar:
                                </span>
                                <span className="font-bold text-lg block">
                                  {formatarMoeda(valorAUsar.valor, valorAUsar.moeda)}
                                </span>
                                <span className="text-xs text-muted-foreground block mt-1">
                                  {modoConversao === "original" 
                                    ? "Valor original" 
                                    : modoConversao === "convertido_brl" 
                                      ? "Convertido para BRL" 
                                      : "Convertido para USD"}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            );
          })}
        </div>
      </ScrollArea>

      {/* Botões de ação */}
      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button type="button" variant="outline" onClick={onCancelar}>
          Cancelar
        </Button>
        <Button
          type="button"
          onClick={handleImportar}
          disabled={itensSelecionados.size === 0}
        >
          <Package className="h-4 w-4 mr-2" />
          Importar Itens para Proposta ({itensSelecionados.size})
        </Button>
      </div>
    </div>
  );
}
