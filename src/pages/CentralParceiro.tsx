import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, TrendingUp, FileText, Users, DollarSign, AlertCircle, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const statusColors = {
  em_analise: "warning",
  aprovada: "success",
  em_negociacao: "default",
  convertida: "success",
  perdida: "destructive",
  devolvida: "warning",
} as const;

export default function CentralParceiro() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [checkingCNPJ, setCheckingCNPJ] = useState(false);
  const [exclusivityWarning, setExclusivityWarning] = useState<any>(null);
  const [partner, setPartner] = useState<any>(null);
  const [opportunities, setOpportunities] = useState<any[]>([]);

  useEffect(() => {
    if (user) {
      loadPartnerData();
      loadOpportunities();
    }
  }, [user]);

  const loadPartnerData = async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("user_id", user?.id)
      .single();

    if (error) {
      console.error("Error loading partner:", error);
    } else {
      setPartner(data);
    }
  };

  const loadOpportunities = async () => {
    const { data: partnerData } = await supabase
      .from("partners")
      .select("id")
      .eq("user_id", user?.id)
      .single();

    if (partnerData) {
      const { data, error } = await supabase
        .from("opportunities")
        .select(`
          *,
          client_id (
            nome,
            cnpj
          )
        `)
        .eq("partner_id", partnerData.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading opportunities:", error);
      } else {
        setOpportunities(data || []);
      }
    }
  };

  const checkClientExclusivity = async (cnpj: string) => {
    if (cnpj.length < 14) return;

    setCheckingCNPJ(true);
    const { data, error } = await supabase.rpc("check_client_exclusivity", {
      p_cnpj: cnpj,
    });

    if (error) {
      console.error("Error checking exclusivity:", error);
      toast.error("Erro ao verificar exclusividade do cliente");
    } else if (data && data.length > 0) {
      const result = data[0];
      if (result.is_active) {
        setExclusivityWarning(result);
        toast.warning(`Cliente em exclusividade com ${result.partner_name}`);
      } else {
        setExclusivityWarning(null);
      }
    }
    setCheckingCNPJ(false);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    
    try {
      // Check if client exists
      const cnpj = formData.get("cnpj") as string;
      const { data: existingClient } = await supabase
        .from("clients")
        .select("id")
        .eq("cnpj", cnpj)
        .maybeSingle();

      let clientId = existingClient?.id;

      // If client doesn't exist, create it
      if (!clientId) {
        const { data: newClient, error: clientError } = await supabase
          .from("clients")
          .insert({
            nome: formData.get("nome") as string,
            cnpj,
            ie: formData.get("ie") as string,
            contato_principal: formData.get("contato") as string,
            email: formData.get("email") as string,
            telefone: formData.get("telefone") as string,
            endereco: formData.get("endereco") as string,
            cidade: formData.get("cidade") as string,
            estado: formData.get("estado") as string,
            cep: formData.get("cep") as string,
            tipo: "cliente",
            origin_partner_id: partner.id,
            exclusive_partner_id: partner.id,
            exclusivity_status: "ativa",
            exclusivity_expires_at: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          })
          .select()
          .single();

        if (clientError) throw clientError;
        clientId = newClient.id;
      }

      // Create opportunity
      const { error: oppError } = await supabase
        .from("opportunities")
        .insert({
          partner_id: partner.id,
          client_id: clientId,
          product_name: formData.get("product") as string,
          tipo_oportunidade: formData.get("tipo") as string,
          valor_estimado: parseFloat(formData.get("valor") as string) || null,
          observacoes: formData.get("observacoes") as string,
          data_validade_exclusividade: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000).toISOString(),
          status: "em_analise",
        });

      if (oppError) throw oppError;

      toast.success("Oportunidade registrada com sucesso!");
      setOpen(false);
      loadOpportunities();
    } catch (error: any) {
      toast.error(error.message || "Erro ao registrar oportunidade");
    } finally {
      setLoading(false);
    }
  };

  const stats = {
    total: opportunities.length,
    em_analise: opportunities.filter(o => o.status === "em_analise").length,
    aprovadas: opportunities.filter(o => o.status === "aprovada").length,
    convertidas: opportunities.filter(o => o.status === "convertida").length,
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Central do Parceiro</h1>
          <p className="text-muted-foreground">
            Gerencie suas oportunidades e clientes
          </p>
        </div>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Nova Oportunidade
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Registrar Nova Oportunidade</DialogTitle>
                <DialogDescription>
                  Cadastre um novo cliente e oportunidade de negócio
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                {exclusivityWarning && (
                  <div className="rounded-lg border border-warning bg-warning/10 p-4">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="h-5 w-5 text-warning" />
                      <div>
                        <p className="font-semibold">Cliente em Exclusividade</p>
                        <p className="text-sm text-muted-foreground">
                          Este cliente está sendo atendido por{" "}
                          {exclusivityWarning.partner_name} até{" "}
                          {new Date(exclusivityWarning.exclusivity_expires_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome / Razão Social *</Label>
                    <Input id="nome" name="nome" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input
                      id="cnpj"
                      name="cnpj"
                      placeholder="00.000.000/0000-00"
                      required
                      onBlur={(e) => checkClientExclusivity(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="ie">Inscrição Estadual</Label>
                    <Input id="ie" name="ie" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="contato">Contato Principal *</Label>
                    <Input id="contato" name="contato" required />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" name="email" type="email" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input id="telefone" name="telefone" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="endereco">Endereço *</Label>
                  <Input id="endereco" name="endereco" required />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="cidade">Cidade *</Label>
                    <Input id="cidade" name="cidade" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="estado">Estado *</Label>
                    <Input id="estado" name="estado" maxLength={2} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cep">CEP *</Label>
                    <Input id="cep" name="cep" required />
                  </div>
                </div>

                <div className="border-t pt-4 space-y-4">
                  <h3 className="font-semibold">Dados da Oportunidade</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="product">Produto/Serviço *</Label>
                      <Input id="product" name="product" required />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="tipo">Tipo *</Label>
                      <Select name="tipo" required>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="venda">Venda</SelectItem>
                          <SelectItem value="locacao">Locação</SelectItem>
                          <SelectItem value="projeto">Projeto</SelectItem>
                          <SelectItem value="contrato">Contrato</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor Estimado</Label>
                    <Input id="valor" name="valor" type="number" step="0.01" />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="observacoes">Observações</Label>
                    <Textarea
                      id="observacoes"
                      name="observacoes"
                      rows={3}
                      placeholder="Descreva a necessidade do cliente..."
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={loading || exclusivityWarning}>
                  {loading ? "Cadastrando..." : "Cadastrar Oportunidade"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Total de Oportunidades</p>
          <p className="mt-1 text-3xl font-bold">{stats.total}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Em Análise</p>
          <p className="mt-1 text-3xl font-bold text-warning">{stats.em_analise}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Aprovadas</p>
          <p className="mt-1 text-3xl font-bold text-success">{stats.aprovadas}</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Convertidas</p>
          <p className="mt-1 text-3xl font-bold text-primary">{stats.convertidas}</p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <h3 className="mb-4 text-lg font-semibold">Minhas Oportunidades</h3>
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma oportunidade cadastrada ainda
            </p>
          ) : (
            opportunities.map((opp) => (
              <Card key={opp.id} className="glass p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="rounded-lg bg-primary/10 p-3">
                      <FileText className="h-6 w-6 text-primary" />
                    </div>
                    
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">
                            {opp.client_id?.nome || "Cliente"}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {opp.product_name} - {opp.tipo_oportunidade}
                          </p>
                        </div>
                        <Badge variant={statusColors[opp.status as keyof typeof statusColors]}>
                          {opp.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-3 gap-4">
                        {opp.valor_estimado && (
                          <div>
                            <p className="text-xs text-muted-foreground">Valor</p>
                            <div className="mt-1 flex items-center gap-1 font-semibold text-success">
                              <DollarSign className="h-4 w-4" />
                              R$ {opp.valor_estimado.toLocaleString("pt-BR")}
                            </div>
                          </div>
                        )}

                        <div>
                          <p className="text-xs text-muted-foreground">Cadastrado em</p>
                          <div className="mt-1 flex items-center gap-1 text-sm">
                            <Calendar className="h-3 w-3" />
                            {new Date(opp.created_at).toLocaleDateString("pt-BR")}
                          </div>
                        </div>

                        {opp.data_validade_exclusividade && (
                          <div>
                            <p className="text-xs text-muted-foreground">Exclusividade até</p>
                            <div className="mt-1 flex items-center gap-1 text-sm">
                              <Calendar className="h-3 w-3" />
                              {new Date(opp.data_validade_exclusividade).toLocaleDateString("pt-BR")}
                            </div>
                          </div>
                        )}
                      </div>

                      {opp.feedback_comercial && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium">Feedback Comercial:</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {opp.feedback_comercial}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>
    </div>
  );
}
