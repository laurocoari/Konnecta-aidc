import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  CheckCircle2,
  XCircle,
  FileText,
  DollarSign,
  Edit,
  Clock,
  User,
} from "lucide-react";

interface SalesOrderLogsTimelineProps {
  salesOrderId: string;
}

interface Log {
  id: string;
  acao: string;
  descricao: string;
  usuario_id: string;
  usuario?: {
    full_name: string;
  };
  created_at: string;
  dados_anteriores?: any;
  dados_novos?: any;
}

const actionIcons: Record<string, any> = {
  criado: FileText,
  atualizado: Edit,
  cancelado: XCircle,
  faturado: DollarSign,
  status_alterado: Clock,
};

const actionColors: Record<string, string> = {
  criado: "bg-blue-100 text-blue-800",
  atualizado: "bg-yellow-100 text-yellow-800",
  cancelado: "bg-red-100 text-red-800",
  faturado: "bg-green-100 text-green-800",
  status_alterado: "bg-purple-100 text-purple-800",
};

const actionLabels: Record<string, string> = {
  criado: "Criado",
  atualizado: "Atualizado",
  cancelado: "Cancelado",
  faturado: "Faturado",
  status_alterado: "Status Alterado",
};

export function SalesOrderLogsTimeline({
  salesOrderId,
}: SalesOrderLogsTimelineProps) {
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (salesOrderId) {
      loadLogs();
    }
  }, [salesOrderId]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("sales_order_logs")
        .select(`
          *,
          usuario:profiles!sales_order_logs_usuario_id_fkey(id, full_name)
        `)
        .eq("sales_order_id", salesOrderId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error: any) {
      console.error("Error loading logs:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">Carregando logs...</div>
      </Card>
    );
  }

  if (logs.length === 0) {
    return (
      <Card className="p-4">
        <div className="text-sm text-muted-foreground">
          Nenhum log registrado ainda.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4">
      <h3 className="text-lg font-semibold mb-4">Histórico de Ações</h3>
      <div className="space-y-4">
        {logs.map((log, index) => {
          const Icon = actionIcons[log.acao] || FileText;
          const colorClass = actionColors[log.acao] || "bg-gray-100 text-gray-800";
          const label = actionLabels[log.acao] || log.acao;

          return (
            <div key={log.id} className="flex gap-4">
              <div className="flex flex-col items-center">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center ${colorClass}`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                {index < logs.length - 1 && (
                  <div className="w-0.5 h-full bg-border mt-2" />
                )}
              </div>
              <div className="flex-1 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className={colorClass}>
                    {label}
                  </Badge>
                  <span className="text-sm text-muted-foreground">
                    {format(new Date(log.created_at), "dd/MM/yyyy 'às' HH:mm", {
                      locale: ptBR,
                    })}
                  </span>
                </div>
                <div className="text-sm font-medium mb-1">
                  {log.descricao}
                </div>
                {log.usuario && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <User className="h-3 w-3" />
                    {log.usuario.full_name}
                  </div>
                )}
                {log.dados_novos && log.acao === "status_alterado" && (
                  <div className="mt-2 text-xs text-muted-foreground">
                    Novo status:{" "}
                    <span className="font-medium">
                      {log.dados_novos.status || "N/A"}
                    </span>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

