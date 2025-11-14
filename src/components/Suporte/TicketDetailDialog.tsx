import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { MessageSquare, User, Clock } from "lucide-react";

interface TicketDetailDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticket: any;
  onSuccess: () => void;
}

export function TicketDetailDialog({
  open,
  onOpenChange,
  ticket,
  onSuccess,
}: TicketDetailDialogProps) {
  const { user } = useAuth();
  const [comments, setComments] = useState<any[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("aberto");

  useEffect(() => {
    if (open && ticket) {
      setStatus(ticket.status);
      loadComments();
    }
  }, [open, ticket]);

  const loadComments = async () => {
    if (!ticket?.id) return;
    try {
      const { data, error } = await supabase
        .from("ticket_comments")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (error) throw error;

      // Buscar profiles separadamente para os autores
      const autorIds = [...new Set((data || []).map(c => c.autor_id).filter(Boolean))];
      let autoresMap: Record<string, any> = {};
      
      if (autorIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", autorIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            autoresMap[p.id] = p;
          });
        }
      }

      // Adicionar dados do autor aos comentários
      const commentsWithAutor = (data || []).map(comment => ({
        ...comment,
        autor: comment.autor_id ? autoresMap[comment.autor_id] : null,
      }));

      setComments(commentsWithAutor);
    } catch (error: any) {
      console.error("Error loading comments:", error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim() || !ticket?.id) return;

    setLoading(true);
    try {
      const { error } = await supabase.from("ticket_comments").insert([
        {
          ticket_id: ticket.id,
          autor_id: user?.id,
          mensagem: newComment,
        },
      ]);

      if (error) throw error;

      setNewComment("");
      loadComments();
      toast.success("Comentário adicionado!");
    } catch (error: any) {
      console.error("Error adding comment:", error);
      toast.error("Erro ao adicionar comentário");
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: string) => {
    try {
      const updateData: any = { status: newStatus };
      
      if (newStatus === "resolvido") {
        updateData.resolved_at = new Date().toISOString();
      } else if (newStatus === "fechado") {
        updateData.closed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tickets")
        .update(updateData)
        .eq("id", ticket.id);

      if (error) throw error;

      setStatus(newStatus);
      toast.success("Status atualizado!");
      onSuccess();
    } catch (error: any) {
      console.error("Error updating status:", error);
      toast.error("Erro ao atualizar status");
    }
  };

  if (!ticket) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Ticket {ticket.numero_ticket || `#${ticket.id.slice(0, 8)}`}
          </DialogTitle>
          <DialogDescription>{ticket.assunto}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Informações do Ticket */}
          <Card className="p-4">
            <div className="space-y-3">
              <div>
                <Label className="text-xs text-muted-foreground">Contato</Label>
                <div className="font-medium">
                  {ticket.contact?.nome || "N/A"}
                  {ticket.contact?.empresa && (
                    <span className="text-muted-foreground ml-2">
                      - {ticket.contact.empresa}
                    </span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <div>
                    <Select value={status} onValueChange={handleStatusChange}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="aberto">Aberto</SelectItem>
                        <SelectItem value="em_atendimento">
                          Em Atendimento
                        </SelectItem>
                        <SelectItem value="resolvido">Resolvido</SelectItem>
                        <SelectItem value="fechado">Fechado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <Label className="text-xs text-muted-foreground">
                    Prioridade
                  </Label>
                  <div>
                    <Badge variant="outline">{ticket.prioridade}</Badge>
                  </div>
                </div>
              </div>

              <div>
                <Label className="text-xs text-muted-foreground">Descrição</Label>
                <div className="mt-1 text-sm">{ticket.descricao}</div>
              </div>
            </div>
          </Card>

          {/* Comentários */}
          <div className="space-y-2">
            <Label>Comentários</Label>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {comments.length === 0 ? (
                <div className="text-center text-muted-foreground py-4 text-sm">
                  Nenhum comentário ainda
                </div>
              ) : (
                comments.map((comment) => (
                  <Card key={comment.id} className="p-3">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium text-sm">
                          {comment.autor?.full_name || "Usuário"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        {new Date(comment.created_at).toLocaleString("pt-BR")}
                      </div>
                    </div>
                    <div className="text-sm">{comment.mensagem}</div>
                  </Card>
                ))
              )}
            </div>

            <div className="space-y-2">
              <Textarea
                placeholder="Adicione um comentário..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                rows={3}
              />
              <Button
                onClick={handleAddComment}
                disabled={loading || !newComment.trim()}
                size="sm"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Adicionar Comentário
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

