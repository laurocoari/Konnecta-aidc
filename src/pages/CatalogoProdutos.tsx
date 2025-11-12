import { useState, useEffect, useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ProductCard } from "@/components/Catalogo/ProductCard";
import { SelectedProductsPanel } from "@/components/Catalogo/SelectedProductsPanel";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Search, Package, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { logger } from "@/lib/logger";

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

interface SelectedProduct extends Product {
  quantidade: number;
}

export default function CatalogoProdutos() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [selectedBrand, setSelectedBrand] = useState<string>("all");
  const [selectedProducts, setSelectedProducts] = useState<Map<string, SelectedProduct>>(new Map());
  const [generateProposal, setGenerateProposal] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogLoading, setDialogLoading] = useState(false);
  const [formData, setFormData] = useState({
    cnpj: "",
    tipo_oportunidade: "venda_direta",
    observacoes: "",
  });
  const [partner, setPartner] = useState<any>(null);

  useEffect(() => {
    if (user) {
      loadPartnerData();
      loadProducts();
    }
  }, [user]);

  const loadPartnerData = async () => {
    const { data, error } = await supabase
      .from("partners")
      .select("*")
      .eq("user_id", user?.id)
      .maybeSingle();

    if (error) {
      logger.error("DB", "Erro ao carregar dados do parceiro", error);
      toast.error("Erro ao carregar dados do parceiro");
    } else if (!data) {
      toast.error("Você não está cadastrado como parceiro.");
    } else {
      setPartner(data);
    }
  };

  const loadProducts = async () => {
    try {
      setLoading(true);
      logger.db("Carregando produtos ativos do catálogo");

      // Buscar produtos com status ativo
      const { data: productsData, error: productsError } = await supabase
        .from("products")
        .select(`
          id,
          nome,
          descricao,
          categoria,
          imagem_principal,
          especificacoes,
          brand_id
        `)
        .eq("status", "ativo")
        .order("nome");

      if (productsError) {
        logger.error("DB", "Erro ao carregar produtos", productsError);
        toast.error("Erro ao carregar produtos");
        return;
      }

      // Buscar marcas separadamente se houver brand_ids
      const brandIds = Array.from(
        new Set(
          (productsData || [])
            .map((p: any) => p.brand_id)
            .filter((id: any) => id !== null)
        )
      );

      let brandsMap = new Map();
      if (brandIds.length > 0) {
        const { data: brandsData } = await supabase
          .from("brands")
          .select("id, nome")
          .in("id", brandIds);

        if (brandsData) {
          brandsMap = new Map(brandsData.map((b: any) => [b.id, b.nome]));
        }
      }

      // Mapear produtos com nome da marca
      const productsWithBrand = (productsData || []).map((product: any) => ({
        id: product.id,
        nome: product.nome,
        descricao: product.descricao,
        categoria: product.categoria,
        imagem_principal: product.imagem_principal,
        especificacoes: product.especificacoes,
        brand_id: product.brand_id,
        marca: product.brand_id ? brandsMap.get(product.brand_id) || null : null,
      }));

      logger.db(`✅ ${productsWithBrand.length} produtos carregados`);
      setProducts(productsWithBrand);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar produtos", error);
      toast.error("Erro ao carregar produtos");
    } finally {
      setLoading(false);
    }
  };

  // Filtrar produtos
  const filteredProducts = useMemo(() => {
    return products.filter((product) => {
      const matchesSearch =
        product.nome.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.descricao?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.categoria.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesCategory =
        selectedCategory === "all" || product.categoria === selectedCategory;

      const matchesBrand =
        selectedBrand === "all" ||
        (selectedBrand === "sem_marca" && !product.marca) ||
        product.marca === selectedBrand;

      return matchesSearch && matchesCategory && matchesBrand;
    });
  }, [products, searchTerm, selectedCategory, selectedBrand]);

  // Obter categorias e marcas únicas
  const categories = useMemo(() => {
    const cats = Array.from(new Set(products.map((p) => p.categoria))).sort();
    return cats;
  }, [products]);

  const brands = useMemo(() => {
    const brds = Array.from(
      new Set(products.map((p) => p.marca).filter(Boolean))
    ).sort();
    return brds;
  }, [products]);

  // Selecionar produto
  const handleSelectProduct = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      if (newMap.has(productId)) {
        newMap.delete(productId);
      } else {
        newMap.set(productId, {
          ...product,
          quantidade: 1,
        });
      }
      return newMap;
    });
  };

  // Alterar quantidade
  const handleQuantityChange = (productId: string, quantity: number) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      const product = newMap.get(productId);
      if (product) {
        newMap.set(productId, { ...product, quantidade: quantity });
      }
      return newMap;
    });
  };

  // Remover produto selecionado
  const handleRemoveProduct = (productId: string) => {
    setSelectedProducts((prev) => {
      const newMap = new Map(prev);
      newMap.delete(productId);
      return newMap;
    });
  };

  // Abrir dialog para criar oportunidade
  const handleOpenDialog = () => {
    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }
    setShowDialog(true);
  };

  // Criar oportunidade e proposta
  const handleSubmit = async () => {
    if (!partner) {
      toast.error("Você precisa estar cadastrado como parceiro");
      return;
    }

    if (selectedProducts.size === 0) {
      toast.error("Selecione pelo menos um produto");
      return;
    }

    setDialogLoading(true);

    try {
      logger.db("Criando oportunidade e proposta");

      // Verificar se cliente existe
      const cnpj = formData.cnpj.replace(/\D/g, "");
      let clientId: string | null = null;

      if (cnpj.length >= 14) {
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("cnpj", cnpj)
          .maybeSingle();

        if (existingClient) {
          clientId = existingClient.id;
        } else {
          // Criar cliente básico se não existir
          const { data: newClient, error: clientError } = await supabase
            .from("clients")
            .insert({
              nome: `Cliente - ${cnpj}`,
              cnpj: cnpj,
              contato_principal: "",
              email: "",
              telefone: "",
              endereco: "",
              cidade: "",
              estado: "",
              cep: "",
              tipo: "cliente",
            })
            .select()
            .single();

          if (clientError) {
            logger.error("DB", "Erro ao criar cliente", clientError);
            throw clientError;
          }

          clientId = newClient.id;
        }
      }

      if (!clientId) {
        toast.error("CNPJ inválido ou cliente não encontrado");
        setDialogLoading(false);
        return;
      }

      // Converter Map para Array
      const selectedProductsArray = Array.from(selectedProducts.values());
      const productNames = selectedProductsArray.map((p) => p.nome).join(", ");

      // Criar oportunidade
      const { data: newOpportunity, error: oppError } = await supabase
        .from("opportunities")
        .insert({
          partner_id: partner.id,
          client_id: clientId,
          product_name: productNames,
          tipo_oportunidade: formData.tipo_oportunidade,
          observacoes: formData.observacoes || null,
          status: "em_analise",
        })
        .select()
        .single();

      if (oppError) {
        logger.error("DB", "Erro ao criar oportunidade", oppError);
        throw oppError;
      }

      logger.db(`✅ Oportunidade criada: ${newOpportunity.id}`);

      // Se gerar proposta, criar também
      if (generateProposal) {
        const { error: proposalError } = await supabase
          .from("partner_proposals")
          .insert({
            partner_id: partner.id,
            opportunity_id: newOpportunity.id,
            client_id: clientId,
            products: selectedProductsArray.map((p) => ({
              id: p.id,
              nome: p.nome,
              descricao: p.descricao,
              imagem_url: p.imagem_principal,
              quantidade: p.quantidade,
            })),
            observacoes: formData.observacoes || null,
            status: "aguardando",
          });

        if (proposalError) {
          logger.error("DB", "Erro ao criar proposta", proposalError);
          throw proposalError;
        }

        logger.db("✅ Proposta criada com sucesso");
        toast.success("Oportunidade e proposta registradas com sucesso!");
      } else {
        toast.success("Oportunidade registrada com sucesso!");
      }

      // Limpar seleção e fechar dialog
      setSelectedProducts(new Map());
      setGenerateProposal(false);
      setShowDialog(false);
      setFormData({
        cnpj: "",
        tipo_oportunidade: "venda_direta",
        observacoes: "",
      });
    } catch (error: any) {
      logger.error("DB", "Erro ao registrar oportunidade", error);
      toast.error(error.message || "Erro ao registrar oportunidade");
    } finally {
      setDialogLoading(false);
    }
  };

  const selectedProductsArray = Array.from(selectedProducts.values());

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Catálogo de Produtos</h1>
          <p className="text-muted-foreground">
            Navegue pelos produtos e selecione os itens para criar uma oportunidade
          </p>
        </div>
      </div>

      {/* Filtros e Busca */}
      <Card className="glass-strong p-4">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produtos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger>
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>
                  {cat}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger>
              <SelectValue placeholder="Marca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as marcas</SelectItem>
              <SelectItem value="sem_marca">Sem marca</SelectItem>
              {brands.map((brand) => (
                <SelectItem key={brand} value={brand}>
                  {brand}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Grid de Produtos */}
        <div className="lg:col-span-3">
          {loading ? (
            <div className="text-center py-12">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
              <p className="text-muted-foreground">Carregando produtos...</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum produto encontrado com os filtros aplicados
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredProducts.map((product) => {
                const selected = selectedProducts.has(product.id);
                const quantity = selectedProducts.get(product.id)?.quantidade || 1;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    isSelected={selected}
                    quantity={quantity}
                    onSelect={handleSelectProduct}
                    onQuantityChange={handleQuantityChange}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Painel de Produtos Selecionados */}
        <div className="lg:col-span-1">
          <SelectedProductsPanel
            selectedProducts={selectedProductsArray}
            generateProposal={generateProposal}
            onRemove={handleRemoveProduct}
            onGenerateProposalChange={setGenerateProposal}
            onSubmit={handleOpenDialog}
            loading={dialogLoading}
          />
        </div>
      </div>

      {/* Dialog para criar oportunidade */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Registrar Oportunidade</DialogTitle>
            <DialogDescription>
              Preencha os dados para criar uma nova oportunidade
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="cnpj">CNPJ do Cliente *</Label>
              <Input
                id="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={(e) =>
                  setFormData({ ...formData, cnpj: e.target.value })
                }
              />
            </div>

            <div>
              <Label htmlFor="tipo_oportunidade">Tipo de Oportunidade *</Label>
              <Select
                value={formData.tipo_oportunidade}
                onValueChange={(value) =>
                  setFormData({ ...formData, tipo_oportunidade: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="venda_direta">Venda Direta</SelectItem>
                  <SelectItem value="venda_agenciada">Venda Agenciada</SelectItem>
                  <SelectItem value="locacao_direta">Locação Direta</SelectItem>
                  <SelectItem value="locacao_agenciada">Locação Agenciada</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre a oportunidade..."
                value={formData.observacoes}
                onChange={(e) =>
                  setFormData({ ...formData, observacoes: e.target.value })
                }
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowDialog(false)}
              disabled={dialogLoading}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={dialogLoading || !formData.cnpj}
            >
              {dialogLoading ? "Registrando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

