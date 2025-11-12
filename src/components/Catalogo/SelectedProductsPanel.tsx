import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { SafeImage } from "@/components/ui/SafeImage";
import { X, Package, FileText } from "lucide-react";

interface SelectedProduct {
  id: string;
  nome: string;
  descricao?: string | null;
  imagem_principal?: string | null;
  marca?: string | null;
  quantidade: number;
}

interface SelectedProductsPanelProps {
  selectedProducts: SelectedProduct[];
  generateProposal: boolean;
  onRemove: (productId: string) => void;
  onGenerateProposalChange: (checked: boolean) => void;
  onSubmit: () => void;
  loading: boolean;
}

export function SelectedProductsPanel({
  selectedProducts,
  generateProposal,
  onRemove,
  onGenerateProposalChange,
  onSubmit,
  loading,
}: SelectedProductsPanelProps) {
  const totalItems = selectedProducts.reduce((sum, p) => sum + p.quantidade, 0);

  if (selectedProducts.length === 0) {
    return (
      <Card className="glass-strong p-6">
        <div className="text-center py-8">
          <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhum produto selecionado
          </p>
          <p className="text-sm text-muted-foreground mt-2">
            Clique nos produtos para selecioná-los
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="glass-strong p-6 sticky top-4">
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Produtos Selecionados</h3>
          <Badge variant="secondary">{totalItems} itens</Badge>
        </div>

        <ScrollArea className="h-[400px] pr-4">
          <div className="space-y-3">
            {selectedProducts.map((product) => (
              <Card key={product.id} className="p-3 glass">
                <div className="flex gap-3">
                  <SafeImage
                    src={product.imagem_principal}
                    alt={product.nome}
                    className="w-16 h-16 object-cover rounded"
                    fallbackClassName="w-16 h-16"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-sm line-clamp-1">
                      {product.nome}
                    </h4>
                    {product.marca && (
                      <p className="text-xs text-muted-foreground">
                        {product.marca}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-muted-foreground">
                        Qtd: {product.quantidade}
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemove(product.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </ScrollArea>

        <div className="space-y-4 pt-4 border-t">
          <div className="flex items-center space-x-2">
            <Checkbox
              id="generate-proposal"
              checked={generateProposal}
              onCheckedChange={(checked) =>
                onGenerateProposalChange(checked === true)
              }
            />
            <label
              htmlFor="generate-proposal"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Gerar proposta automaticamente
            </label>
          </div>

          <Button
            type="button"
            className="w-full"
            onClick={onSubmit}
            disabled={loading || selectedProducts.length === 0}
          >
            <FileText className="h-4 w-4 mr-2" />
            {loading
              ? "Registrando..."
              : generateProposal
              ? "Registrar Oportunidade e Proposta"
              : "Registrar Oportunidade"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

