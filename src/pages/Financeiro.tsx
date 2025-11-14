import { useState, useEffect } from "react";
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
  ArrowDownCircle,
  ArrowUpCircle,
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { RentalReceiptFormDialog } from "@/components/Financeiro/RentalReceiptFormDialog";
import { RentalReceiptPreviewDialog } from "@/components/Financeiro/RentalReceiptPreviewDialog";
import { FileText } from "lucide-react";

export default function Financeiro() {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState({
    receitasMes: 0,
    despesasMes: 0,
    aReceber: 0,
    aPagar: 0,
    receitasMesAnterior: 0,
    despesasMesAnterior: 0,
  });
  const [fluxoCaixaData, setFluxoCaixaData] = useState<any[]>([]);
  const [contasReceber, setContasReceber] = useState<any[]>([]);
  const [contasPagar, setContasPagar] = useState<any[]>([]);
  const [rentalReceipts, setRentalReceipts] = useState<any[]>([]);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [previewReceiptId, setPreviewReceiptId] = useState<string>("");
  const [previewReceiptNumber, setPreviewReceiptNumber] = useState<string>("");
  const [previewOpen, setPreviewOpen] = useState(false);

  useEffect(() => {
    loadFinancialData();
  }, []);

  const loadFinancialData = async () => {
    try {
      setLoading(true);
      const hoje = new Date();
      const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
      const inicioMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
      const fimMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

      // Carregar resumo financeiro
      const [arData, apData, transactionsData] = await Promise.all([
        // Contas a Receber
        supabase
          .from("accounts_receivable")
          .select("valor_total, valor_pago, status, data_vencimento"),
        // Contas a Pagar
        supabase
          .from("accounts_payable")
          .select("valor_total, valor_pago, status, data_vencimento"),
        // Transações bancárias do mês
        supabase
          .from("bank_transactions")
          .select("tipo, valor, data_movimento")
          .gte("data_movimento", inicioMes.toISOString()),
      ]);

      if (arData.error) throw arData.error;
      if (apData.error) throw apData.error;
      if (transactionsData.error) throw transactionsData.error;

      // Calcular receitas do mês (entradas)
      const receitasMes = (transactionsData.data || [])
        .filter((t) => t.tipo === "entrada")
        .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

      // Calcular despesas do mês (saídas)
      const despesasMes = (transactionsData.data || [])
        .filter((t) => t.tipo === "saida")
        .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

      // Calcular receitas do mês anterior
      const transactionsMesAnterior = await supabase
        .from("bank_transactions")
        .select("tipo, valor")
        .gte("data_movimento", inicioMesAnterior.toISOString())
        .lte("data_movimento", fimMesAnterior.toISOString());

      const receitasMesAnterior = (transactionsMesAnterior.data || [])
        .filter((t) => t.tipo === "entrada")
        .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

      const despesasMesAnterior = (transactionsMesAnterior.data || [])
        .filter((t) => t.tipo === "saida")
        .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

      // Calcular valores a receber e a pagar
      const aReceber = (arData.data || [])
        .filter((ar) => ar.status !== "pago" && ar.status !== "cancelado")
        .reduce((sum, ar) => {
          const saldo = parseFloat(ar.valor_total || 0) - parseFloat(ar.valor_pago || 0);
          return sum + saldo;
        }, 0);

      const aPagar = (apData.data || [])
        .filter((ap) => ap.status !== "pago" && ap.status !== "cancelado")
        .reduce((sum, ap) => {
          const saldo = parseFloat(ap.valor_total || 0) - parseFloat(ap.valor_pago || 0);
          return sum + saldo;
        }, 0);

      setSummary({
        receitasMes,
        despesasMes,
        aReceber,
        aPagar,
        receitasMesAnterior,
        despesasMesAnterior,
      });

      // Carregar últimas contas a receber e pagar
      const [arRecent, apRecent] = await Promise.all([
        supabase
          .from("accounts_receivable")
          .select(`
            *,
            contact:contacts(id, nome, empresa)
          `)
          .order("data_vencimento", { ascending: true })
          .limit(5),
        supabase
          .from("accounts_payable")
          .select("*")
          .order("data_vencimento", { ascending: true })
          .limit(5),
      ]);

      if (arRecent.data) setContasReceber(arRecent.data);
      if (apRecent.data) setContasPagar(apRecent.data);

      // Carregar dados de fluxo de caixa (últimos 6 meses)
      await loadFluxoCaixa();
      
      // Carregar recibos de locação
      await loadRentalReceipts();
    } catch (error: any) {
      console.error("Error loading financial data:", error);
      toast.error("Erro ao carregar dados financeiros");
    } finally {
      setLoading(false);
    }
  };

  const loadFluxoCaixa = async () => {
    try {
      const meses: any[] = [];
      const hoje = new Date();

      for (let i = 5; i >= 0; i--) {
        const mes = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        const inicioMes = new Date(mes.getFullYear(), mes.getMonth(), 1);
        const fimMes = new Date(mes.getFullYear(), mes.getMonth() + 1, 0);

        const { data: transactions } = await supabase
          .from("bank_transactions")
          .select("tipo, valor")
          .gte("data_movimento", inicioMes.toISOString())
          .lte("data_movimento", fimMes.toISOString());

        const receitas = (transactions || [])
          .filter((t) => t.tipo === "entrada")
          .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

        const despesas = (transactions || [])
          .filter((t) => t.tipo === "saida")
          .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

        meses.push({
          mes: mes.toLocaleDateString("pt-BR", { month: "short" }),
          receitas,
          despesas,
        });
      }

      setFluxoCaixaData(meses);
    } catch (error: any) {
      console.error("Error loading cash flow:", error);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value || 0);
  };

  const loadRentalReceipts = async () => {
    try {
      const { data, error } = await supabase
        .from("rental_receipts")
        .select(`
          *,
          cliente:clients(nome, cnpj)
        `)
        .order("data_emissao", { ascending: false })
        .limit(10);

      if (error) throw error;
      setRentalReceipts(data || []);
    } catch (error: any) {
      console.error("Error loading rental receipts:", error);
    }
  };

  const handleViewReceipt = (receiptId: string, numeroRecibo: string) => {
    setPreviewReceiptId(receiptId);
    setPreviewReceiptNumber(numeroRecibo);
    setPreviewOpen(true);
  };

  const getVariation = (atual: number, anterior: number) => {
    if (anterior === 0) return atual > 0 ? 100 : 0;
    return ((atual - anterior) / anterior) * 100;
  };

  const receitasVariation = getVariation(
    summary.receitasMes,
    summary.receitasMesAnterior
  );
  const despesasVariation = getVariation(
    summary.despesasMes,
    summary.despesasMesAnterior
  );

  const statusColors = {
    pago: "default",
    pendente: "default",
    parcialmente_pago: "outline",
    atrasado: "destructive",
    cancelado: "secondary",
  } as const;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-muted-foreground">
          Visão geral das receitas, despesas e fluxo de caixa
        </p>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando dados financeiros...
        </div>
      ) : (
        <>
          <div className="grid gap-6 md:grid-cols-4">
            <Card className="glass-strong p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    Receitas do Mês
                  </p>
                  <p className="text-3xl font-bold text-success">
                    {formatCurrency(summary.receitasMes)}
                  </p>
                  <p
                    className={`text-sm flex items-center gap-1 ${
                      receitasVariation >= 0 ? "text-success" : "text-destructive"
                    }`}
                  >
                    {receitasVariation >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {Math.abs(receitasVariation).toFixed(1)}%
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
                  <p className="text-sm font-medium text-muted-foreground">
                    Despesas do Mês
                  </p>
                  <p className="text-3xl font-bold text-destructive">
                    {formatCurrency(summary.despesasMes)}
                  </p>
                  <p
                    className={`text-sm flex items-center gap-1 ${
                      despesasVariation >= 0 ? "text-destructive" : "text-success"
                    }`}
                  >
                    {despesasVariation >= 0 ? (
                      <ArrowUpRight className="h-4 w-4" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4" />
                    )}
                    {Math.abs(despesasVariation).toFixed(1)}%
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
                  <p className="text-sm font-medium text-muted-foreground">
                    A Receber
                  </p>
                  <p className="text-3xl font-bold text-warning">
                    {formatCurrency(summary.aReceber)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contasReceber.filter((ar) => ar.status !== "pago" && ar.status !== "cancelado").length} pendentes
                  </p>
                </div>
                <div className="rounded-lg bg-warning/10 p-3 text-warning">
                  <ArrowDownCircle className="h-6 w-6" />
                </div>
              </div>
            </Card>

            <Card className="glass-strong p-6">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">
                    A Pagar
                  </p>
                  <p className="text-3xl font-bold text-primary">
                    {formatCurrency(summary.aPagar)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {contasPagar.filter((ap) => ap.status !== "pago" && ap.status !== "cancelado").length} pendentes
                  </p>
                </div>
                <div className="rounded-lg bg-primary/10 p-3 text-primary">
                  <ArrowUpCircle className="h-6 w-6" />
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
            <TabsList className="grid w-full max-w-lg grid-cols-3">
              <TabsTrigger value="receber">Contas a Receber</TabsTrigger>
              <TabsTrigger value="pagar">Contas a Pagar</TabsTrigger>
              <TabsTrigger value="recibos">Recibos de Locação</TabsTrigger>
            </TabsList>

            <TabsContent value="receber">
              <Card className="glass-strong p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Últimas Contas a Receber</h3>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/contas-receber">Ver Todas</Link>
                  </Button>
                </div>
                {contasReceber.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma conta a receber encontrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasReceber.slice(0, 5).map((conta) => {
                        const saldo = parseFloat(conta.valor_total || 0) - parseFloat(conta.valor_pago || 0);
                        return (
                          <TableRow key={conta.id}>
                            <TableCell className="font-medium">
                              {conta.contact?.nome || conta.contact?.empresa || "N/A"}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 font-semibold text-success">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(saldo)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {new Date(conta.data_vencimento).toLocaleDateString("pt-BR")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  statusColors[conta.status as keyof typeof statusColors] || "default"
                                }
                              >
                                {conta.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="pagar">
              <Card className="glass-strong p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Últimas Contas a Pagar</h3>
                  <Button asChild variant="outline" size="sm">
                    <Link to="/contas-pagar">Ver Todas</Link>
                  </Button>
                </div>
                {contasPagar.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhuma conta a pagar encontrada
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Beneficiário</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Vencimento</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {contasPagar.slice(0, 5).map((conta) => {
                        const saldo = parseFloat(conta.valor_total || 0) - parseFloat(conta.valor_pago || 0);
                        return (
                          <TableRow key={conta.id}>
                            <TableCell className="font-medium">
                              {conta.beneficiario_tipo}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1 font-semibold text-destructive">
                                <DollarSign className="h-4 w-4" />
                                {formatCurrency(saldo)}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-3 w-3" />
                                {new Date(conta.data_vencimento).toLocaleDateString("pt-BR")}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  statusColors[conta.status as keyof typeof statusColors] || "default"
                                }
                              >
                                {conta.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>

            <TabsContent value="recibos">
              <Card className="glass-strong p-6">
                <div className="mb-4 flex items-center justify-between">
                  <h3 className="text-lg font-semibold">Recibos de Locação</h3>
                  <Button
                    onClick={() => setReceiptDialogOpen(true)}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <FileText className="h-4 w-4" />
                    Gerar Recibo
                  </Button>
                </div>
                {rentalReceipts.length === 0 ? (
                  <p className="text-center py-8 text-muted-foreground">
                    Nenhum recibo de locação encontrado
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data Emissão</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {rentalReceipts.map((receipt) => (
                        <TableRow key={receipt.id}>
                          <TableCell className="font-medium">
                            {receipt.numero_recibo}
                          </TableCell>
                          <TableCell>
                            {receipt.cliente?.nome || "N/A"}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3" />
                              {new Date(receipt.data_emissao).toLocaleDateString("pt-BR")}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1 font-semibold text-success">
                              <DollarSign className="h-4 w-4" />
                              {formatCurrency(parseFloat(receipt.total_geral || 0))}
                            </div>
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                handleViewReceipt(receipt.id, receipt.numero_recibo)
                              }
                            >
                              Visualizar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}

      <RentalReceiptFormDialog
        open={receiptDialogOpen}
        onOpenChange={setReceiptDialogOpen}
        onSuccess={() => {
          loadRentalReceipts();
          setReceiptDialogOpen(false);
        }}
      />

      {previewReceiptId && (
        <RentalReceiptPreviewDialog
          open={previewOpen}
          onOpenChange={setPreviewOpen}
          receiptId={previewReceiptId}
          numeroRecibo={previewReceiptNumber}
        />
      )}
    </div>
  );
}
