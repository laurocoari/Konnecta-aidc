import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { CheckCircle2, X, Search } from "lucide-react";
import { ProductMatch } from "@/lib/productMatching";

interface ProductMatchModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  matches: ProductMatch[];
  onLink: (productId: string) => void;
  onViewOthers: () => void;
  onSkip: () => void;
}

export function ProductMatchModal({
  open,
  onOpenChange,
  item,
  matches,
  onLink,
  onViewOthers,
  onSkip,
}: ProductMatchModalProps) {
  const bestMatch = matches[0];

  const getMatchTypeLabel = (type: string) => {
    switch (type) {
      case "exact":
        return "Exato";
      case "code":
        return "Código";
      case "reference":
        return "Referência";
      default:
        return "Similar";
    }
  };

  const getMatchTypeColor = (type: string) => {
    switch (type) {
      case "exact":
        return "bg-green-500";
      case "code":
        return "bg-blue-500";
      case "reference":
        return "bg-yellow-500";
      default:
        return "bg-gray-500";
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Produtos Semelhantes Encontrados
          </DialogTitle>
          <DialogDescription>
            Encontramos produtos semelhantes já cadastrados. Deseja vincular?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Item da cotação */}
          <Card className="p-4 bg-muted/50">
            <p className="text-sm text-muted-foreground mb-1">Item da Cotação:</p>
            <p className="font-semibold">{item.descricao}</p>
            {item.part_number && (
              <p className="text-sm text-muted-foreground mt-1">
                Part #: {item.part_number}
              </p>
            )}
          </Card>

          {/* Melhor match */}
          {bestMatch && (
            <Card className="p-4 border-2 border-primary">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <p className="font-semibold text-lg">{bestMatch.product.nome}</p>
                    <Badge
                      className={`${getMatchTypeColor(bestMatch.matchType)} text-white`}
                    >
                      {getMatchTypeLabel(bestMatch.matchType)}
                    </Badge>
                    <Badge variant="outline">
                      {Math.round(bestMatch.score * 100)}% similaridade
                    </Badge>
                  </div>
                  {bestMatch.product.codigo_fabricante && (
                    <p className="text-sm text-muted-foreground">
                      Part #: {bestMatch.product.codigo_fabricante}
                    </p>
                  )}
                  {bestMatch.product.ncm && (
                    <p className="text-sm text-muted-foreground">
                      NCM: {bestMatch.product.ncm}
                    </p>
                  )}
                </div>
              </div>
              <Button
                onClick={() => onLink(bestMatch.product.id)}
                className="w-full"
                size="lg"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Vincular Produto
              </Button>
            </Card>
          )}

          {/* Outros matches */}
          {matches.length > 1 && (
            <div className="space-y-2">
              <p className="text-sm font-medium">Outros produtos encontrados:</p>
              {matches.slice(1, 4).map((match, index) => (
                <Card key={index} className="p-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{match.product.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {Math.round(match.score * 100)}%
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {getMatchTypeLabel(match.matchType)}
                        </span>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => onLink(match.product.id)}
                    >
                      Vincular
                    </Button>
                  </div>
                </Card>
              ))}
              {matches.length > 4 && (
                <Button variant="ghost" className="w-full" onClick={onViewOthers}>
                  Ver todos os {matches.length} produtos encontrados
                </Button>
              )}
            </div>
          )}

          {/* Ações */}
          <div className="flex gap-2 pt-4 border-t">
            <Button variant="outline" onClick={onSkip} className="flex-1">
              <X className="h-4 w-4 mr-2" />
              Não vincular agora
            </Button>
            {bestMatch && (
              <Button
                onClick={() => onLink(bestMatch.product.id)}
                className="flex-1"
              >
                <CheckCircle2 className="h-4 w-4 mr-2" />
                Vincular Melhor Match
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

