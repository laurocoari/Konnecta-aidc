import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Brain,
  Upload,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  FileSpreadsheet,
  FileText,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import * as XLSX from "xlsx";

interface ImportacaoInteligenteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onItemsExtracted: (data: any) => void;
}

export function ImportacaoInteligenteDialog({
  open,
  onOpenChange,
  onItemsExtracted,
}: ImportacaoInteligenteDialogProps) {
  const { user } = useAuth();
  const [texto, setTexto] = useState("");
  const [processing, setProcessing] = useState(false);
  const [processingStep, setProcessingStep] = useState<string>("");
  const [extractedData, setExtractedData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [dollarRate, setDollarRate] = useState<number>(5.0);
  const [selectedCurrency, setSelectedCurrency] = useState<"BRL" | "USD">("BRL");

  useEffect(() => {
    loadDollarRate();
  }, []);

  const loadDollarRate = async () => {
    try {
      const { data } = await supabase
        .from("quote_settings")
        .select("valor_dolar_atual")
        .single();
      if (data?.valor_dolar_atual) {
        setDollarRate(data.valor_dolar_atual);
      }
    } catch (error) {
      console.error("Error loading dollar rate:", error);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      // Arquivo de texto
      if (file.type === "text/plain" || file.name.endsWith(".txt")) {
        const text = await file.text();
        setTexto(text);
        toast.success("Arquivo TXT carregado com sucesso!");
      }
      // Arquivo HTML
      else if (file.type === "text/html" || file.name.endsWith(".html")) {
        const text = await file.text();
        const plainText = text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
        setTexto(plainText);
        toast.success("Arquivo HTML carregado e convertido!");
      }
      // Arquivo CSV
      else if (file.name.endsWith(".csv")) {
        const text = await file.text();
        setTexto(text);
        toast.success("Arquivo CSV carregado! Processando com IA...");
      }
      // Arquivo Excel (XLSX, XLS)
      else if (
        file.name.endsWith(".xlsx") ||
        file.name.endsWith(".xls") ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
        file.type === "application/vnd.ms-excel"
      ) {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        
        // Converter primeira planilha para texto
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const csv = XLSX.utils.sheet_to_csv(firstSheet);
        setTexto(csv);
        toast.success("Arquivo Excel carregado e convertido!");
      } else {
        toast.error(
          "Formato não suportado. Use arquivos .txt, .html, .csv, .xlsx ou .xls"
        );
      }
    } catch (error: any) {
      console.error("Error reading file:", error);
      toast.error("Erro ao ler arquivo: " + error.message);
    }
  };

  const handleInterpret = async () => {
    if (!texto.trim()) {
      toast.error("Cole ou envie o texto da cotação primeiro");
      return;
    }

    setProcessing(true);
    setError(null);
    setExtractedData(null);
    setProcessingStep("Conectando com a IA...");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      setProcessingStep("Enviando texto para processamento...");
      
      const response = await supabase.functions.invoke("interpretar-cotacao", {
        body: {
          texto_cotacao: texto,
        },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      // Verificar se há erro na resposta
      if (response.error) {
        console.error("Edge Function error:", response.error);
        // Tentar extrair mensagem de erro mais detalhada
        let errorMessage = response.error.message || "Erro ao processar cotação";
        
        // Se for erro 400, pode ser configuração não encontrada
        if (response.error.status === 400 || response.error.message?.includes("400")) {
          errorMessage = "Configuração da OpenAI não encontrada ou desabilitada. Acesse Configurações > IA e Automação para configurar.";
        }
        
        throw new Error(errorMessage);
      }

      const result = response.data;

      if (!result) {
        throw new Error("Resposta vazia do servidor");
      }

      if (!result.success) {
        const errorMsg = result.error || "Erro desconhecido ao processar cotação";
        
        // Mensagens mais amigáveis
        if (errorMsg.includes("não encontrada") || errorMsg.includes("desabilitada")) {
          throw new Error("Configuração da OpenAI não encontrada ou desabilitada. Acesse Configurações > IA e Automação para configurar.");
        }
        
        throw new Error(errorMsg);
      }

      setProcessingStep("Processando resposta...");

      if (!result.items || result.items.length === 0) {
        setError("Nenhum item reconhecido. Revise o texto enviado.");
        toast.warning("Nenhum produto foi identificado na cotação");
        return;
      }

      // Detectar moeda automaticamente ou usar a selecionada
      const detectedCurrency = result.moeda || selectedCurrency;
      setSelectedCurrency(detectedCurrency);

      // Preparar dados completos
      const fullData = {
        ...result,
        moeda: detectedCurrency,
        dollar_rate: dollarRate,
      };

      setExtractedData(fullData);
      
      const processingTime = result.processing_time_ms 
        ? ` (${(result.processing_time_ms / 1000).toFixed(1)}s)` 
        : "";
      
      toast.success(`${result.items.length} item(ns) extraído(s) com sucesso!${processingTime}`);
    } catch (error: any) {
      console.error("Error interpreting quote:", error);
      setError(error.message || "Erro ao processar cotação");
      toast.error(error.message || "Erro ao processar cotação");
    } finally {
      setProcessing(false);
      setProcessingStep("");
    }
  };

  const handleUseItems = () => {
    if (!extractedData || !extractedData.items || extractedData.items.length === 0) {
      toast.error("Nenhum item para usar");
      return;
    }

    // Converter valores se necessário
    const itemsWithConversion = extractedData.items.map((item: any) => {
      const precoUnitario = item.preco_unitario || 0;
      let valorOriginal = precoUnitario;
      let valorConvertido = precoUnitario;

      if (selectedCurrency === "USD") {
        valorOriginal = precoUnitario;
        valorConvertido = precoUnitario * dollarRate;
      } else {
        valorOriginal = precoUnitario;
        valorConvertido = precoUnitario;
      }

      return {
        ...item,
        moeda: selectedCurrency,
        valor_original: valorOriginal,
        valor_convertido: valorConvertido,
        custo_dolar: selectedCurrency === "USD" ? precoUnitario : precoUnitario / dollarRate,
      };
    });

    onItemsExtracted({
      ...extractedData,
      items: itemsWithConversion,
      moeda: selectedCurrency,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Importar Cotação (IA)
          </DialogTitle>
          <DialogDescription>
            Cole o texto do e-mail ou envie um arquivo para extrair automaticamente os dados
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Área de entrada */}
          <div className="space-y-2">
            <Label htmlFor="texto">Texto da Cotação</Label>
            <Textarea
              id="texto"
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              placeholder="Cole aqui o conteúdo do e-mail da cotação ou o texto extraído do PDF..."
              rows={8}
              className="font-mono text-sm"
            />
          </div>

          {/* Upload de arquivo */}
          <div className="space-y-2">
            <Label>Ou envie um arquivo</Label>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                onClick={() => document.getElementById("file-upload")?.click()}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Enviar Arquivo
              </Button>
              <input
                id="file-upload"
                type="file"
                accept=".txt,.html,.csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="flex gap-1 text-xs text-muted-foreground">
                <FileText className="h-3 w-3" />
                <span>TXT</span>
                <FileSpreadsheet className="h-3 w-3 ml-1" />
                <span>Excel/CSV</span>
              </div>
            </div>
          </div>

          {/* Seleção de moeda (se dados já extraídos) */}
          {extractedData && extractedData.items && extractedData.items.length > 0 && (
            <div className="space-y-2">
              <Label>Moeda da Cotação</Label>
              <Select
                value={selectedCurrency}
                onValueChange={(value: "BRL" | "USD") => setSelectedCurrency(value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BRL">Real (BRL)</SelectItem>
                  <SelectItem value="USD">Dólar (USD)</SelectItem>
                </SelectContent>
              </Select>
              {selectedCurrency === "USD" && (
                <p className="text-xs text-muted-foreground">
                  Taxa de câmbio: R$ {dollarRate.toFixed(4)} por US$ 1,00
                </p>
              )}
            </div>
          )}

          {/* Botão de processamento */}
          <Button
            onClick={handleInterpret}
            disabled={!texto.trim() || processing}
            className="w-full gap-2"
            size="lg"
          >
            {processing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {processingStep || "Processando com IA..."}
              </>
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                Enviar para IA
              </>
            )}
          </Button>

          {/* Erro */}
          {error && (
            <Card className="border-destructive bg-destructive/10 p-4">
              <div className="flex items-start gap-2">
                <AlertCircle className="h-5 w-5 text-destructive mt-0.5" />
                <div>
                  <p className="font-semibold text-destructive">Erro</p>
                  <p className="text-sm text-destructive/80">{error}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Informações da cotação */}
          {extractedData && (
            <Card className="p-4 bg-muted/50">
              <div className="grid grid-cols-2 gap-4 text-sm">
                {extractedData.distribuidor && (
                  <div>
                    <p className="text-xs text-muted-foreground">Distribuidor</p>
                    <p className="font-medium">{extractedData.distribuidor}</p>
                  </div>
                )}
                {extractedData.revenda && (
                  <div>
                    <p className="text-xs text-muted-foreground">Revenda</p>
                    <p className="font-medium">{extractedData.revenda}</p>
                  </div>
                )}
                {extractedData.condicao_pagamento && (
                  <div>
                    <p className="text-xs text-muted-foreground">Condição Pagamento</p>
                    <p className="font-medium">{extractedData.condicao_pagamento}</p>
                  </div>
                )}
                {extractedData.transportadora && (
                  <div>
                    <p className="text-xs text-muted-foreground">Transportadora</p>
                    <p className="font-medium">{extractedData.transportadora}</p>
                  </div>
                )}
              </div>
            </Card>
          )}

          {/* Pré-visualização */}
          {extractedData && extractedData.items && extractedData.items.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-base font-semibold">
                  Itens Extraídos ({extractedData.items.length})
                </Label>
                <Badge variant="outline" className="gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Sugerido pela IA
                </Badge>
              </div>

              <div className="space-y-2 max-h-64 overflow-y-auto">
                {extractedData.items.map((item: any, index: number) => {
                  const precoUnit = item.preco_unitario || 0;
                  const valorConvertido =
                    selectedCurrency === "USD"
                      ? precoUnit * dollarRate
                      : precoUnit;

                  return (
                    <Card key={index} className="p-3">
                      <div className="grid grid-cols-5 gap-2 text-sm">
                        <div className="col-span-2">
                          <p className="text-xs text-muted-foreground">Produto</p>
                          <p className="font-medium">{item.descricao || "-"}</p>
                          {item.part_number && (
                            <p className="text-xs text-muted-foreground">
                              Part #: {item.part_number}
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Qtd</p>
                          <p>{item.quantidade}</p>
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Preço Unit.</p>
                          <p>
                            {selectedCurrency === "USD" ? "US$" : "R$"}{" "}
                            {precoUnit.toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                          {selectedCurrency === "USD" && (
                            <p className="text-xs text-muted-foreground">
                              (R$ {valorConvertido.toFixed(2)})
                            </p>
                          )}
                        </div>
                        <div>
                          <p className="text-xs text-muted-foreground">Total</p>
                          <p>
                            {selectedCurrency === "USD" ? "US$" : "R$"}{" "}
                            {(item.total || 0).toLocaleString("pt-BR", {
                              minimumFractionDigits: 2,
                            })}
                          </p>
                        </div>
                      </div>
                      {item.ncm && (
                        <p className="text-xs text-muted-foreground mt-2">
                          NCM: {item.ncm}
                        </p>
                      )}
                      {item.imediato && (
                        <Badge variant="destructive" className="mt-2 text-xs">
                          Imediato
                        </Badge>
                      )}
                    </Card>
                  );
                })}
              </div>

              <Button onClick={handleUseItems} className="w-full" size="lg">
                Revisar e Salvar Cotação
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

