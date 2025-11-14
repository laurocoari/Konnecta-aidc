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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";
import { format } from "date-fns";

interface SalesOrderInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  salesOrder: any;
  onSuccess: () => void;
}

export function SalesOrderInvoiceDialog({
  open,
  onOpenChange,
  salesOrder,
  onSuccess,
}: SalesOrderInvoiceDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataVencimento, setDataVencimento] = useState("");

  useEffect(() => {
    if (open && salesOrder) {
      // Definir vencimento padrão para 30 dias
      const vencimento = new Date();
      vencimento.setDate(vencimento.getDate() + 30);
      setDataVencimento(vencimento.toISOString().split("T")[0]);
    }
  }, [open, salesOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!dataVencimento) {
      toast.error("Informe a data de vencimento");
      return;
    }

    if (!salesOrder) {
      toast.error("Pedido não encontrado");
      return;
    }

    if (salesOrder.status === "cancelado") {
      toast.error("Não é possível faturar um pedido cancelado");
      return;
    }

    if (salesOrder.status === "faturado") {
      toast.error("Este pedido já foi faturado");
      return;
    }

    setLoading(true);

    try {
      // Chamar função do banco para criar fatura e conta a receber
      const { data, error } = await supabase.rpc(
        "create_invoice_from_sales_order",
        {
          p_order_id: salesOrder.id,
          p_data_vencimento: dataVencimento,
          p_user_id: user?.id,
        }
      );

      if (error) throw error;

      logger.info(
        "INVOICE",
        `Fatura criada para pedido ${salesOrder.numero_pedido}`,
        { invoiceId: data }
      );

      toast.success("Fatura gerada com sucesso! Conta a receber criada.");
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      logger.error("INVOICE", "Erro ao gerar fatura", error);
      toast.error(
        error.message || "Erro ao gerar fatura. Verifique se o pedido pode ser faturado."
      );
    } finally {
      setLoading(false);
    }
  };

  if (!salesOrder) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Gerar Fatura</DialogTitle>
          <DialogDescription>
            Criar fatura e conta a receber para o pedido{" "}
            {salesOrder.numero_pedido}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="data_vencimento">Data de Vencimento *</Label>
            <Input
              id="data_vencimento"
              type="date"
              value={dataVencimento}
              onChange={(e) => setDataVencimento(e.target.value)}
              required
              min={new Date().toISOString().split("T")[0]}
            />
          </div>

          <div className="rounded-lg border p-4 bg-muted/50">
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Pedido:</span>
                <span className="font-medium">{salesOrder.numero_pedido}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Cliente:</span>
                <span className="font-medium">
                  {salesOrder.cliente?.nome || "N/A"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Valor Total:</span>
                <span className="font-semibold text-lg">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(salesOrder.total_geral || 0)}
                </span>
              </div>
            </div>
          </div>

          <div className="text-xs text-muted-foreground">
            Uma conta a receber será criada automaticamente com o valor total do
            pedido.
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Gerando..." : "Gerar Fatura"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

