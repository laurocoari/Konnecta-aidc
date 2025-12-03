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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  CheckCircle2,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { findProductMatches, ProductMatch } from "@/lib/productMatching";
import { expandItemName } from "@/lib/semanticExpansion";
import { searchProductsInSupabase } from "@/lib/supabaseProductSearch";
import { toast } from "sonner";

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
  const [matches, setMatches] = useState<ProductMatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [showLowRelevance, setShowLowRelevance] = useState(false);
  const [autoLinkDialogOpen, setAutoLinkDialogOpen] = useState(false);
  const [bestMatch, setBestMatch] = useState<ProductMatch | null>(null);

  useEffect(() => {
    if (open && item) {
      setSearchTerm(item.descricao || "");
      // Sempre buscar no Supabase na abertura inicial também
      searchProducts(item.descricao || "", item.part_number, item.ncm, true);
    }
  }, [open, item]);

  const searchProducts = async (
    term: string,
    partNumber?: string,
    ncm?: string,
    isManualSearch: boolean = false
  ) => {
    if (!term.trim()) {
      setMatches([]);
      setBestMatch(null);
      return;
    }

    setLoading(true);
    try {
      let productsToSearch = products;
      
      // Se for busca manual OU não houver produtos locais, buscar no Supabase
      if (isManualSearch || products.length === 0) {
        const supabaseResults = await searchProductsInSupabase(term);
        if (supabaseResults.length > 0) {
          // Combinar com produtos locais (remover duplicatas)
          const supabaseIds = new Set(supabaseResults.map(p => p.id));
          const localProducts = products.filter(p => !supabaseIds.has(p.id));
          productsToSearch = [...supabaseResults, ...localProducts];
        } else if (products.length === 0) {
          // Se não encontrou nada e não há produtos locais, retornar vazio
          setMatches([]);
          setBestMatch(null);
          setLoading(false);
          return;
        }
      }

      // Expandir nome do item usando expansão semântica
      const expanded = await expandItemName(term, partNumber);
      
      // Debug: log para verificar expansão
      if (import.meta.env.DEV) {
        console.log("🔍 Busca de produtos:", {
          term,
          partNumber,
          expandedSynonyms: expanded.synonyms.slice(0, 5),
          productsToSearch: productsToSearch.length,
        });
      }
      
      // Buscar matches com sinônimos expandidos
      const results = await findProductMatches(
        term,
        partNumber,
        ncm,
        productsToSearch.length > 0 ? productsToSearch : products,
        expanded.synonyms
      );
      
      // Debug: log dos resultados
      if (import.meta.env.DEV && results.length > 0) {
        console.log("✅ Resultados encontrados:", results.slice(0, 3).map(r => ({
          nome: r.product.nome,
          score: r.score,
          partNumberScore: r.matchDetails.partNumberScore,
        })));
      }
      
      setMatches(results);

      // Verificar se há produto com ≥90% para sugestão automática
      if (results.length > 0 && results[0].score >= 90) {
        setBestMatch(results[0]);
        setAutoLinkDialogOpen(true);
      } else {
        setBestMatch(null);
      }
    } catch (error) {
      console.error("Error searching products:", error);
      setMatches([]);
      setBestMatch(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    // Se o usuário está digitando manualmente (diferente do item original), usar busca Supabase
    const isManual = value !== (item?.descricao || "");
    searchProducts(value, item?.part_number, item?.ncm, isManual);
  };

  const handleAutoLink = () => {
    if (bestMatch) {
      onLink(bestMatch.product.id);
      setAutoLinkDialogOpen(false);
      toast.success("Produto vinculado automaticamente!");
    }
  };

  const handleManualReview = () => {
    setAutoLinkDialogOpen(false);
  };

  // Separar produtos por relevância (NOVAS REGRAS)
  // ≥60%: Melhor opção
  // 40-60%: Possíveis correspondências
  // <40%: Outros resultados
  const bestMatches = matches.filter((m) => m.score >= 60);
  const possibleMatches = matches.filter((m) => m.score >= 40 && m.score < 60);
  const otherResults = matches.filter((m) => m.score < 40 && m.score >= 10);

  const getMatchBadge = (match: ProductMatch, isBest: boolean) => {
    if (isBest) {
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-blue-500 hover:bg-blue-600 text-white">
            <Sparkles className="h-3 w-3 mr-1" />
            Melhor Correspondência
          </Badge>
          <Badge className="bg-green-500 hover:bg-green-600 text-white">
            Similaridade {match.score}%
          </Badge>
        </div>
      );
    } else if (match.score >= 80) {
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-200">
          Alta Similaridade • {match.score}%
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          {match.score}% similar
        </Badge>
      );
    }
  };

  const getCardStyle = (match: ProductMatch, isBest: boolean) => {
    if (isBest) {
      // Melhor correspondência: fundo azul claro
      return "p-3 border-2 border-blue-500 bg-blue-50 hover:bg-blue-100 cursor-pointer transition-colors";
    } else if (match.score >= 60) {
      return "p-3 border border-blue-300 bg-blue-50/30 hover:bg-blue-50/50 cursor-pointer transition-colors";
    } else {
      return "p-3 hover:bg-muted/50 cursor-pointer transition-colors";
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Vincular Produto
            </DialogTitle>
            <DialogDescription>
              Busque e selecione um produto para vincular ao item da cotação.
              Os produtos são ordenados por similaridade.
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

            {/* Informações do item cotado */}
            {item && (
              <Card className="p-3 bg-muted/50">
                <div className="text-sm">
                  <p className="font-semibold mb-1">Item da Cotação:</p>
                  <p className="text-muted-foreground">{item.descricao || "—"}</p>
                  {item.part_number && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Part #: {item.part_number}
                    </p>
                  )}
                  {item.ncm && (
                    <p className="text-xs text-muted-foreground">
                      NCM: {item.ncm}
                    </p>
                  )}
                </div>
              </Card>
            )}

            {/* Lista de produtos */}
            <div className="space-y-3">
              {loading ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Calculando similaridade...
                </p>
              ) : matches.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">
                  Nenhum produto encontrado. Tente buscar por nome, código ou part number.
                </p>
              ) : (
                <>
                  {/* Melhor opção (≥60%) */}
                  {bestMatches.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold text-blue-600 flex items-center gap-2">
                        <Sparkles className="h-4 w-4" />
                        Melhor Opção
                      </h4>
                      {bestMatches.map((match, index) => {
                        const isBest = index === 0; // Primeiro é sempre o melhor
                        return (
                          <Card
                            key={match.product.id}
                            className={getCardStyle(match, isBest)}
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              console.log("🔗 Vinculando produto:", match.product.id, match.product.nome);
                              onLink(match.product.id);
                            }}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                  <p className="font-medium">{match.product.nome}</p>
                                  {getMatchBadge(match, isBest)}
                                </div>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                  {match.product.codigo && (
                                    <Badge variant="outline" className="text-xs">
                                      {match.product.codigo}
                                    </Badge>
                                  )}
                                  {match.product.codigo_fabricante && (
                                    <span>
                                      Part #: {match.product.codigo_fabricante}
                                    </span>
                                  )}
                                  {match.product.ncm && (
                                    <span>NCM: {match.product.ncm}</span>
                                  )}
                                </div>
                                {match.matchDetails.partNumberScore >= 80 && (
                                  <div className="mt-2">
                                    <Badge
                                      variant="outline"
                                      className="text-xs bg-yellow-50"
                                    >
                                      Part Number Match:{" "}
                                      {match.matchDetails.partNumberScore}%
                                    </Badge>
                                  </div>
                                )}
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground cursor-help">
                                        <Info className="h-3 w-3" />
                                        <span>Ver detalhes da similaridade</span>
                                      </div>
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                      <p className="text-xs">
                                        {match.matchDetails.explanation}
                                      </p>
                                    </TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>
                              </div>
                              <Button 
                                size="sm" 
                                variant="ghost"
                                onClick={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                  console.log("🔗 Vinculando produto (botão):", match.product.id, match.product.nome);
                                  onLink(match.product.id);
                                }}
                              >
                                <CheckCircle2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  )}

                  {/* Possíveis correspondências (40-60%) */}
                  {possibleMatches.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <h4 className="text-sm font-semibold text-muted-foreground">
                        Possíveis Correspondências
                      </h4>
                      {possibleMatches.map((match) => (
                        <Card
                          key={match.product.id}
                          className={getCardStyle(match, false)}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            console.log("🔗 Vinculando produto:", match.product.id, match.product.nome);
                            onLink(match.product.id);
                          }}
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-2 mb-1">
                                <p className="font-medium">{match.product.nome}</p>
                                {getMatchBadge(match, false)}
                              </div>
                              <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                {match.product.codigo_fabricante && (
                                  <span>
                                    Part #: {match.product.codigo_fabricante}
                                  </span>
                                )}
                                {match.product.ncm && (
                                  <span>NCM: {match.product.ncm}</span>
                                )}
                              </div>
                            </div>
                            <Button size="sm" variant="ghost">
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </Card>
                      ))}
                    </div>
                  )}

                  {/* Outros resultados (<40%, mas ≥10%) */}
                  {otherResults.length > 0 && (
                    <div className="space-y-2 mt-4">
                      <button
                        onClick={() => setShowLowRelevance(!showLowRelevance)}
                        className="flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showLowRelevance ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                        <span>
                          Outros Resultados ({otherResults.length})
                        </span>
                      </button>
                      {showLowRelevance && (
                        <div className="space-y-2">
                          {otherResults.map((match) => (
                            <Card
                              key={match.product.id}
                              className="p-3 hover:bg-muted/50 cursor-pointer transition-colors border border-muted"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log("🔗 Vinculando produto:", match.product.id, match.product.nome);
                                onLink(match.product.id);
                              }}
                            >
                              <div className="flex items-center justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between gap-2 mb-1">
                                    <p className="font-medium text-sm">
                                      {match.product.nome}
                                    </p>
                                    <Badge variant="outline" className="text-xs">
                                      {match.score}% similar
                                    </Badge>
                                  </div>
                                  <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                                    {match.product.codigo_fabricante && (
                                      <span>Part #: {match.product.codigo_fabricante}</span>
                                    )}
                                    {match.product.ncm && (
                                      <span>NCM: {match.product.ncm}</span>
                                    )}
                                  </div>
                                </div>
                                <Button size="sm" variant="ghost">
                                  <CheckCircle2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog de sugestão automática */}
      <AlertDialog open={autoLinkDialogOpen} onOpenChange={setAutoLinkDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-blue-500" />
              Produto Muito Semelhante Encontrado
            </AlertDialogTitle>
            <AlertDialogDescription className="space-y-3">
              <p>
                Encontramos um produto com <strong>{bestMatch?.score}%</strong> de
                similaridade:
              </p>
              {bestMatch && (
                <Card className="p-3 bg-blue-50 border-blue-200">
                  <p className="font-semibold">{bestMatch.product.nome}</p>
                  {bestMatch.product.codigo_fabricante && (
                    <p className="text-sm text-muted-foreground">
                      Part #: {bestMatch.product.codigo_fabricante}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    {bestMatch.matchDetails.explanation}
                  </p>
                </Card>
              )}
              <p>Deseja vincular automaticamente?</p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={handleManualReview}>
              Não, revisar manualmente
            </AlertDialogCancel>
            <AlertDialogAction onClick={handleAutoLink} className="bg-blue-500 hover:bg-blue-600">
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Sim, vincular
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
