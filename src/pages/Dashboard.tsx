import { MetricCard } from "@/components/Dashboard/MetricCard";
import { Card } from "@/components/ui/card";
import {
  DollarSign,
  FileText,
  TrendingUp,
  Users,
  AlertCircle,
  Calendar,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const salesData = [
  { month: "Jan", vendas: 45000, locacoes: 12000 },
  { month: "Fev", vendas: 52000, locacoes: 15000 },
  { month: "Mar", vendas: 48000, locacoes: 14000 },
  { month: "Abr", vendas: 61000, locacoes: 18000 },
  { month: "Mai", vendas: 55000, locacoes: 16000 },
  { month: "Jun", vendas: 67000, locacoes: 20000 },
];

const pipelineData = [
  { name: "Lead Recebido", value: 25 },
  { name: "Qualificação", value: 18 },
  { name: "Proposta Enviada", value: 12 },
  { name: "Negociação", value: 8 },
  { name: "Fechado", value: 5 },
];

const COLORS = ["hsl(217, 91%, 60%)", "hsl(142, 76%, 36%)", "hsl(38, 92%, 50%)", "hsl(280, 65%, 60%)", "hsl(340, 75%, 55%)"];

const alerts = [
  { id: 1, text: "Contrato #1234 vence em 7 dias", type: "warning" },
  { id: 2, text: "5 propostas aguardando resposta", type: "info" },
  { id: 3, text: "Cotação #567 sem resposta há 3 dias", type: "warning" },
  { id: 4, text: "Meta mensal atingida! 🎉", type: "success" },
];

export default function Dashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Visão geral do seu negócio
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <MetricCard
          title="Faturamento do Mês"
          value="R$ 87.000"
          change="+12.5% vs mês anterior"
          changeType="positive"
          icon={DollarSign}
          iconColor="text-success"
        />
        <MetricCard
          title="Contratos Ativos"
          value="142"
          change="8 novos este mês"
          changeType="positive"
          icon={FileText}
          iconColor="text-primary"
        />
        <MetricCard
          title="Oportunidades Abertas"
          value="68"
          change="15 em negociação"
          changeType="neutral"
          icon={TrendingUp}
          iconColor="text-warning"
        />
        <MetricCard
          title="Novos Clientes"
          value="24"
          change="+8 este mês"
          changeType="positive"
          icon={Users}
          iconColor="text-primary"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-strong p-6">
          <h3 className="mb-4 text-lg font-semibold">Vendas & Locações</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="vendas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="locacoes" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-strong p-6">
          <h3 className="mb-4 text-lg font-semibold">Pipeline de Vendas</h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pipelineData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {pipelineData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="glass-strong p-6 lg:col-span-2">
          <h3 className="mb-4 text-lg font-semibold">Evolução Mensal</h3>
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={salesData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="month"
                stroke="hsl(var(--muted-foreground))"
                fontSize={12}
              />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Line
                type="monotone"
                dataKey="vendas"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--primary))" }}
              />
              <Line
                type="monotone"
                dataKey="locacoes"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-strong p-6">
          <div className="mb-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-warning" />
            <h3 className="text-lg font-semibold">Alertas e Notificações</h3>
          </div>
          <div className="space-y-3">
            {alerts.map((alert) => (
              <div
                key={alert.id}
                className="flex items-start gap-3 rounded-lg border border-border p-3 text-sm"
              >
                <Calendar className="mt-0.5 h-4 w-4 text-muted-foreground" />
                <p className="flex-1">{alert.text}</p>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
