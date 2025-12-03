import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Trash2, Edit2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { ProposalItem } from "./PropostaFormDialog";

interface TabelaItensPropostaProps {
  items: ProposalItem[];
  tipoOperacao: string;
  onUpdateItem: (index: number, field: keyof ProposalItem, value: any) => void;
  onRemoveItem: (index: number) => void;
}

export function TabelaItensProposta({
  items,
  tipoOperacao,
  onUpdateItem,
  onRemoveItem,
}: TabelaItensPropostaProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const calcularSubtotal = (item: ProposalItem) => {
    const isLocacao = tipoOperacao.includes('locacao');
    const periodo = isLocacao ? (item.periodo_locacao_meses || 1) : 1;
    const subtotal = item.quantidade * item.valor_unitario * periodo;
    const desconto = (subtotal * item.desconto) / 100;
    return subtotal - desconto;
  };

  if (items.length === 0) {
    return (
      <div className="border rounded-lg p-8 text-center text-muted-foreground">
        <p className="text-sm">
          Nenhum item adicionado. Busque um produto abaixo para incluir na proposta.
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[300px]">Produto</TableHead>
            <TableHead className="w-[100px]">Quantidade</TableHead>
            <TableHead className="w-[120px]">Preço Unit.</TableHead>
            <TableHead className="w-[100px]">Desconto (%)</TableHead>
            {tipoOperacao.includes('locacao') && (
              <TableHead className="w-[100px]">Período (meses)</TableHead>
            )}
            <TableHead className="w-[120px] text-right">Subtotal</TableHead>
            <TableHead className="w-[80px] text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item, index) => {
            const subtotal = calcularSubtotal(item);
            return (
              <TableRow key={index}>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {item.imagem_url && (
                      <img
                        src={item.imagem_url}
                        alt={item.descricao}
                        className="h-8 w-8 object-cover rounded"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{item.descricao}</p>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        {item.codigo && <span className="font-mono">{item.codigo}</span>}
                        {item.cotacao_numero && (
                          <>
                            {item.codigo && <span>•</span>}
                            <Badge variant="outline" className="text-xs">
                              Cotação {item.cotacao_numero}
                            </Badge>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantidade}
                    onChange={(e) =>
                      onUpdateItem(index, "quantidade", parseInt(e.target.value) || 1)
                    }
                    className="w-20"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    value={item.valor_unitario}
                    onChange={(e) =>
                      onUpdateItem(index, "valor_unitario", parseFloat(e.target.value) || 0)
                    }
                    className="w-24"
                  />
                </TableCell>
                <TableCell>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={item.desconto}
                    onChange={(e) =>
                      onUpdateItem(index, "desconto", parseFloat(e.target.value) || 0)
                    }
                    className="w-20"
                  />
                </TableCell>
                {tipoOperacao.includes('locacao') && (
                  <TableCell>
                    <Input
                      type="number"
                      min="1"
                      value={item.periodo_locacao_meses || 12}
                      onChange={(e) =>
                        onUpdateItem(index, "periodo_locacao_meses", parseInt(e.target.value) || 12)
                      }
                      className="w-20"
                    />
                  </TableCell>
                )}
                <TableCell className="text-right font-medium">
                  {formatCurrency(subtotal)}
                </TableCell>
                <TableCell className="text-center">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onRemoveItem(index)}
                    className="h-8 w-8"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}

