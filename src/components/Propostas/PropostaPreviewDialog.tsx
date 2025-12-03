import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Download, Share2, CheckCircle2, FileText, Printer } from "lucide-react";
import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { generateProposalPDF } from "@/lib/proposalPdfGenerator";

interface PropostaPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  proposalId: string;
  codigo: string;
  versao: number;
}

export function PropostaPreviewDialog({
  open,
  onOpenChange,
  proposalId,
  codigo,
  versao,
}: PropostaPreviewDialogProps) {
  const [loading, setLoading] = useState(false);
  const [generatingPDF, setGeneratingPDF] = useState(false);
  const [htmlContent, setHtmlContent] = useState<string>("");
  const [linkPublico, setLinkPublico] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const handleGeneratePDF = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('generate-proposal-pdf', {
        body: { proposalId },
      });

      if (error) throw error;

      setHtmlContent(data.html);
      setLinkPublico(data.linkPublico);
      toast.success("PDF gerado com sucesso!");
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(linkPublico);
    setCopied(true);
    toast.success("Link copiado para área de transferência!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadPDF = async () => {
    if (!htmlContent) {
      toast.error("Gere o PDF primeiro");
      return;
    }

    setGeneratingPDF(true);
    try {
      // Criar elemento temporário para renderizar HTML
      const tempDiv = document.createElement("div");
      tempDiv.id = "temp-proposal-pdf";
      tempDiv.innerHTML = htmlContent;
      tempDiv.style.position = "absolute";
      tempDiv.style.left = "-9999px";
      tempDiv.style.width = "210mm";
      document.body.appendChild(tempDiv);

      try {
        await generateProposalPDF("temp-proposal-pdf", `proposta-${codigo}-v${versao}`);
        toast.success("PDF gerado e baixado com sucesso!");
      } finally {
        document.body.removeChild(tempDiv);
      }
    } catch (error: any) {
      console.error("Erro ao gerar PDF:", error);
      toast.error("Erro ao gerar PDF: " + error.message);
    } finally {
      setGeneratingPDF(false);
    }
  };

  const handleDownloadHTML = () => {
    if (!htmlContent) return;
    
    const blob = new Blob([htmlContent], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proposta-${codigo}-v${versao}.html`;
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

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.onload = () => {
        printWindow.print();
      };
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            Proposta Comercial {codigo} - Versão {versao}
          </DialogTitle>
          <DialogDescription>
            Visualize e gere o PDF da proposta comercial
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2 mb-4 flex-wrap">
          <Button
            onClick={handleGeneratePDF}
            disabled={loading}
            className="flex-1 min-w-[150px]"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Gerando...
              </>
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Gerar Preview
              </>
            )}
          </Button>

          {htmlContent && (
            <>
              <Button
                onClick={handleDownloadPDF}
                variant="outline"
                disabled={generatingPDF}
              >
                {generatingPDF ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Gerando PDF...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    Baixar PDF
                  </>
                )}
              </Button>
              <Button
                onClick={handleDownloadHTML}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Baixar HTML
              </Button>
              <Button
                onClick={handlePrint}
                variant="outline"
              >
                <Printer className="mr-2 h-4 w-4" />
                Imprimir
              </Button>
              <Button
                onClick={handleCopyLink}
                variant="outline"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Share2 className="mr-2 h-4 w-4" />
                    Copiar Link
                  </>
                )}
              </Button>
            </>
          )}
        </div>

        <div className="flex-1 overflow-auto border rounded-lg bg-white">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : htmlContent ? (
            <iframe
              srcDoc={htmlContent}
              className="w-full h-full min-h-[600px]"
              title="Preview da Proposta"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              Clique em "Gerar PDF" para visualizar a proposta
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
