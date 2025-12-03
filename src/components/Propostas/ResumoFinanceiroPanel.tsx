import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Calculator } from "lucide-react";

interface ResumoFinanceiroPanelProps {
  totalItens: number;
  somaQuantidades: number;
  descontoTotal: number;
  subtotal: number;
  frete: number;
  outrasDespesas: number;
  totalGeral: number;
}

export function ResumoFinanceiroPanel({
  totalItens,
  somaQuantidades,
  descontoTotal,
  subtotal,
  frete,
  outrasDespesas,
  totalGeral,
}: ResumoFinanceiroPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  return (
    <Card className="p-4 sticky top-4">
      <div className="flex items-center gap-2 mb-4">
        <Calculator className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-lg">Resumo Financeiro</h3>
      </div>

      <div className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Total de Itens:</span>
          <span className="font-medium">{totalItens}</span>
        </div>

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Soma das Quantidades:</span>
          <span className="font-medium">{somaQuantidades}</span>
        </div>

        {descontoTotal > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Desconto Total:</span>
            <span className="font-medium text-destructive">
              -{formatCurrency(descontoTotal)}
            </span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal:</span>
          <span className="font-medium">{formatCurrency(subtotal)}</span>
        </div>

        {frete > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Frete:</span>
            <span className="font-medium">{formatCurrency(frete)}</span>
          </div>
        )}

        {outrasDespesas > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Outras Despesas:</span>
            <span className="font-medium">{formatCurrency(outrasDespesas)}</span>
          </div>
        )}

        <Separator />

        <div className="flex justify-between items-center pt-2">
          <span className="font-bold text-lg">TOTAL GERAL:</span>
          <span className="font-bold text-lg text-primary text-2xl">
            {formatCurrency(totalGeral)}
          </span>
        </div>
      </div>
    </Card>
  );
}



