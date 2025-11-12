import { ShoppingCart, Handshake, Package, Repeat } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type TipoOperacao = 'venda_direta' | 'venda_agenciada' | 'locacao_direta' | 'locacao_agenciada';

interface TipoOperacaoOption {
  value: TipoOperacao;
  label: string;
  description: string;
  icon: typeof ShoppingCart;
  color: string;
  bgColor: string;
}

const opcoes: TipoOperacaoOption[] = [
  {
    value: 'venda_direta',
    label: 'Venda Direta',
    description: 'Vendemos produto do nosso estoque com margem de lucro',
    icon: ShoppingCart,
    color: 'text-blue-700',
    bgColor: 'bg-blue-50 border-blue-200 hover:bg-blue-100'
  },
  {
    value: 'venda_agenciada',
    label: 'Venda Agenciada',
    description: 'Vendemos produto de fornecedor com comissão',
    icon: Handshake,
    color: 'text-purple-700',
    bgColor: 'bg-purple-50 border-purple-200 hover:bg-purple-100'
  },
  {
    value: 'locacao_direta',
    label: 'Locação Direta',
    description: 'Alugamos equipamento próprio',
    icon: Package,
    color: 'text-green-700',
    bgColor: 'bg-green-50 border-green-200 hover:bg-green-100'
  },
  {
    value: 'locacao_agenciada',
    label: 'Locação Agenciada',
    description: 'Intermediamos locação de terceiros com comissão',
    icon: Repeat,
    color: 'text-orange-700',
    bgColor: 'bg-orange-50 border-orange-200 hover:bg-orange-100'
  }
];

interface TipoOperacaoSelectorProps {
  value: TipoOperacao;
  onChange: (tipo: TipoOperacao) => void;
  disabled?: boolean;
}

export function TipoOperacaoSelector({ value, onChange, disabled }: TipoOperacaoSelectorProps) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">Tipo de Operação *</label>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {opcoes.map((opcao) => {
          const Icon = opcao.icon;
          const isSelected = value === opcao.value;
          
          return (
            <Card
              key={opcao.value}
              className={cn(
                "cursor-pointer transition-all border-2 p-4",
                isSelected ? opcao.bgColor + " border-current" : "hover:border-border",
                disabled && "opacity-50 cursor-not-allowed"
              )}
              onClick={() => !disabled && onChange(opcao.value)}
            >
              <div className="flex items-start gap-3">
                <Icon className={cn("h-6 w-6 mt-0.5", opcao.color)} />
                <div className="flex-1 space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="font-semibold">{opcao.label}</h4>
                    {isSelected && (
                      <Badge variant="secondary" className="text-xs">
                        Selecionado
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {opcao.description}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
