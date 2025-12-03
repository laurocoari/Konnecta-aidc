import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

interface DialogAdicionarProdutoProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  produto: any;
  tipoOperacao: string;
  onConfirm: (quantidade: number, precoUnitario: number, desconto: number) => void;
}

export function DialogAdicionarProduto({
  open,
  onOpenChange,
  produto,
  tipoOperacao,
  onConfirm,
}: DialogAdicionarProdutoProps) {
  const [quantidade, setQuantidade] = useState(1);
  const [precoUnitario, setPrecoUnitario] = useState(0);
  const [desconto, setDesconto] = useState(0);

  useEffect(() => {
    if (produto && open) {
      // Definir preço inicial baseado no tipo de operação
      const isLocacao = tipoOperacao.includes('locacao');
      const precoInicial = isLocacao 
        ? (produto.valor_locacao || 0)
        : (produto.valor_venda || 0);
      
      setPrecoUnitario(precoInicial);
      setQuantidade(1);
      setDesconto(0);
    }
  }, [produto, open, tipoOperacao]);

  const handleConfirm = () => {
    // Permitir adicionar produtos mesmo com valor zerado
    // Validar apenas quantidade mínima
    if (quantidade <= 0) {
      return;
    }
    onConfirm(quantidade, precoUnitario, desconto);
    onOpenChange(false);
  };

  const subtotal = quantidade * precoUnitario;
  const descontoValor = (subtotal * desconto) / 100;
  const total = subtotal - descontoValor;

  if (!produto) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Adicionar Produto à Proposta</DialogTitle>
          <DialogDescription>
            Defina a quantidade, preço e desconto para este produto
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Informações do Produto */}
          <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
            {produto.imagem_principal && (
              <img
                src={produto.imagem_principal}
                alt={produto.nome}
                className="h-12 w-12 object-cover rounded"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            )}
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{produto.nome}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                {produto.sku_interno && (
                  <span className="font-mono">{produto.sku_interno}</span>
                )}
                {produto.codigo && produto.codigo !== produto.sku_interno && (
                  <>
                    {produto.sku_interno && <span>•</span>}
                    <span>{produto.codigo}</span>
                  </>
                )}
                {produto.brand && (
                  <>
                    {(produto.sku_interno || produto.codigo) && <span>•</span>}
                    <Badge variant="outline" className="text-xs">
                      {produto.brand.nome}
                    </Badge>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Campos de entrada */}
          <div className="grid gap-4">
            <div>
              <Label>Quantidade *</Label>
              <Input
                type="number"
                min="1"
                value={quantidade}
                onChange={(e) => {
                  const value = parseInt(e.target.value) || 1;
                  setQuantidade(value < 1 ? 1 : value);
                }}
              />
            </div>

            <div>
              <Label>Preço Unitário (R$)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={precoUnitario}
                onChange={(e) => {
                  const value = e.target.value;
                  // Permitir valor zerado e valores negativos (para ajustes)
                  if (value === '' || value === '-') {
                    setPrecoUnitario(0);
                  } else {
                    const numValue = parseFloat(value);
                    setPrecoUnitario(isNaN(numValue) ? 0 : numValue);
                  }
                }}
                onBlur={(e) => {
                  // Garantir que o valor não seja negativo ao sair do campo
                  if (precoUnitario < 0) {
                    setPrecoUnitario(0);
                  }
                }}
                placeholder="0.00"
              />
              {produto.valor_venda && tipoOperacao.includes('venda') && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sugerido: R$ {produto.valor_venda.toFixed(2)}
                </p>
              )}
              {produto.valor_locacao && tipoOperacao.includes('locacao') && (
                <p className="text-xs text-muted-foreground mt-1">
                  Sugerido: R$ {produto.valor_locacao.toFixed(2)}/mês
                </p>
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Você pode definir um valor personalizado ou deixar zerado
              </p>
            </div>

            <div>
              <Label>Desconto (%)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                max="100"
                value={desconto}
                onChange={(e) => setDesconto(parseFloat(e.target.value) || 0)}
                placeholder="0.00"
              />
            </div>

            {/* Resumo do cálculo */}
            <div className="p-3 bg-muted rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-medium">
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(subtotal)}
                </span>
              </div>
              {desconto > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Desconto:</span>
                  <span className="font-medium text-destructive">
                    -{new Intl.NumberFormat("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    }).format(descontoValor)}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm font-semibold pt-1 border-t">
                <span>Total:</span>
                <span>
                  {new Intl.NumberFormat("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  }).format(total)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button 
            onClick={handleConfirm} 
            disabled={quantidade <= 0}
          >
            Adicionar à Proposta
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}


