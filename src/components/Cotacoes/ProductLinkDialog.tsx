import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Search, CheckCircle2 } from "lucide-react";
import { findProductMatches } from "@/lib/productMatching";

interface ProductLinkDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  products: any[];
  onLink: (productId: string) => void;
}

export function ProductLinkDialog({
  open,
  onOpenChange,
  item,
  products,
  onLink,
}: ProductLinkDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && item) {
      setSearchTerm(item.descricao || "");
      searchProducts(item.descricao || "");
    }
  }, [open, item]);

  const searchProducts = async (term: string) => {
    if (!term.trim() || products.length === 0) {
      setMatches([]);
      return;
    }

    setLoading(true);
    try {
      const results = await findProductMatches(
        term,
        item.part_number,
        products
      );
      setMatches(results.map((m) => m.product));
    } catch (error) {
      console.error("Error searching products:", error);
      setMatches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    searchProducts(value);
  };

  // Filtrar produtos por termo de busca também
  const filteredProducts = products.filter((p) => {
    if (!searchTerm) return false;
    const term = searchTerm.toLowerCase();
    return (
      p.nome?.toLowerCase().includes(term) ||
      p.codigo?.toLowerCase().includes(term) ||
      p.codigo_fabricante?.toLowerCase().includes(term)
    );
  });

  const displayProducts = matches.length > 0 ? matches : filteredProducts.slice(0, 10);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Vincular Produto
          </DialogTitle>
          <DialogDescription>
            Busque e selecione um produto para vincular ao item da cotação
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Campo de busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou part number..."
              value={searchTerm}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Lista de produtos */}
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {loading ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Buscando...
              </p>
            ) : displayProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhum produto encontrado
              </p>
            ) : (
              displayProducts.map((product) => (
                <Card
                  key={product.id}
                  className="p-3 hover:bg-muted/50 cursor-pointer transition-colors"
                  onClick={() => onLink(product.id)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-medium">{product.nome}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {product.codigo && (
                          <Badge variant="outline" className="text-xs">
                            {product.codigo}
                          </Badge>
                        )}
                        {product.codigo_fabricante && (
                          <span className="text-xs text-muted-foreground">
                            Part #: {product.codigo_fabricante}
                          </span>
                        )}
                        {product.ncm && (
                          <span className="text-xs text-muted-foreground">
                            NCM: {product.ncm}
                          </span>
                        )}
                      </div>
                    </div>
                    <Button size="sm" variant="ghost">
                      <CheckCircle2 className="h-4 w-4" />
                    </Button>
                  </div>
                </Card>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

