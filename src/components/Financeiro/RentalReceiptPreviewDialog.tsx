import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Download, Printer, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { currencyToWords } from "@/lib/numberToWords";

interface RentalReceiptPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  receiptId: string;
  numeroRecibo?: string;
}

export function RentalReceiptPreviewDialog({
  open,
  onOpenChange,
  receiptId,
  numeroRecibo,
}: RentalReceiptPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [receiptData, setReceiptData] = useState<any>(null);

  useEffect(() => {
    if (open && receiptId) {
      loadReceiptData();
    }
  }, [open, receiptId]);

  const loadReceiptData = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("rental_receipts")
        .select(`
          *,
          cliente:clients(*),
          items:rental_receipt_items(*),
          bank_account:bank_accounts(*)
        `)
        .eq("id", receiptId)
        .single();

      if (error) throw error;
      setReceiptData(data);
    } catch (error: any) {
      console.error("Erro ao carregar recibo:", error);
      toast.error("Erro ao carregar dados do recibo");
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePDF = async () => {
    setGenerating(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-rental-receipt-pdf",
        {
          body: { receiptId },
        }
      );

      if (error) throw error;

      setHtmlContent(data.html);
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadPDF = () => {
    if (!htmlContent) {
      toast.error("Gere o PDF primeiro");
      return;
    }

    const blob = new Blob([htmlContent], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `recibo-${numeroRecibo || receiptId}.html`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    toast.success("Download iniciado!");
  };

  const handlePrint = () => {
    if (!htmlContent) {
      toast.error("Gere o PDF primeiro");
      return;
    }

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value || 0);
  };

  const formatDate = (date: string) => {
    if (!date) return "";
    return new Date(date).toLocaleDateString("pt-BR");
  };

  if (loading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (!receiptData) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl">
          <p>Recibo não encontrado</p>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Recibo de Locação {receiptData.numero_recibo}
          </DialogTitle>
          <DialogDescription>
            Visualize e gere o PDF do recibo de locação
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4">
          <Button
            onClick={handleGeneratePDF}
            disabled={generating}
            className="flex-1"
          >
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar PDF
              </>
            )}
          </Button>

          {htmlContent && (
            <>
              <Button onClick={handleDownloadPDF} variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Baixar HTML
              </Button>
              <Button onClick={handlePrint} variant="outline">
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto border rounded-lg bg-white p-6">
          {htmlContent ? (
            <div
              dangerouslySetInnerHTML={{ __html: htmlContent }}
              className="receipt-preview"
            />
          ) : (
            <div className="space-y-6">
              <div className="text-center border-b pb-4">
                <h1 className="text-2xl font-bold">RECIBO DE LOCAÇÃO</h1>
                <p className="text-sm text-muted-foreground mt-2">
                  Nº {receiptData.numero_recibo}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <h3 className="font-semibold mb-2">Dados do Locatário</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Razão Social:</strong> {receiptData.cliente?.nome}
                    </p>
                    <p>
                      <strong>CNPJ:</strong> {receiptData.cliente?.cnpj}
                    </p>
                    <p>
                      <strong>Endereço:</strong> {receiptData.cliente?.endereco}
                    </p>
                    <p>
                      <strong>Cidade/UF:</strong> {receiptData.cliente?.cidade}/
                      {receiptData.cliente?.estado}
                    </p>
                    <p>
                      <strong>CEP:</strong> {receiptData.cliente?.cep}
                    </p>
                    {receiptData.cliente?.ie && (
                      <p>
                        <strong>IE:</strong> {receiptData.cliente.ie}
                      </p>
                    )}
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Dados do Recibo</h3>
                  <div className="text-sm space-y-1">
                    <p>
                      <strong>Data de Emissão:</strong>{" "}
                      {formatDate(receiptData.data_emissao)}
                    </p>
                    {receiptData.data_vencimento && (
                      <p>
                        <strong>Data de Vencimento:</strong>{" "}
                        {formatDate(receiptData.data_vencimento)}
                      </p>
                    )}
                    {receiptData.periodo_locacao_inicio && (
                      <p>
                        <strong>Período:</strong>{" "}
                        {formatDate(receiptData.periodo_locacao_inicio)} até{" "}
                        {formatDate(receiptData.periodo_locacao_fim || "")}
                      </p>
                    )}
                    {receiptData.numero_contrato && (
                      <p>
                        <strong>Nº Contrato:</strong>{" "}
                        {receiptData.numero_contrato}
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Itens Locados</h3>
                <table className="w-full border-collapse border">
                  <thead>
                    <tr className="bg-gray-100">
                      <th className="border p-2 text-left">Item</th>
                      <th className="border p-2 text-left">Descrição</th>
                      <th className="border p-2 text-center">Qtd</th>
                      <th className="border p-2 text-right">Valor Unit.</th>
                      <th className="border p-2 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {receiptData.items?.map((item: any, index: number) => (
                      <tr key={item.id}>
                        <td className="border p-2">{index + 1}</td>
                        <td className="border p-2">{item.descricao}</td>
                        <td className="border p-2 text-center">
                          {item.quantidade}
                        </td>
                        <td className="border p-2 text-right">
                          {formatCurrency(item.valor_unitario)}
                        </td>
                        <td className="border p-2 text-right">
                          {formatCurrency(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="border-t pt-4">
                <div className="flex justify-end">
                  <div className="text-right">
                    <p className="text-lg font-semibold">
                      Total: {formatCurrency(receiptData.total_geral)}
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                      {receiptData.total_extenso ||
                        currencyToWords(receiptData.total_geral)}
                    </p>
                  </div>
                </div>
              </div>

              {receiptData.observacoes && (
                <div className="border-t pt-4">
                  <h3 className="font-semibold mb-2">Observações</h3>
                  <p className="text-sm">{receiptData.observacoes}</p>
                </div>
              )}

              <div className="border-t pt-4 text-xs text-muted-foreground">
                <p>
                  Não haverá incidência de ISSQN conforme Lei nº 1008/2006 e
                  Decreto 004304/2009.
                </p>
                <p className="mt-1">
                  Operação de locação de bens móveis, sem fornecimento de mão
                  de obra, está dispensada da emissão de NFS-e por não
                  incidência de ISSQN.
                </p>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

