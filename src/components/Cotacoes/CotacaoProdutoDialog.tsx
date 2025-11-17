import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Calendar } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CotacaoFormDialog } from "./CotacaoFormDialog";

interface CotacaoProdutoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productName?: string;
}

export function CotacaoProdutoDialog({
  open,
  onOpenChange,
  productId,
  productName,
}: CotacaoProdutoDialogProps) {
  const [cotações, setCotações] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedCotacao, setSelectedCotacao] = useState<any>(null);

  useEffect(() => {
    if (open && productId) {
      loadCotações();
    }
  }, [open, productId]);

  const loadCotações = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("product_quotes")
        .select(`
          *,
          supplier:suppliers(id, nome, cnpj)
        `)
        .eq("product_id", productId)
        .order("preco_unitario", { ascending: true });

      if (error) throw error;
      setCotações(data || []);
    } catch (error: any) {
      console.error("Error loading cotações:", error);
      toast.error("Erro ao carregar cotações");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("pt-BR");
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      ativo: { label: "Ativo", variant: "default" },
      expirado: { label: "Expirado", variant: "secondary" },
      selecionado: { label: "Selecionado", variant: "outline" },
      cancelado: { label: "Cancelado", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "default" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleNew = () => {
    setSelectedCotacao(null);
    setFormDialogOpen(true);
  };

  const handleEdit = (cotacao: any) => {
    setSelectedCotacao(cotacao);
    setFormDialogOpen(true);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Cotações - {productName || "Produto"}
            </DialogTitle>
            <DialogDescription>
              Visualize e gerencie cotações de preços para este produto
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-end">
              <Button onClick={handleNew} className="gap-2">
                <Plus className="h-4 w-4" />
                Nova Cotação
              </Button>
            </div>

            {loading ? (
              <div className="text-center py-8 text-muted-foreground">
                Carregando cotações...
              </div>
            ) : cotações.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma cotação cadastrada para este produto.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Fornecedor</TableHead>
                    <TableHead className="text-right">Preço Unitário</TableHead>
                    <TableHead className="text-center">Qtd. Mínima</TableHead>
                    <TableHead>Prazo Entrega</TableHead>
                    <TableHead>Data Cotação</TableHead>
                    <TableHead>Validade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {cotações.map((cotacao) => (
                    <TableRow key={cotacao.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Building2 className="h-4 w-4 text-muted-foreground" />
                          <span>{cotacao.supplier?.nome || "N/A"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatCurrency(cotacao.preco_unitario)}
                      </TableCell>
                      <TableCell className="text-center">
                        {cotacao.quantidade_minima || "-"}
                      </TableCell>
                      <TableCell>{cotacao.prazo_entrega || "-"}</TableCell>
                      <TableCell>{formatDate(cotacao.data_cotacao)}</TableCell>
                      <TableCell>
                        {cotacao.validade ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(cotacao.validade)}
                          </div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>{getStatusBadge(cotacao.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(cotacao)}
                        >
                          Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <CotacaoFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        cotacao={selectedCotacao}
        productId={productId}
        onSuccess={() => {
          loadCotações();
          setFormDialogOpen(false);
        }}
      />
    </>
  );
}




