import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, CheckCircle, XCircle, Clock, Mail, Building2, Phone, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

export default function AprovarParceiros() {
  const { user, userRole } = useAuth();
  const [partners, setPartners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPartner, setSelectedPartner] = useState<any>(null);
  const [showApproveDialog, setShowApproveDialog] = useState(false);
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (userRole === "admin") {
      loadPartners();
    }
  }, [user, userRole]);

  const loadPartners = async () => {
    try {
      setLoading(true);
      logger.db("Carregando parceiros para aprovação");

      // Buscar parceiros (sem join com auth.users pois não é permitido)
      const { data: partnersData, error: partnersError } = await supabase
        .from("partners")
        .select("*")
        .order("created_at", { ascending: false });

      if (partnersError) {
        logger.error("DB", "Erro ao carregar parceiros", partnersError);
        toast.error("Erro ao carregar parceiros");
        return;
      }

      // Buscar profiles separadamente para obter full_name e email
      const userIds = (partnersData || []).map((p: any) => p.user_id).filter(Boolean);
      let profilesMap = new Map();
      let emailsMap = new Map();
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);

        if (profilesData) {
          profilesMap = new Map(profilesData.map((p: any) => [p.id, p.full_name]));
        }

        // Buscar emails dos usuários via RPC ou usar o email da tabela partners
        // Como não podemos acessar auth.users diretamente, usamos o email da tabela partners
      }

      // Combinar dados
      const data = (partnersData || []).map((partner: any) => ({
        ...partner,
        user: {
          id: partner.user_id,
          email: partner.email, // Usar email da tabela partners
        },
        profile: {
          full_name: profilesMap.get(partner.user_id) || null,
        },
      }));

      logger.db(`✅ ${data?.length || 0} parceiros carregados`);
      setPartners(data);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar parceiros", error);
      toast.error("Erro ao carregar parceiros");
    } finally {
      setLoading(false);
    }
  };

  const filteredPartners = partners.filter((partner) => {
    const search = searchTerm.toLowerCase();
    return (
      partner.nome_fantasia?.toLowerCase().includes(search) ||
      partner.razao_social?.toLowerCase().includes(search) ||
      partner.cnpj?.includes(search) ||
      partner.email?.toLowerCase().includes(search) ||
      (partner.user?.email && partner.user.email.toLowerCase().includes(search))
    );
  });

  const handleApprove = async () => {
    if (!selectedPartner || !user) return;

    setProcessing(true);

    try {
      logger.db(`Aprovando parceiro: ${selectedPartner.id}`);

      // Atualizar status de aprovação
      const { error: updateError } = await supabase
        .from("partners")
        .update({
          approval_status: "aprovado",
          status: "ativo",
          approved_by: user.id,
          approved_at: new Date().toISOString(),
        })
        .eq("id", selectedPartner.id);

      if (updateError) {
        logger.error("DB", "Erro ao aprovar parceiro", updateError);
        throw updateError;
      }

      logger.db("✅ Parceiro aprovado com sucesso");

      // Enviar email de boas-vindas
      try {
        const partnerEmail = selectedPartner.user?.email || selectedPartner.email;
        const partnerName = selectedPartner.profile?.full_name || selectedPartner.user?.email?.split("@")[0] || "Parceiro";
        
        const { error: emailError } = await supabase.functions.invoke("send-welcome-email", {
          body: {
            type: "partner_welcome",
            email: partnerEmail,
            partnerName: partnerName,
            empresa: selectedPartner.nome_fantasia,
          },
        });

        if (emailError) {
          logger.warn("EMAIL", "Erro ao enviar email de boas-vindas", emailError);
          // Não falha a aprovação se o email falhar
        } else {
          logger.info("EMAIL", `Email de boas-vindas enviado para: ${partnerEmail}`);
        }
      } catch (emailErr) {
        logger.warn("EMAIL", "Erro ao enviar email", emailErr);
      }

      toast.success("Parceiro aprovado com sucesso!");
      setShowApproveDialog(false);
      setSelectedPartner(null);
      loadPartners();
    } catch (error: any) {
      logger.error("DB", "Erro ao aprovar parceiro", error);
      toast.error(error.message || "Erro ao aprovar parceiro");
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPartner || !user || !rejectionReason.trim()) {
      toast.error("Informe o motivo da rejeição");
      return;
    }

    setProcessing(true);

    try {
      logger.db(`Rejeitando parceiro: ${selectedPartner.id}`);

      // Atualizar status de rejeição
      const { error: updateError } = await supabase
        .from("partners")
        .update({
          approval_status: "rejeitado",
          status: "inativo",
          rejection_reason: rejectionReason,
        })
        .eq("id", selectedPartner.id);

      if (updateError) {
        logger.error("DB", "Erro ao rejeitar parceiro", updateError);
        throw updateError;
      }

      logger.db("✅ Parceiro rejeitado");

      // Enviar email de rejeição
      try {
        const partnerEmail = selectedPartner.user?.email || selectedPartner.email;
        const partnerName = selectedPartner.profile?.full_name || selectedPartner.user?.email?.split("@")[0] || "Parceiro";
        
        const { error: emailError } = await supabase.functions.invoke("send-welcome-email", {
          body: {
            type: "partner_rejection",
            email: partnerEmail,
            partnerName: partnerName,
            empresa: selectedPartner.nome_fantasia,
            motivo: rejectionReason,
          },
        });

        if (emailError) {
          logger.warn("EMAIL", "Erro ao enviar email de rejeição", emailError);
        } else {
          logger.info("EMAIL", `Email de rejeição enviado para: ${partnerEmail}`);
        }
      } catch (emailErr) {
        logger.warn("EMAIL", "Erro ao enviar email", emailErr);
      }

      toast.success("Parceiro rejeitado");
      setShowRejectDialog(false);
      setSelectedPartner(null);
      setRejectionReason("");
      loadPartners();
    } catch (error: any) {
      logger.error("DB", "Erro ao rejeitar parceiro", error);
      toast.error(error.message || "Erro ao rejeitar parceiro");
    } finally {
      setProcessing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "aprovado":
        return <Badge variant="success">Aprovado</Badge>;
      case "rejeitado":
        return <Badge variant="destructive">Rejeitado</Badge>;
      case "pendente":
        return <Badge variant="warning">Pendente</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (userRole !== "admin") {
    return (
      <div className="space-y-6">
        <Card className="glass-strong p-6">
          <p className="text-center text-muted-foreground">
            Você não tem permissão para acessar esta página.
          </p>
        </Card>
      </div>
    );
  }

  const pendingPartners = filteredPartners.filter((p) => p.approval_status === "pendente");
  const approvedPartners = filteredPartners.filter((p) => p.approval_status === "aprovado");
  const rejectedPartners = filteredPartners.filter((p) => p.approval_status === "rejeitado");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Aprovação de Parceiros</h1>
          <p className="text-muted-foreground">
            Gerencie os cadastros de parceiros e revendedores
          </p>
        </div>
      </div>

      {/* Estatísticas */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="glass-strong p-4">
          <div className="flex items-center gap-3">
            <Clock className="h-8 w-8 text-warning" />
            <div>
              <p className="text-sm text-muted-foreground">Aguardando Aprovação</p>
              <p className="text-2xl font-bold">{pendingPartners.length}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-8 w-8 text-success" />
            <div>
              <p className="text-sm text-muted-foreground">Aprovados</p>
              <p className="text-2xl font-bold">{approvedPartners.length}</p>
            </div>
          </div>
        </Card>
        <Card className="glass-strong p-4">
          <div className="flex items-center gap-3">
            <XCircle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-sm text-muted-foreground">Rejeitados</p>
              <p className="text-2xl font-bold">{rejectedPartners.length}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Busca */}
      <Card className="glass-strong p-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, CNPJ ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </Card>

      {/* Tabela */}
      <Card className="glass-strong p-6">
        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando parceiros...
          </div>
        ) : filteredPartners.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum parceiro encontrado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Empresa</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Localização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data Cadastro</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPartners.map((partner) => (
                <TableRow key={partner.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{partner.nome_fantasia}</p>
                      <p className="text-sm text-muted-foreground">
                        {partner.razao_social}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{partner.cnpj}</TableCell>
                  <TableCell>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="h-3 w-3" />
                        {partner.user?.email || partner.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="h-3 w-3" />
                        {partner.telefone}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2 text-sm">
                      <MapPin className="h-3 w-3" />
                      {partner.cidade} - {partner.estado}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(partner.approval_status)}</TableCell>
                  <TableCell>
                    {new Date(partner.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-right">
                    {partner.approval_status === "pendente" && (
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setShowRejectDialog(true);
                          }}
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Rejeitar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => {
                            setSelectedPartner(partner);
                            setShowApproveDialog(true);
                          }}
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Aprovar
                        </Button>
                      </div>
                    )}
                    {partner.approval_status === "rejeitado" && partner.rejection_reason && (
                      <div className="text-xs text-muted-foreground">
                        Motivo: {partner.rejection_reason}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Dialog de Aprovação */}
      <Dialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprovar Parceiro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja aprovar este parceiro? Um email de boas-vindas será enviado.
            </DialogDescription>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-2 py-4">
              <p>
                <strong>Empresa:</strong> {selectedPartner.nome_fantasia}
              </p>
              <p>
                <strong>CNPJ:</strong> {selectedPartner.cnpj}
              </p>
              <p>
                <strong>Email:</strong> {selectedPartner.user?.email || selectedPartner.email}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowApproveDialog(false);
                setSelectedPartner(null);
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button onClick={handleApprove} disabled={processing}>
              {processing ? "Aprovando..." : "Confirmar Aprovação"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog de Rejeição */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar Parceiro</DialogTitle>
            <DialogDescription>
              Informe o motivo da rejeição. Um email será enviado ao parceiro.
            </DialogDescription>
          </DialogHeader>
          {selectedPartner && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <p>
                  <strong>Empresa:</strong> {selectedPartner.nome_fantasia}
                </p>
                <p>
                  <strong>CNPJ:</strong> {selectedPartner.cnpj}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="rejection-reason">Motivo da Rejeição *</Label>
                <Textarea
                  id="rejection-reason"
                  placeholder="Ex: Documentação incompleta, CNPJ inválido, etc."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  rows={3}
                  required
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowRejectDialog(false);
                setSelectedPartner(null);
                setRejectionReason("");
              }}
              disabled={processing}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={processing || !rejectionReason.trim()}
            >
              {processing ? "Rejeitando..." : "Confirmar Rejeição"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

