import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  ArrowUpRight,
  ArrowDownRight,
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
} from "recharts";

const fluxoCaixaData = [
  { mes: "Jul", receitas: 85000, despesas: 45000 },
  { mes: "Ago", receitas: 92000, despesas: 48000 },
  { mes: "Set", receitas: 78000, despesas: 52000 },
  { mes: "Out", receitas: 95000, despesas: 47000 },
  { mes: "Nov", receitas: 87000, despesas: 51000 },
  { mes: "Dez", receitas: 102000, despesas: 49000 },
];

const contasReceber = [
  { id: 1, cliente: "TechCorp Ltda", valor: 4500, vencimento: "15/12/2025", status: "pendente" },
  { id: 2, cliente: "Inovação Digital", valor: 2800, vencimento: "18/12/2025", status: "pendente" },
  { id: 3, cliente: "Distribuidora Sul", valor: 8500, vencimento: "05/12/2025", status: "vencido" },
];

const contasPagar = [
  { id: 1, fornecedor: "Tech Supplies LTDA", valor: 12000, vencimento: "20/12/2025", status: "pendente" },
  { id: 2, fornecedor: "Distribuidora Nacional", valor: 8500, vencimento: "22/12/2025", status: "pendente" },
];

const statusColors = {
  pago: "success",
  pendente: "warning",
  vencido: "destructive",
} as const;

export default function Financeiro() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">
          Controle suas receitas, despesas e fluxo de caixa
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Receitas do Mês</p>
              <p className="text-3xl font-bold text-success">R$ 102k</p>
              <p className="text-sm flex items-center gap-1 text-success">
                <ArrowUpRight className="h-4 w-4" />
                +12.5%
              </p>
            </div>
            <div className="rounded-lg bg-success/10 p-3 text-success">
              <TrendingUp className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="glass-strong p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">Despesas do Mês</p>
              <p className="text-3xl font-bold text-destructive">R$ 49k</p>
              <p className="text-sm flex items-center gap-1 text-destructive">
                <ArrowDownRight className="h-4 w-4" />
                +3.2%
              </p>
            </div>
            <div className="rounded-lg bg-destructive/10 p-3 text-destructive">
              <TrendingDown className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="glass-strong p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">A Receber</p>
              <p className="text-3xl font-bold text-warning">R$ 35k</p>
              <p className="text-sm text-muted-foreground">18 pendentes</p>
            </div>
            <div className="rounded-lg bg-warning/10 p-3 text-warning">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Card>

        <Card className="glass-strong p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <p className="text-sm font-medium text-muted-foreground">A Pagar</p>
              <p className="text-3xl font-bold text-primary">R$ 21k</p>
              <p className="text-sm text-muted-foreground">8 pendentes</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3 text-primary">
              <DollarSign className="h-6 w-6" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="glass-strong p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Fluxo de Caixa</h3>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              Exportar
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={fluxoCaixaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: "8px",
                }}
              />
              <Bar dataKey="receitas" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" fill="hsl(var(--destructive))" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="glass-strong p-6">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-lg font-semibold">Resultado Acumulado</h3>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" />
              DRE
            </Button>
          </div>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={fluxoCaixaData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="mes" stroke="hsl(var(--muted-foreground))" fontSize={12} />
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
                dataKey="receitas"
                stroke="hsl(var(--success))"
                strokeWidth={2}
                dot={{ fill: "hsl(var(--success))" }}
              />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      <Tabs defaultValue="receber" className="space-y-4">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
          <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
        </TabsList>

        <TabsContent value="receber">
          <Card className="glass-strong p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasReceber.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.cliente}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold text-success">
                        <DollarSign className="h-4 w-4" />
                        R$ {conta.valor.toLocaleString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {conta.vencimento}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[conta.status as keyof typeof statusColors]}>
                        {conta.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Registrar Pagamento
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>

        <TabsContent value="pagar">
          <Card className="glass-strong p-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Fornecedor</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contasPagar.map((conta) => (
                  <TableRow key={conta.id}>
                    <TableCell className="font-medium">{conta.fornecedor}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1 font-semibold text-destructive">
                        <DollarSign className="h-4 w-4" />
                        R$ {conta.valor.toLocaleString('pt-BR')}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" />
                        {conta.vencimento}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[conta.status as keyof typeof statusColors]}>
                        {conta.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm">
                        Efetuar Pagamento
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
