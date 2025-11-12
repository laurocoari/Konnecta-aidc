import { Card } from "@/components/ui/card";
import { TrendingUp, DollarSign, Percent, Calculator } from "lucide-react";

interface FinancialSummaryPanelProps {
  valorTotal: number;
  custoTotal: number;
  lucroTotal: number;
  margemPercentual: number;
}

export function FinancialSummaryPanel({
  valorTotal,
  custoTotal,
  lucroTotal,
  margemPercentual
}: FinancialSummaryPanelProps) {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const summaryItems = [
    {
      label: 'Valor Total',
      value: valorTotal,
      icon: DollarSign,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50'
    },
    {
      label: 'Custo Total',
      value: custoTotal,
      icon: Calculator,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50'
    },
    {
      label: 'Lucro Bruto',
      value: lucroTotal,
      icon: TrendingUp,
      color: lucroTotal >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: lucroTotal >= 0 ? 'bg-green-50' : 'bg-red-50'
    },
    {
      label: 'Margem',
      value: margemPercentual,
      icon: Percent,
      color: margemPercentual >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: margemPercentual >= 0 ? 'bg-green-50' : 'bg-red-50',
      isPercentage: true
    }
  ];

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold">Resumo Financeiro</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryItems.map((item) => {
          const Icon = item.icon;
          return (
            <Card key={item.label} className={`p-4 ${item.bgColor} border-0`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className={`h-4 w-4 ${item.color}`} />
                <span className="text-xs font-medium text-muted-foreground">
                  {item.label}
                </span>
              </div>
              <div className={`text-xl font-bold ${item.color}`}>
                {item.isPercentage 
                  ? `${item.value.toFixed(2)}%` 
                  : formatCurrency(item.value)
                }
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
