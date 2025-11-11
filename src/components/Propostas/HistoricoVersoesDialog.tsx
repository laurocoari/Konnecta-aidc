import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";
import { FileText, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface HistoricoVersoesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  codigo: string;
}

const statusColors = {
  rascunho: "secondary",
  enviada: "default",
  aprovada: "success",
  recusada: "destructive",
  substituida: "warning",
} as const;

const statusLabels = {
  rascunho: "Rascunho",
  enviada: "Enviada",
  aprovada: "Aprovada",
  recusada: "Recusada",
  substituida: "Substituída",
};

export default function HistoricoVersoesDialog({
  open,
  onOpenChange,
  codigo,
}: HistoricoVersoesDialogProps) {
  const [versoes, setVersoes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (open && codigo) {
      loadVersoes();
    }
  }, [open, codigo]);

  const loadVersoes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("proposals")
      .select(`
        *,
        cliente:clients(nome)
      `)
      .eq("codigo", codigo)
      .order("versao", { ascending: false });

    if (!error && data) {
      setVersoes(data);
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Histórico de Versões - {codigo}</DialogTitle>
        </DialogHeader>

        <ScrollArea className="h-[60vh]">
          {loading ? (
            <p className="text-center text-muted-foreground py-8">Carregando...</p>
          ) : versoes.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma versão encontrada
            </p>
          ) : (
            <div className="space-y-4">
              {versoes.map((versao) => (
                <div
                  key={versao.id}
                  className="border rounded-lg p-4 space-y-3 hover:bg-accent/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary/10">
                        <FileText className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-lg">
                            Versão {versao.versao}
                          </h4>
                          <Badge
                            variant={
                              statusColors[versao.status as keyof typeof statusColors]
                            }
                          >
                            {statusLabels[versao.status as keyof typeof statusLabels]}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(versao.created_at), "dd/MM/yyyy 'às' HH:mm", {
                            locale: ptBR,
                          })}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="font-bold text-lg text-primary">
                        R$ {versao.total_geral.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Validade: {format(new Date(versao.validade), "dd/MM/yyyy")}
                      </p>
                    </div>
                  </div>

                  {versao.motivo_revisao && (
                    <div className="bg-muted/50 rounded p-3">
                      <p className="text-xs font-semibold text-muted-foreground mb-1">
                        Motivo da Revisão:
                      </p>
                      <p className="text-sm">{versao.motivo_revisao}</p>
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t">
                    <div className="text-xs text-muted-foreground">
                      Cliente: {versao.cliente?.nome}
                    </div>
                    {versao.pdf_url && (
                      <Button variant="outline" size="sm" className="gap-2">
                        <Download className="h-4 w-4" />
                        Baixar PDF
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
