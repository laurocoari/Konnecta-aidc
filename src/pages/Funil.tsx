import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User, Calendar } from "lucide-react";

const stages = [
  { name: "Lead Recebido", count: 25, color: "bg-chart-1/20 border-chart-1" },
  { name: "Qualificação", count: 18, color: "bg-chart-2/20 border-chart-2" },
  { name: "Proposta Enviada", count: 12, color: "bg-chart-3/20 border-chart-3" },
  { name: "Negociação", count: 8, color: "bg-chart-4/20 border-chart-4" },
  { name: "Fechado", count: 5, color: "bg-chart-5/20 border-chart-5" },
];

const mockOportunidades = [
  {
    id: 1,
    cliente: "TechCorp Ltda",
    valor: 45000,
    produto: "Sistema RFID Completo",
    stage: "Proposta Enviada",
    responsavel: "João Silva",
    data: "15/11/2025",
  },
  {
    id: 2,
    cliente: "Inovação Digital",
    valor: 28000,
    produto: "Locação de Equipamentos",
    stage: "Negociação",
    responsavel: "Maria Santos",
    data: "18/11/2025",
  },
  {
    id: 3,
    cliente: "Distribuidora Sul",
    valor: 62000,
    produto: "Contrato Anual",
    stage: "Qualificação",
    responsavel: "Carlos Oliveira",
    data: "20/11/2025",
  },
];

export default function Funil() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Funil de Vendas</h1>
        <p className="text-muted-foreground">
          Acompanhe suas oportunidades em cada etapa do processo
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-5">
        {stages.map((stage) => (
          <Card key={stage.name} className={`glass-strong border-2 p-4 ${stage.color}`}>
            <h3 className="mb-2 text-sm font-semibold">{stage.name}</h3>
            <p className="text-3xl font-bold">{stage.count}</p>
            <p className="mt-1 text-xs text-muted-foreground">oportunidades</p>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {mockOportunidades.map((opp) => (
          <Card key={opp.id} className="glass-strong p-5">
            <div className="mb-4 flex items-start justify-between">
              <div>
                <h3 className="font-semibold">{opp.cliente}</h3>
                <p className="text-sm text-muted-foreground">{opp.produto}</p>
              </div>
              <Badge variant="outline">{opp.stage}</Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <DollarSign className="h-4 w-4" />
                <span className="font-semibold text-success">
                  R$ {opp.valor.toLocaleString('pt-BR')}
                </span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-4 w-4" />
                {opp.responsavel}
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Calendar className="h-4 w-4" />
                {opp.data}
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="glass-strong p-6">
        <h3 className="mb-4 text-lg font-semibold">Resumo do Pipeline</h3>
        <div className="grid gap-4 md:grid-cols-3">
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Valor Total em Aberto</p>
            <p className="text-2xl font-bold text-primary">R$ 1.245.000</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
            <p className="text-2xl font-bold text-success">34.5%</p>
          </div>
          <div className="space-y-1">
            <p className="text-sm text-muted-foreground">Tempo Médio de Fechamento</p>
            <p className="text-2xl font-bold text-warning">18 dias</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
