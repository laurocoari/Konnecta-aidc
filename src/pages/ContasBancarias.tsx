import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Building2,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { BankAccountFormDialog } from "@/components/Financeiro/BankAccountFormDialog";

export default function ContasBancarias() {
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAccount, setSelectedAccount] = useState<string>("todos");
  const [filterType, setFilterType] = useState<string>("todos");
  const [accountDialogOpen, setAccountDialogOpen] = useState(false);
  const [selectedBankAccount, setSelectedBankAccount] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("contas");

  useEffect(() => {
    loadBankAccounts();
  }, []);

  useEffect(() => {
    if (activeTab === "extrato" && selectedAccount !== "todos") {
      loadTransactions();
    }
  }, [selectedAccount, filterType, activeTab]);

  const loadBankAccounts = async () => {
    try {
      const { data, error } = await supabase
        .from("bank_accounts")
        .select("*")
        .order("nome_banco");

      if (error) throw error;
      setBankAccounts(data || []);
    } catch (error: any) {
      console.error("Error loading bank accounts:", error);
      toast.error("Erro ao carregar contas bancárias");
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (selectedAccount === "todos") return;

    try {
      setLoading(true);
      let query = supabase
        .from("bank_transactions")
        .select("*")
        .eq("bank_account_id", selectedAccount)
        .order("data_movimento", { ascending: false })
        .limit(100);

      if (filterType !== "todos") {
        query = query.eq("tipo", filterType);
      }

      const { data, error } = await query;

      if (error) throw error;
      setTransactions(data || []);
    } catch (error: any) {
      console.error("Error loading transactions:", error);
      toast.error("Erro ao carregar transações");
    } finally {
      setLoading(false);
    }
  };

  const handleNewAccount = () => {
    setSelectedBankAccount(null);
    setAccountDialogOpen(true);
  };

  const handleEditAccount = (account: any) => {
    setSelectedBankAccount(account);
    setAccountDialogOpen(true);
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const totalSaldo = bankAccounts.reduce(
    (sum, acc) => sum + parseFloat(acc.saldo_atual || 0),
    0
  );

  const selectedAccountData = bankAccounts.find((acc) => acc.id === selectedAccount);
  const totalEntradas = transactions
    .filter((t) => t.tipo === "entrada")
    .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);
  const totalSaidas = transactions
    .filter((t) => t.tipo === "saida")
    .reduce((sum, t) => sum + parseFloat(t.valor || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contas Bancárias</h1>
          <p className="text-muted-foreground">
            Gerencie contas bancárias e visualize extratos
          </p>
        </div>
        <Button onClick={handleNewAccount} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Conta
        </Button>
      </div>

      {/* Card de Saldo Total */}
      <Card className="glass-strong p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">Saldo Total Consolidado</p>
            <p className="text-3xl font-bold">{formatCurrency(totalSaldo)}</p>
          </div>
          <div className="rounded-lg bg-primary/10 p-3">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="contas">Contas Bancárias</TabsTrigger>
          <TabsTrigger value="extrato">Extrato</TabsTrigger>
        </TabsList>

        <TabsContent value="contas" className="space-y-4">
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando contas...
            </div>
          ) : bankAccounts.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <Building2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma conta bancária cadastrada. Clique em "Nova Conta" para
                começar.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {bankAccounts.map((account) => (
                <Card key={account.id} className="glass-strong p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold">{account.nome_banco}</h3>
                      <p className="text-sm text-muted-foreground">
                        Ag: {account.agencia} - Conta: {account.conta}
                      </p>
                      {account.descricao && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {account.descricao}
                        </p>
                      )}
                    </div>
                    <Badge variant={account.status === "ativo" ? "default" : "secondary"}>
                      {account.status}
                    </Badge>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Saldo Atual</span>
                      <span className="text-xl font-bold">
                        {formatCurrency(account.saldo_atual || 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Saldo Inicial</span>
                      <span>{formatCurrency(account.saldo_inicial || 0)}</span>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() => handleEditAccount(account)}
                    >
                      Editar
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="extrato" className="space-y-4">
          {/* Filtros */}
          <Card className="glass-strong p-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Conta Bancária</label>
                <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma conta" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todas as Contas</SelectItem>
                    {bankAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.nome_banco} - {acc.conta}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Tipo</label>
                <Select value={filterType} onValueChange={setFilterType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    <SelectItem value="entrada">Entradas</SelectItem>
                    <SelectItem value="saida">Saídas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </Card>

          {selectedAccount === "todos" ? (
            <Card className="glass-strong p-12 text-center">
              <p className="text-muted-foreground">
                Selecione uma conta bancária para visualizar o extrato
              </p>
            </Card>
          ) : (
            <>
              {/* Resumo do Extrato */}
              {selectedAccountData && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card className="glass-strong p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground">Saldo Atual</p>
                      <p className="text-2xl font-bold">
                        {formatCurrency(selectedAccountData.saldo_atual || 0)}
                      </p>
                    </div>
                  </Card>
                  <Card className="glass-strong p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-success" />
                        Total Entradas
                      </p>
                      <p className="text-2xl font-bold text-success">
                        {formatCurrency(totalEntradas)}
                      </p>
                    </div>
                  </Card>
                  <Card className="glass-strong p-4">
                    <div className="space-y-1">
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <TrendingDown className="h-4 w-4 text-destructive" />
                        Total Saídas
                      </p>
                      <p className="text-2xl font-bold text-destructive">
                        {formatCurrency(totalSaidas)}
                      </p>
                    </div>
                  </Card>
                </div>
              )}

              {/* Tabela de Transações */}
              {loading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Carregando transações...
                </div>
              ) : transactions.length === 0 ? (
                <Card className="glass-strong p-12 text-center">
                  <DollarSign className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Nenhuma transação encontrada para esta conta.
                  </p>
                </Card>
              ) : (
                <Card className="glass-strong">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Descrição</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Referência</TableHead>
                        <TableHead className="text-right">Valor</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {transactions.map((t) => (
                        <TableRow key={t.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-muted-foreground" />
                              {new Date(t.data_movimento).toLocaleDateString("pt-BR")}
                            </div>
                          </TableCell>
                          <TableCell>{t.descricao || "-"}</TableCell>
                          <TableCell>
                            <Badge
                              variant={t.tipo === "entrada" ? "default" : "destructive"}
                            >
                              {t.tipo === "entrada" ? "Entrada" : "Saída"}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {t.referencia_tipo && (
                              <Badge variant="outline">{t.referencia_tipo}</Badge>
                            )}
                          </TableCell>
                          <TableCell
                            className={`text-right font-semibold ${
                              t.tipo === "entrada" ? "text-success" : "text-destructive"
                            }`}
                          >
                            {t.tipo === "entrada" ? "+" : "-"}
                            {formatCurrency(t.valor)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      <BankAccountFormDialog
        open={accountDialogOpen}
        onOpenChange={setAccountDialogOpen}
        bankAccount={selectedBankAccount}
        onSuccess={() => {
          loadBankAccounts();
          setSelectedBankAccount(null);
        }}
      />
    </div>
  );
}
