import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, User, TrendingUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface KanbanBoardProps {
  opportunities: any[];
  onOpportunityClick: (opportunity: any) => void;
  onUpdate: () => void;
}

const stages = [
  { id: "proposta", label: "Proposta", color: "bg-blue-500/20 border-blue-500" },
  { id: "negociacao", label: "Negociação", color: "bg-yellow-500/20 border-yellow-500" },
  { id: "fechamento", label: "Fechamento", color: "bg-green-500/20 border-green-500" },
  { id: "perdida", label: "Perdida", color: "bg-red-500/20 border-red-500" },
];

export function KanbanBoard({
  opportunities,
  onOpportunityClick,
  onUpdate,
}: KanbanBoardProps) {
  const [draggedOpportunity, setDraggedOpportunity] = useState<string | null>(
    null
  );

  const handleDragStart = (e: React.DragEvent, opportunityId: string) => {
    setDraggedOpportunity(opportunityId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  };

  const handleDrop = async (e: React.DragEvent, newEtapa: string) => {
    e.preventDefault();
    if (!draggedOpportunity) return;

    try {
      const { error } = await supabase
        .from("opportunities_crm")
        .update({ etapa: newEtapa })
        .eq("id", draggedOpportunity);

      if (error) throw error;

      toast.success("Oportunidade movida com sucesso!");
      onUpdate();
    } catch (error: any) {
      console.error("Error updating opportunity:", error);
      toast.error("Erro ao mover oportunidade");
    } finally {
      setDraggedOpportunity(null);
    }
  };

  const getOpportunitiesByStage = (etapa: string) => {
    return opportunities.filter((opp) => opp.etapa === etapa && opp.status === "ativa");
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {stages.map((stage) => {
        const stageOpportunities = getOpportunitiesByStage(stage.id);
        return (
          <div key={stage.id} className="space-y-2">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-semibold">{stage.label}</h3>
              <Badge variant="secondary">{stageOpportunities.length}</Badge>
            </div>
            <Card
              className={`${stage.color} p-4 min-h-[400px]`}
              onDragOver={handleDragOver}
              onDrop={(e) => handleDrop(e, stage.id)}
            >
              <div className="space-y-2">
                {stageOpportunities.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8 text-sm">
                    Nenhuma oportunidade
                  </div>
                ) : (
                  stageOpportunities.map((opp) => (
                    <Card
                      key={opp.id}
                      className="p-3 cursor-pointer hover:shadow-md transition-shadow bg-background"
                      draggable
                      onDragStart={(e) => handleDragStart(e, opp.id)}
                      onClick={() => onOpportunityClick(opp)}
                    >
                      <div className="space-y-2">
                        <div className="font-medium text-sm">{opp.nome}</div>
                        {opp.contact && (
                          <div className="text-xs text-muted-foreground flex items-center gap-1">
                            <User className="h-3 w-3" />
                            {opp.contact.nome}
                          </div>
                        )}
                        {opp.valor_estimado && (
                          <div className="flex items-center gap-1 text-sm font-semibold">
                            <DollarSign className="h-3 w-3" />
                            {formatCurrency(opp.valor_estimado)}
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="text-xs">
                            {opp.probabilidade}%
                          </Badge>
                          {opp.created_by_user?.full_name && (
                            <span className="text-xs text-muted-foreground">
                              {opp.created_by_user.full_name}
                            </span>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))
                )}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}

