import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SafeImage } from "@/components/ui/SafeImage";
import { Package, Plus, Minus, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface Product {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria: string;
  imagem_principal?: string | null;
  especificacoes?: any;
  brand_id?: string | null;
  marca?: string | null;
}

interface ProductCardProps {
  product: Product;
  isSelected: boolean;
  quantity: number;
  onSelect: (productId: string) => void;
  onQuantityChange: (productId: string, quantity: number) => void;
}

export function ProductCard({
  product,
  isSelected,
  quantity,
  onSelect,
  onQuantityChange,
}: ProductCardProps) {
  const handleQuantityChange = (delta: number) => {
    const newQuantity = Math.max(1, quantity + delta);
    onQuantityChange(product.id, newQuantity);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value) || 1;
    const newQuantity = Math.max(1, value);
    onQuantityChange(product.id, newQuantity);
  };

  return (
    <Card
      className={cn(
        "glass-strong overflow-hidden transition-all cursor-pointer hover:shadow-lg",
        isSelected && "ring-2 ring-primary shadow-lg"
      )}
      onClick={() => onSelect(product.id)}
    >
      <div className="relative">
        <SafeImage
          src={product.imagem_principal}
          alt={product.nome}
          className="w-full h-48 object-cover"
          fallbackClassName="w-full h-48"
        />
        {isSelected && (
          <div className="absolute top-2 right-2">
            <div className="bg-primary text-primary-foreground rounded-full p-2">
              <Check className="h-4 w-4" />
            </div>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <Badge variant="secondary">{product.categoria}</Badge>
        </div>
      </div>

      <div className="p-4 space-y-3">
        <div>
          <h3 className="font-semibold text-lg line-clamp-1">{product.nome}</h3>
          {product.marca && (
            <p className="text-sm text-muted-foreground">Marca: {product.marca}</p>
          )}
        </div>

        {product.descricao && (
          <p className="text-sm text-muted-foreground line-clamp-2">
            {product.descricao}
          </p>
        )}

        {product.especificacoes && typeof product.especificacoes === 'object' && (
          <div className="text-xs text-muted-foreground space-y-1">
            {Object.entries(product.especificacoes)
              .slice(0, 2)
              .map(([key, value]) => (
                <div key={key} className="flex justify-between">
                  <span className="font-medium">{key}:</span>
                  <span>{String(value)}</span>
                </div>
              ))}
          </div>
        )}

        {isSelected && (
          <div className="pt-2 border-t">
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(-1);
                }}
              >
                <Minus className="h-4 w-4" />
              </Button>
              <Input
                type="number"
                min="1"
                value={quantity}
                onChange={handleInputChange}
                onClick={(e) => e.stopPropagation()}
                className="w-16 text-center h-8"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-8 w-8"
                onClick={(e) => {
                  e.stopPropagation();
                  handleQuantityChange(1);
                }}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}

