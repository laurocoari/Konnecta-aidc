import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, Download, FileSpreadsheet } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ImportacaoProdutosDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export function ImportacaoProdutosDialog({
  open,
  onOpenChange,
  onSuccess,
}: ImportacaoProdutosDialogProps) {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [file, setFile] = useState<File | null>(null);

  const handleDownloadModelo = () => {
    const link = document.createElement("a");
    link.href = "/modelo-importacao-produtos.csv";
    link.download = "modelo-importacao-produtos.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Modelo baixado com sucesso!");
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split("\n");
    const headers = lines[0].split(",").map(h => h.trim());
    const products = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;

      const values = lines[i].split(",");
      const product: any = {};

      headers.forEach((header, index) => {
        const value = values[index]?.trim() || "";
        
        // Parse JSON fields
        if (header === "especificacoes" && value) {
          product.especificacoes = value.split("|").map(spec => {
            const [nome, valor] = spec.split(":");
            return { nome: nome?.trim(), valor: valor?.trim() };
          });
        } else if (header === "galeria_imagens" && value) {
          product.galeria = value.split("|").map(url => url.trim());
        } else if (header === "videos_youtube" && value) {
          product.videos = value.split("|").map(url => ({
            tipo: "youtube",
            url: url.trim(),
            titulo: "Vídeo do produto"
          }));
        } else if (header === "marca") {
          // Marca será resolvida depois
          product.marca_nome = value;
        } else if (["custo_medio", "margem_lucro", "valor_venda", "valor_locacao", "icms", "ipi", "pis", "cofins"].includes(header)) {
          product[header] = value ? parseFloat(value) : null;
        } else if (["estoque_atual", "estoque_minimo"].includes(header)) {
          product[header] = value ? parseInt(value) : 0;
        } else {
          product[header] = value || null;
        }
      });

      if (product.codigo && product.nome) {
        products.push(product);
      }
    }

    return products;
  };

  const resolveBrandId = async (brandName: string): Promise<string | null> => {
    if (!brandName) return null;

    try {
      const { data: existingBrand } = await supabase
        .from("brands")
        .select("id")
        .ilike("nome", brandName)
        .single();

      if (existingBrand) return existingBrand.id;

      // Create new brand if doesn't exist
      const { data: newBrand, error } = await supabase
        .from("brands")
        .insert({ nome: brandName, status: "ativa" })
        .select("id")
        .single();

      if (error) throw error;
      return newBrand.id;
    } catch (error) {
      console.error("Error resolving brand:", error);
      return null;
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast.error("Selecione um arquivo CSV");
      return;
    }

    setLoading(true);
    setProgress(0);

    try {
      const text = await file.text();
      const products = parseCSV(text);

      if (products.length === 0) {
        toast.error("Nenhum produto válido encontrado no arquivo");
        return;
      }

      toast.info(`Importando ${products.length} produtos...`);

      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        
        // Resolve brand_id
        if (product.marca_nome) {
          product.brand_id = await resolveBrandId(product.marca_nome);
          delete product.marca_nome;
        }

        // Remove campos não utilizados
        delete product.galeria_imagens;
        delete product.videos_youtube;

        // Insert product
        const { error } = await supabase.from("products").insert(product);

        if (error) {
          console.error(`Erro ao importar produto ${product.codigo}:`, error);
          toast.error(`Erro ao importar ${product.codigo}: ${error.message}`);
        }

        setProgress(((i + 1) / products.length) * 100);
      }

      toast.success(`${products.length} produtos importados com sucesso!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error importing products:", error);
      toast.error(`Erro na importação: ${error.message}`);
    } finally {
      setLoading(false);
      setProgress(0);
      setFile(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Importação de Produtos
          </DialogTitle>
          <DialogDescription>
            Importe produtos em massa através de arquivo CSV
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert>
            <AlertDescription>
              <strong>Instruções para o Manus IA:</strong>
              <ol className="list-decimal list-inside mt-2 space-y-1 text-sm">
                <li>Baixe o modelo CSV abaixo</li>
                <li>Peça ao Manus IA para extrair dados do site seguindo exatamente essa estrutura</li>
                <li>Para múltiplas imagens, separe URLs com | (pipe)</li>
                <li>Para especificações, use formato: Nome:Valor|Nome2:Valor2</li>
                <li>Após processamento, carregue o CSV gerado aqui</li>
              </ol>
            </AlertDescription>
          </Alert>

          <Button
            type="button"
            variant="outline"
            onClick={handleDownloadModelo}
            className="w-full gap-2"
          >
            <Download className="h-4 w-4" />
            Baixar Modelo CSV
          </Button>

          <div className="space-y-2">
            <Label htmlFor="csv-file">Arquivo CSV de Produtos</Label>
            <Input
              id="csv-file"
              type="file"
              accept=".csv"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              disabled={loading}
            />
            {file && (
              <p className="text-sm text-muted-foreground">
                Arquivo selecionado: {file.name}
              </p>
            )}
          </div>

          {loading && (
            <div className="space-y-2">
              <Progress value={progress} />
              <p className="text-sm text-center text-muted-foreground">
                Importando produtos... {Math.round(progress)}%
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleImport}
              disabled={!file || loading}
              className="gap-2"
            >
              <Upload className="h-4 w-4" />
              {loading ? "Importando..." : "Importar Produtos"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
