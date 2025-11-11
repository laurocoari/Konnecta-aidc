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
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileText, DollarSign, Calendar, Check, X, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const statusColors = {
  em_analise: "warning",
  aprovada: "success",
  em_negociacao: "default",
  convertida: "success",
  perdida: "destructive",
  devolvida: "warning",
} as const;

export default function GerenciarOportunidades() {
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [selectedOpp, setSelectedOpp] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  useEffect(() => {
    loadOpportunities();
  }, []);

  const loadOpportunities = async () => {
    const { data, error } = await supabase
      .from("opportunities")
      .select(`
        *,
        client_id (
          nome,
          cnpj,
          contato_principal,
          email,
          telefone
        ),
        partner_id (
          nome_fantasia,
          email,
          telefone
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading opportunities:", error);
      toast.error("Erro ao carregar oportunidades");
    } else {
      setOpportunities(data || []);
    }
  };

  const handleStatusChange = async (oppId: string, newStatus: string, feedback?: string) => {
    setLoading(true);

    const updateData: any = {
      status: newStatus,
    };

    if (feedback) {
      updateData.feedback_comercial = feedback;
    }

    if (newStatus === "aprovada" || newStatus === "em_negociacao") {
      updateData.approved_by = (await supabase.auth.getUser()).data.user?.id;
      updateData.approved_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from("opportunities")
      .update(updateData)
      .eq("id", oppId);

    if (error) {
      toast.error("Erro ao atualizar oportunidade");
    } else {
      toast.success("Oportunidade atualizada com sucesso!");
      loadOpportunities();
      setFeedbackOpen(false);
      setSelectedOpp(null);
    }

    setLoading(false);
  };

  const handleFeedbackSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const feedback = formData.get("feedback") as string;
    const status = formData.get("status") as string;
    
    if (selectedOpp) {
      handleStatusChange(selectedOpp.id, status, feedback);
    }
  };

  const stats = {
    total: opportunities.length,
    em_analise: opportunities.filter(o => o.status === "em_analise").length,
    aprovadas: opportunities.filter(o => o.status === "aprovada").length,
    em_negociacao: opportunities.filter(o => o.status === "em_negociacao").length,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciar Oportunidades</h1>
        <p className="text-muted-foreground">
          Aprove, reprove ou solicite ajustes nas oportunidades dos parceiros
        </p>
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
          <p className="text-sm text-muted-foreground">Em Negociação</p>
          <p className="mt-1 text-3xl font-bold text-primary">{stats.em_negociacao}</p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <h3 className="mb-4 text-lg font-semibold">Oportunidades Recentes</h3>
        <div className="space-y-4">
          {opportunities.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma oportunidade cadastrada
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
                            Revendedor: {opp.partner_id?.nome_fantasia}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {opp.product_name} - {opp.tipo_oportunidade}
                          </p>
                        </div>
                        <Badge variant={statusColors[opp.status as keyof typeof statusColors]}>
                          {opp.status.replace("_", " ")}
                        </Badge>
                      </div>

                      <div className="grid grid-cols-4 gap-4">
                        {opp.valor_estimado && (
                          <div>
                            <p className="text-xs text-muted-foreground">Valor Estimado</p>
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

                        <div>
                          <p className="text-xs text-muted-foreground">Contato</p>
                          <div className="mt-1 text-sm">
                            {opp.client_id?.contato_principal}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs text-muted-foreground">Telefone</p>
                          <div className="mt-1 text-sm">
                            {opp.client_id?.telefone}
                          </div>
                        </div>
                      </div>

                      {opp.observacoes && (
                        <div className="rounded-lg bg-muted/50 p-3">
                          <p className="text-sm font-medium">Observações:</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {opp.observacoes}
                          </p>
                        </div>
                      )}

                      {opp.feedback_comercial && (
                        <div className="rounded-lg bg-primary/10 p-3">
                          <p className="text-sm font-medium">Feedback Comercial:</p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {opp.feedback_comercial}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    {opp.status === "em_analise" && (
                      <>
                        <Button
                          size="sm"
                          variant="default"
                          className="gap-2"
                          onClick={() => handleStatusChange(opp.id, "aprovada")}
                        >
                          <Check className="h-4 w-4" />
                          Aprovar
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-2"
                          onClick={() => {
                            setSelectedOpp(opp);
                            setFeedbackOpen(true);
                          }}
                        >
                          <MessageSquare className="h-4 w-4" />
                          Feedback
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          className="gap-2"
                          onClick={() => handleStatusChange(opp.id, "perdida")}
                        >
                          <X className="h-4 w-4" />
                          Reprovar
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      </Card>

      <Dialog open={feedbackOpen} onOpenChange={setFeedbackOpen}>
        <DialogContent>
          <form onSubmit={handleFeedbackSubmit}>
            <DialogHeader>
              <DialogTitle>Enviar Feedback</DialogTitle>
              <DialogDescription>
                Envie um feedback sobre a oportunidade para o revendedor
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Novo Status *</Label>
                <Select name="status" required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="devolvida">Devolver para Ajustes</SelectItem>
                    <SelectItem value="em_negociacao">Em Negociação</SelectItem>
                    <SelectItem value="perdida">Reprovar</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="feedback">Feedback *</Label>
                <Textarea
                  id="feedback"
                  name="feedback"
                  rows={4}
                  placeholder="Escreva seu feedback aqui..."
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFeedbackOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? "Enviando..." : "Enviar Feedback"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
