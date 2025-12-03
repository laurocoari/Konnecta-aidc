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
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  Edit,
  Save,
  DollarSign,
  Package,
  AlertTriangle,
  Plus,
  Link2,
  X,
  Zap,
  Building2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { findBestProductMatch, findAllProductMatches } from "@/lib/productMatching";
import { ProdutoFormDialog } from "@/components/Produtos/ProdutoFormDialog";
import { ProductMatchModal } from "./ProductMatchModal";
import { ProductLinkDialog } from "./ProductLinkDialog";
import { QuickSupplierDialog } from "./QuickSupplierDialog";
import { AddToExistingCotacaoDialog } from "./AddToExistingCotacaoDialog";
import { ClienteFinalDialog } from "./ClienteFinalDialog";

interface RevisaoCotacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  extractedData: any;
  onSuccess: () => void;
}

export function RevisaoCotacaoDialog({
  open,
  onOpenChange,
  extractedData,
  onSuccess,
}: RevisaoCotacaoDialogProps) {
  const [items, setItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState<string>("");
  const [dollarRate, setDollarRate] = useState<number>(5.0);
  
  // Modals
  const [newProductDialogOpen, setNewProductDialogOpen] = useState(false);
  const [editProductDialogOpen, setEditProductDialogOpen] = useState(false);
  const [quickSupplierDialogOpen, setQuickSupplierDialogOpen] = useState(false);
  const [productLinkDialogOpen, setProductLinkDialogOpen] = useState(false);
  const [productMatchModalOpen, setProductMatchModalOpen] = useState(false);
  
  // Estados para modals
  const [itemToCreateProduct, setItemToCreateProduct] = useState<any>(null);
  const [itemToEditProduct, setItemToEditProduct] = useState<any>(null);
  const [itemToLinkProduct, setItemToLinkProduct] = useState<any>(null);
  const [itemWithMatches, setItemWithMatches] = useState<any>(null);
  const [matchesForItem, setMatchesForItem] = useState<any[]>([]);
  const [existingCotacaoDialogOpen, setExistingCotacaoDialogOpen] = useState(false);
  const [existingCotacao, setExistingCotacao] = useState<any>(null);
  
  // Estados para cliente final
  const [clienteFinal, setClienteFinal] = useState<any>(null);
  const [clienteFinalId, setClienteFinalId] = useState<string | null>(null);
  const [clienteFinalDialogOpen, setClienteFinalDialogOpen] = useState(false);
  const [clienteFinalStatus, setClienteFinalStatus] = useState<"nao_cadastrado" | "cadastrado" | "verificando">("verificando");

  useEffect(() => {
    if (open && extractedData) {
      loadProducts();
      loadSuppliers();
      loadDollarRate();
      processItems();
      checkClienteFinal();
    }
  }, [open, extractedData]);

  const checkClienteFinal = async () => {
    if (!extractedData?.faturamento_direto || !extractedData?.cliente_final?.cnpj) {
      setClienteFinalStatus("nao_cadastrado");
      setClienteFinal(null);
      setClienteFinalId(null);
      return;
    }

    setClienteFinalStatus("verificando");
    const clienteData = extractedData.cliente_final;

    try {
      // Buscar cliente por CNPJ
      const { data: existingClient, error } = await supabase
        .from("clients")
        .select("id, nome, cnpj, cidade, estado")
        .eq("cnpj", clienteData.cnpj.replace(/[^\d]/g, ""))
        .maybeSingle();

      if (error) throw error;

      if (existingClient) {
        // Cliente encontrado
        setClienteFinalId(existingClient.id);
        setClienteFinal({
          ...clienteData,
          id: existingClient.id,
          nome: existingClient.nome,
          cidade: existingClient.cidade,
          estado: existingClient.estado,
        });
        setClienteFinalStatus("cadastrado");
      } else {
        // Cliente não encontrado
        setClienteFinal(clienteData);
        setClienteFinalId(null);
        setClienteFinalStatus("nao_cadastrado");
        setClienteFinalDialogOpen(true);
      }
    } catch (error: any) {
      console.error("Error checking cliente final:", error);
      setClienteFinalStatus("nao_cadastrado");
      setClienteFinal(clienteData);
    }
  };

  const handleCadastrarClienteAutomatico = async () => {
    if (!clienteFinal) return;

    setLoading(true);
    try {
      // Limpar CNPJ (remover caracteres especiais)
      const cnpjLimpo = clienteFinal.cnpj.replace(/[^\d]/g, "");

      // Criar cliente
      const { data: newClient, error } = await supabase
        .from("clients")
        .insert({
          nome: clienteFinal.nome,
          cnpj: cnpjLimpo,
          ie: clienteFinal.ie || null,
          contato_principal: "Importado via IA",
          email: "importado@cotacao.com",
          telefone: "",
          endereco: clienteFinal.endereco,
          cidade: clienteFinal.cidade,
          estado: clienteFinal.uf,
          cep: clienteFinal.cep.replace(/[^\d]/g, ""),
          tipo: "cliente",
          observacoes: `Cliente cadastrado automaticamente via importação de cotação - ${new Date().toLocaleString("pt-BR")}`,
        })
        .select()
        .single();

      if (error) throw error;

      setClienteFinalId(newClient.id);
      setClienteFinal({
        ...clienteFinal,
        id: newClient.id,
      });
      setClienteFinalStatus("cadastrado");
      setClienteFinalDialogOpen(false);
      toast.success("Cliente final cadastrado com sucesso!");
    } catch (error: any) {
      console.error("Error creating cliente:", error);
      toast.error(error.message || "Erro ao cadastrar cliente");
    } finally {
      setLoading(false);
    }
  };

  const handleCadastrarClienteManual = () => {
    setClienteFinalDialogOpen(false);
    // Redirecionar para página de clientes ou abrir modal de cadastro
    toast.info("Redirecione para a página de clientes para cadastrar manualmente");
    // TODO: Implementar redirecionamento ou modal de cadastro manual
  };

  const handlePularCliente = () => {
    setClienteFinalDialogOpen(false);
    setClienteFinalStatus("nao_cadastrado");
    toast.warning("Cliente final não será vinculado à cotação");
  };

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

  const loadProducts = async () => {
    const { data } = await supabase
      .from("products")
      .select("id, nome, codigo, codigo_fabricante, ncm, custo_dolar, moeda_preferencial, brand_id, categoria")
      .order("nome");
    if (data) setProducts(data);
  };

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from("suppliers")
      .select("id, nome")
      .order("nome");
    if (data) setSuppliers(data);
  };

  // Busca inteligente de produto principal por código (com variações)
  const buscarProdutoPrincipal = async (codigo: string): Promise<any[]> => {
    if (!codigo) return [];
    
    const codigoNormalizado = codigo.toLowerCase().trim();
    const codigoVariacoes = [
      codigoNormalizado,
      codigoNormalizado.replace(/-/g, ""),
      codigoNormalizado.replace(/\s/g, ""),
      codigoNormalizado.replace(/-/g, " "),
    ];

    // Buscar produtos que contenham o código no nome ou código
    const { data: produtosEncontrados } = await supabase
      .from("products")
      .select("id, nome, codigo, codigo_fabricante, descricao, ncm")
      .eq("status", "ativo")
      .or(
        codigoVariacoes
          .map((v) => `nome.ilike.%${v}%,codigo.ilike.%${v}%,codigo_fabricante.ilike.%${v}%`)
          .join(",")
      )
      .limit(20);

    return produtosEncontrados || [];
  };

  // Buscar acessórios relacionados ao produto principal
  const buscarAcessorios = async (
    produtoPrincipalCodigo: string,
    nomeAcessorio: string
  ): Promise<any[]> => {
    if (!produtoPrincipalCodigo || !nomeAcessorio) return [];

    const nomeNormalizado = nomeAcessorio.toLowerCase();
    const palavrasChave = ["bateria", "carregador", "fonte", "cabo", "docking", "coldre", "cradle"];

    // Verificar se é um acessório genérico
    const isAcessorioGenerico = palavrasChave.some((palavra) =>
      nomeNormalizado.includes(palavra)
    );

    if (!isAcessorioGenerico) return [];

    // Buscar produtos que contenham o nome do acessório E o código do produto principal
    const { data: acessorios } = await supabase
      .from("products")
      .select("id, nome, codigo, codigo_fabricante, descricao, ncm")
      .eq("status", "ativo")
      .ilike("nome", `%${nomeNormalizado}%`)
      .or(`nome.ilike.%${produtoPrincipalCodigo}%,descricao.ilike.%${produtoPrincipalCodigo}%`)
      .limit(10);

    return acessorios || [];
  };

  const processItems = async () => {
    if (!extractedData?.items) return;

    // Identificar produto principal se houver
    const produtoPrincipal = extractedData.produto_principal;
    let produtoPrincipalEncontrado: any = null;
    let produtosPrincipaisCandidatos: any[] = [];

    if (produtoPrincipal?.codigo) {
      produtosPrincipaisCandidatos = await buscarProdutoPrincipal(produtoPrincipal.codigo);
      if (produtosPrincipaisCandidatos.length === 1) {
        produtoPrincipalEncontrado = produtosPrincipaisCandidatos[0];
      } else if (produtosPrincipaisCandidatos.length > 1) {
        // Usar similaridade para escolher o melhor
        const matches = await findProductMatches(
          produtoPrincipal.nome_completo || produtoPrincipal.codigo,
          produtoPrincipal.codigo,
          undefined,
          produtosPrincipaisCandidatos
        );
        if (matches.length > 0 && matches[0].score >= 80) {
          produtoPrincipalEncontrado = matches[0].product;
        }
      }
    }

    const processedItems = await Promise.all(
      extractedData.items.map(async (item: any) => {
        let match: any = null;

        // Se for produto principal identificado
        if (item.is_produto_principal && produtoPrincipalEncontrado) {
          match = {
            product: produtoPrincipalEncontrado,
            score: 100,
            matchType: "exact" as const,
            matchDetails: {
              partNumberScore: 100,
              textScore: 100,
              brandScore: 100,
              ncmScore: 50,
              explanation: "Produto principal identificado pela IA",
            },
          };
        }
        // Se for acessório do produto principal
        else if (item.is_acessorio && item.produto_principal_codigo) {
          const acessorios = await buscarAcessorios(
            item.produto_principal_codigo,
            item.descricao || item.nome_completo
          );
          
          if (acessorios.length === 1) {
            match = {
              product: acessorios[0],
              score: 95,
              matchType: "part_number" as const,
              matchDetails: {
                partNumberScore: 0,
                textScore: 95,
                brandScore: 50,
                ncmScore: 50,
                explanation: `Acessório para ${item.produto_principal_codigo} encontrado`,
              },
            };
          } else if (acessorios.length > 0) {
            // Usar similaridade para escolher o melhor acessório
            const matches = await findProductMatches(
              item.descricao || item.nome_completo,
              undefined,
              item.ncm,
              acessorios
            );
            if (matches.length > 0 && matches[0].score >= 70) {
              match = matches[0];
            }
          }
        }
        // Busca normal por part_number
        else if (item.part_number) {
          const productByPart = products.find(
            (p) => p.codigo_fabricante?.toLowerCase() === item.part_number.toLowerCase()
          );
          if (productByPart) {
            match = {
              product: productByPart,
              score: 100,
              matchType: "part_number" as const,
              matchDetails: {
                partNumberScore: 100,
                textScore: 0,
                brandScore: 50,
                ncmScore: 50,
                explanation: "Part Number correspondente encontrado",
              },
            };
          }
        }

        // Se não encontrou, usar fuzzy match
        if (!match) {
          match = await findBestProductMatch(
            item.descricao || item.nome_completo,
            item.part_number,
            item.ncm,
            products
          );
        }

        // Calcular valores convertidos
        // preco_unitario é sempre o valor ORIGINAL na moeda de origem
        const precoUnit = item.preco_unitario || 0;
        // valor_original deve ser igual a preco_unitario (valor na moeda de origem)
        const valorOriginal = precoUnit;
        // valor_convertido é o valor convertido para BRL
        const valorConvertido = extractedData.moeda === "USD" 
          ? precoUnit * dollarRate 
          : precoUnit;

        return {
          ...item,
          product_id: match?.product?.id || null,
          product_suggested: match?.product || null,
          match_score: match?.score || 0,
          needs_review: !match || match.score < 80,
          editing: false,
          valor_original: valorOriginal,
          valor_convertido: valorConvertido,
          custo_dolar: extractedData.moeda === "USD" ? precoUnit : precoUnit / dollarRate,
        };
      })
    );

    setItems(processedItems);
    
    // Verificar se há itens com matches bons para mostrar modal
    checkForAutoMatches(processedItems);
  };

  const checkForAutoMatches = async (processedItems: any[]) => {
    for (const item of processedItems) {
      if (!item.product_id && item.needs_review) {
        // Buscar todos os matches
        const allMatches = await findAllProductMatches(
          item.descricao,
          item.part_number,
          item.ncm,
          products,
          70 // threshold de 70%
        );
        
        if (allMatches.length > 0) {
          setItemWithMatches(item);
          setMatchesForItem(allMatches);
          setProductMatchModalOpen(true);
          break; // Mostrar apenas o primeiro
        }
      }
    }
  };

  const handleLinkProduct = async (productId: string) => {
    if (!itemToLinkProduct && !itemWithMatches) {
      console.error("❌ Nenhum item para vincular");
      toast.error("Erro: Item não encontrado");
      return;
    }
    
    const item = itemToLinkProduct || itemWithMatches;
    
    console.log("🔍 Buscando item no array:", {
      itemDescricao: item.descricao,
      itemPartNumber: item.part_number,
      itemsCount: items.length,
      itemSource: itemToLinkProduct ? "itemToLinkProduct" : "itemWithMatches",
    });
    
    // Buscar item por propriedades únicas (não por referência)
    // Comparar por descricao + part_number para encontrar o item correto
    let index = -1;
    
    // Primeiro tentar por referência direta (caso ainda seja o mesmo objeto)
    index = items.findIndex((i) => i === item);
    
    if (index !== -1) {
      console.log("✅ Item encontrado por referência no índice:", index);
    } else {
      console.log("⚠️ Item não encontrado por referência, tentando por propriedades...");
      
      // Se não encontrou, tentar por propriedades únicas
      index = items.findIndex((i) => {
        // Comparar por descricao e part_number (case-insensitive)
        const desc1 = (i.descricao || "").trim().toLowerCase();
        const desc2 = (item.descricao || "").trim().toLowerCase();
        const part1 = (i.part_number || "").trim().toLowerCase();
        const part2 = (item.part_number || "").trim().toLowerCase();
        
        // Match se descrição e part_number forem iguais
        const descMatch = desc1 === desc2 && desc1.length > 0;
        const partMatch = part1 === part2 && part1.length > 0;
        
        // Se ambos têm part_number, ambos devem bater
        // Se só um tem part_number, usar apenas descrição
        if (part1.length > 0 && part2.length > 0) {
          return descMatch && partMatch;
        } else {
          return descMatch;
        }
      });
      
      if (index !== -1) {
        console.log("✅ Item encontrado por propriedades no índice:", index);
      }
    }
    
    if (index === -1) {
      console.error("❌ Item não encontrado no array de itens", {
        itemDescricao: item.descricao,
        itemPartNumber: item.part_number,
        itemsCount: items.length,
        itemsDescriptions: items.map(i => i.descricao).slice(0, 3),
      });
      toast.error("Erro: Item não encontrado na lista");
      return;
    }
    
    console.log("✅ Item encontrado no índice:", index, {
      itemDescricao: item.descricao,
      itemPartNumber: item.part_number,
    });

    try {
      // Buscar produto localmente primeiro
      let product = products.find((p) => p.id === productId);
      
      // Se não encontrou localmente, buscar no Supabase
      if (!product) {
        console.log("🔍 Produto não encontrado localmente, buscando no Supabase...");
        const { data, error } = await supabase
          .from("products")
          .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
          .eq("id", productId)
          .eq("status", "ativo")
          .single();
        
        if (error) {
          console.error("❌ Erro ao buscar produto no Supabase:", error);
          toast.error("Erro ao buscar produto: " + error.message);
          return;
        }
        
        if (!data) {
          console.error("❌ Produto não encontrado no banco de dados");
          toast.error("Produto não encontrado no banco de dados");
          return;
        }
        
        product = data;
        console.log("✅ Produto encontrado no Supabase:", product.nome);
      } else {
        console.log("✅ Produto encontrado localmente:", product.nome);
      }
      
      // Atualizar item no estado
      const newItems = [...items];
      newItems[index].product_id = productId;
      newItems[index].product_suggested = product;
      newItems[index].needs_review = false;
      setItems(newItems);
      
      console.log("✅ Produto vinculado com sucesso:", {
        itemIndex: index,
        productId,
        productName: product.nome,
      });
      
      toast.success(`Produto "${product.nome}" vinculado com sucesso!`);
      
      // Fechar modais
      setProductLinkDialogOpen(false);
      setProductMatchModalOpen(false);
      setItemToLinkProduct(null);
      setItemWithMatches(null);
    } catch (error: any) {
      console.error("❌ Erro ao vincular produto:", error);
      toast.error("Erro ao vincular produto: " + (error.message || "Erro desconhecido"));
    }
  };

  const handleEditItem = (index: number) => {
    const newItems = [...items];
    newItems[index].editing = true;
    setItems(newItems);
  };

  const handleSaveItem = (index: number) => {
    const newItems = [...items];
    newItems[index].editing = false;
    
    const precoUnit = parseFloat(newItems[index].preco_unitario) || 0;
    const qty = parseFloat(newItems[index].quantidade) || 0;
    
    // Recalcular valores baseado na moeda
    if (extractedData?.moeda === "USD") {
      newItems[index].valor_original = precoUnit;
      newItems[index].valor_convertido = precoUnit * dollarRate;
      newItems[index].custo_dolar = precoUnit;
      // Total deve usar valor_convertido (em BRL)
      newItems[index].total = qty * (precoUnit * dollarRate);
    } else {
      newItems[index].valor_original = precoUnit;
      newItems[index].valor_convertido = precoUnit;
      // Total usa preco_unitario (já está em BRL)
      newItems[index].total = qty * precoUnit;
    }
    
    setItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    
    // Recalcular total se quantidade ou preço mudar
    if (field === "quantidade" || field === "preco_unitario") {
      const qty = parseFloat(newItems[index].quantidade) || 0;
      const price = parseFloat(newItems[index].preco_unitario) || 0;
      
      // Recalcular valores convertidos primeiro
      if (extractedData?.moeda === "USD") {
        newItems[index].valor_original = price;
        newItems[index].valor_convertido = price * dollarRate;
        newItems[index].custo_dolar = price;
        // Total deve usar valor_convertido (em BRL)
        newItems[index].total = qty * (price * dollarRate);
      } else {
        newItems[index].valor_original = price;
        newItems[index].valor_convertido = price;
        // Total usa preco_unitario (já está em BRL)
        newItems[index].total = qty * price;
      }
    }
    
    setItems(newItems);
  };

  const handleCreateProduct = (item: any) => {
    setItemToCreateProduct(item);
    setNewProductDialogOpen(true);
  };

  const handleEditProduct = (item: any) => {
    if (!item.product_id) return;
    const product = products.find((p) => p.id === item.product_id);
    if (!product) return;
    
    setItemToEditProduct({ ...item, product });
    setEditProductDialogOpen(true);
  };

  const handleProductCreated = async () => {
    if (!itemToCreateProduct) return;
    await loadProducts();
    
    setTimeout(async () => {
      await loadProducts();
      const { data: newProducts } = await supabase
        .from("products")
        .select("id, nome, codigo, codigo_fabricante")
        .eq("codigo_fabricante", itemToCreateProduct.part_number)
        .order("created_at", { ascending: false })
        .limit(1);

      if (newProducts && newProducts.length > 0) {
        const newProduct = newProducts[0];
        const index = items.findIndex((i) => i === itemToCreateProduct);
        if (index !== -1) {
          const newItems = [...items];
          newItems[index].product_id = newProduct.id;
          newItems[index].product_suggested = newProduct;
          newItems[index].needs_review = false;
          setItems(newItems);
        }
        toast.success("Produto criado e vinculado!");
      }
    }, 1000);

    setNewProductDialogOpen(false);
    setItemToCreateProduct(null);
  };

  const handleProductUpdated = async () => {
    await loadProducts();
    toast.success("Produto atualizado!");
    setEditProductDialogOpen(false);
    setItemToEditProduct(null);
  };

  const handleSupplierCreated = (supplierId: string) => {
    setSelectedSupplier(supplierId);
    loadSuppliers();
  };

  const handleDollarRateChange = (newRate: number) => {
    setDollarRate(newRate);
    // Recalcular todos os valores convertidos
    const newItems = items.map((item) => {
      if (extractedData?.moeda === "USD") {
        const precoUnit = item.preco_unitario || 0;
        return {
          ...item,
          valor_convertido: precoUnit * newRate,
          custo_dolar: precoUnit,
        };
      }
      return item;
    });
    setItems(newItems);
  };

  const handleSaveQuotes = async () => {
    if (!selectedSupplier) {
      toast.error("Selecione um fornecedor");
      return;
    }

    const unlinkedItems = items.filter((item) => !item.product_id);
    if (unlinkedItems.length > 0) {
      toast.error(
        `${unlinkedItems.length} item(ns) ainda não foram vinculados a produtos. Por favor, vincule todos os itens antes de salvar.`
      );
      return;
    }

    if (!extractedData?.moeda) {
      toast.error("Moeda não definida");
      return;
    }

    // Verificar se há cotação ativa do mesmo fornecedor
    const { data: existingCotacao } = await supabase
      .from("cotacoes_compras")
      .select(`
        id,
        numero_cotacao,
        quantidade_itens,
        supplier:suppliers(id, nome)
      `)
      .eq("supplier_id", selectedSupplier)
      .eq("status", "ativo")
      .maybeSingle();

    if (existingCotacao) {
      // Mostrar dialog de decisão
      setExistingCotacao(existingCotacao);
      setExistingCotacaoDialogOpen(true);
      return;
    }

    // Criar nova cotação
    await createNewCotacao();
  };

  const addItemsToExistingCotacao = async (cotacaoId: string) => {
    setLoading(true);
    try {
      const itemsToSave = items.map((item) => ({
        cotacao_id: cotacaoId,
        product_id: item.product_id,
        part_number: item.part_number || null,
        descricao: item.descricao,
        ncm: item.ncm || null,
        quantidade: item.quantidade,
        // CORRIGIDO: usar valor original, não convertido
        preco_unitario: item.valor_original !== null && item.valor_original !== undefined
          ? item.valor_original
          : (item.preco_unitario || 0),
        total: item.total || item.quantidade * (item.valor_convertido || item.preco_unitario),
        moeda: extractedData.moeda || "BRL",
        valor_original: item.valor_original !== null && item.valor_original !== undefined
          ? item.valor_original
          : (item.preco_unitario || 0),
        valor_convertido: item.valor_convertido !== null && item.valor_convertido !== undefined
          ? item.valor_convertido
          : (extractedData.moeda === "USD" && dollarRate
              ? (item.valor_original || item.preco_unitario || 0) * dollarRate
              : (item.valor_original || item.preco_unitario || 0)),
        custo_dolar: item.custo_dolar || null,
        imediato: item.imediato || false,
        status: item.needs_review ? "revisar" : "pendente",
        observacoes: `Adicionado via IA - ${new Date().toLocaleString("pt-BR")}`,
      }));

      const { error } = await supabase
        .from("cotacoes_compras_itens")
        .insert(itemsToSave);

      if (error) throw error;

      toast.success(`${itemsToSave.length} item(ns) adicionado(s) à cotação existente!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error adding items to existing cotacao:", error);
      toast.error(error.message || "Erro ao adicionar itens");
    } finally {
      setLoading(false);
    }
  };

  const createNewCotacao = async () => {
    setLoading(true);
    try {
      // Calcular total da cotação
      const totalCotacao = items.reduce(
        (sum, item) => sum + (item.total || item.quantidade * (item.valor_convertido || item.preco_unitario)),
        0
      );

      // Criar/buscar cliente final se detectado pela IA
      let finalClienteFinalId = clienteFinalId;
      if (extractedData.cliente_final && !finalClienteFinalId) {
        try {
          const clienteFinalData = extractedData.cliente_final;
          
          // Buscar cliente existente por CNPJ
          if (clienteFinalData.cnpj) {
            const { data: existingClient } = await supabase
              .from("clients")
              .select("id")
              .eq("cnpj", clienteFinalData.cnpj.replace(/\D/g, ""))
              .maybeSingle();
            
            if (existingClient) {
              finalClienteFinalId = existingClient.id;
              console.log("✅ Cliente final encontrado:", existingClient.id);
            } else {
              // Criar novo cliente final
              const { data: newClient, error: createError } = await supabase
                .from("clients")
                .insert({
                  nome: clienteFinalData.nome || "Cliente Final",
                  cnpj: clienteFinalData.cnpj.replace(/\D/g, ""),
                  contato_principal: clienteFinalData.nome || "",
                  email: "",
                  telefone: "",
                  endereco: clienteFinalData.endereco || "",
                  cidade: clienteFinalData.cidade || "",
                  estado: clienteFinalData.uf || clienteFinalData.estado || "",
                  cep: clienteFinalData.cep ? clienteFinalData.cep.replace(/\D/g, "") : "",
                  tipo: "cliente",
                  observacoes: `Cliente final cadastrado automaticamente via importação de cotação - ${new Date().toLocaleString("pt-BR")}`,
                })
                .select("id")
                .single();
              
              if (createError) {
                console.error("Erro ao criar cliente final:", createError);
              } else if (newClient) {
                finalClienteFinalId = newClient.id;
                console.log("✅ Cliente final criado:", newClient.id);
              }
            }
          }
        } catch (error) {
          console.error("Erro ao processar cliente final:", error);
        }
      }

      // Criar cabeçalho da cotação
      const cotacaoData: any = {
        supplier_id: selectedSupplier,
        moeda: extractedData.moeda || "BRL",
        taxa_cambio: extractedData.moeda === "USD" ? dollarRate : null,
        condicao_pagamento: extractedData.condicao_pagamento || null,
        prazo_entrega: null, // Pode ser preenchido depois
        data_cotacao: new Date().toISOString().split("T")[0],
        validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
        observacoes: `Importado via IA - ${new Date().toLocaleString("pt-BR")}`,
        distribuidor: extractedData.distribuidor || null,
        revenda: extractedData.revenda || null,
        transportadora: extractedData.transportadora || null,
        status: "ativo",
        total_cotacao: totalCotacao,
        quantidade_itens: items.length,
        // Campos de tipo de cotação
        tipo_cotacao: extractedData.tipo_cotacao || null,
        proposta_numero: extractedData.proposta_numero || null,
        pedido_numero: extractedData.pedido_numero || null,
        // Campos de cliente final
        cliente_final_id: finalClienteFinalId,
        nome_cliente_final: extractedData.cliente_final?.nome || null,
        cliente_final_cnpj: extractedData.cliente_final?.cnpj || null,
        cliente_final_endereco: extractedData.cliente_final?.endereco || null,
        cidade_cliente_final: extractedData.cliente_final?.cidade || null,
        estado_cliente_final: extractedData.cliente_final?.uf || extractedData.cliente_final?.estado || null,
      };

      const { data: cotacao, error: cotacaoError } = await supabase
        .from("cotacoes_compras")
        .insert(cotacaoData)
        .select()
        .single();

      if (cotacaoError) throw cotacaoError;

      // Criar itens da cotação
      const moeda = extractedData.moeda || "BRL";
      const taxaCambio = moeda === "USD" ? dollarRate : null;
      
      const itemsToSave = items.map((item) => {
        // IMPORTANTE: preco_unitario deve ser SEMPRE o valor ORIGINAL na moeda de origem
        // Se a moeda é USD, preco_unitario deve estar em USD (ex: 960.00, não 4800.00)
        // Se a moeda é BRL, preco_unitario deve estar em BRL
        
        // Priorizar valor_original se existir e for válido
        let precoUnitarioOriginal = item.valor_original;
        if (precoUnitarioOriginal === null || precoUnitarioOriginal === undefined || precoUnitarioOriginal <= 0) {
          // Se não há valor_original válido, usar preco_unitario
          precoUnitarioOriginal = item.preco_unitario || 0;
        }
        
        // VALIDAÇÃO: Se moeda é USD e preco_unitario parece ser um valor convertido (muito alto)
        // Tentar detectar e corrigir
        if (moeda === "USD" && taxaCambio && taxaCambio > 0 && precoUnitarioOriginal > 0) {
          // Se preco_unitario dividido pela taxa resulta em um valor "razoável" (entre 10 e 100000)
          // pode ser que foi salvo como convertido incorretamente
          const valorPossivelOriginal = precoUnitarioOriginal / taxaCambio;
          if (valorPossivelOriginal >= 10 && valorPossivelOriginal <= 100000) {
            // Verificar se o valor "revertido" faz mais sentido que o original
            // Se o valor original é muito maior que valores típicos em USD (ex: > 10000)
            // e o valor revertido está em faixa razoável, usar o revertido
            if (precoUnitarioOriginal > 10000 && valorPossivelOriginal < precoUnitarioOriginal) {
              console.warn(`[COTAÇÃO] Possível valor convertido incorretamente salvo como original. Item: ${item.descricao?.substring(0, 30)}, Valor original: ${precoUnitarioOriginal}, Valor revertido: ${valorPossivelOriginal}`);
              // Usar o valor revertido como original
              precoUnitarioOriginal = valorPossivelOriginal;
            }
          }
        }
        
        // Calcular valor_convertido sempre baseado no valor original correto
        let valorConvertidoBRL: number;
        if (moeda === "USD" && taxaCambio && taxaCambio > 0) {
          // Se moeda é USD, converter para BRL
          valorConvertidoBRL = precoUnitarioOriginal * taxaCambio;
        } else {
          // Se moeda é BRL, valor convertido é igual ao original
          valorConvertidoBRL = precoUnitarioOriginal;
        }
        
        // Calcular total usando valor convertido (em BRL)
        const totalItem = item.total || (item.quantidade * valorConvertidoBRL);
        
        return {
          cotacao_id: cotacao.id,
          product_id: item.product_id,
          part_number: item.part_number || null,
          descricao: item.descricao,
          ncm: item.ncm || null,
          quantidade: item.quantidade,
          // CORRIGIDO: usar valor original na moeda de origem (USD ou BRL)
          preco_unitario: precoUnitarioOriginal,
          total: totalItem,
          moeda: moeda,
          // CORRIGIDO: valor_original = preco_unitario (mesmo valor)
          valor_original: precoUnitarioOriginal,
          // CORRIGIDO: valor convertido calculado corretamente
          valor_convertido: valorConvertidoBRL,
          custo_dolar: moeda === "USD" ? precoUnitarioOriginal : (precoUnitarioOriginal / (taxaCambio || 1)),
          imediato: item.imediato || false,
          status: item.needs_review ? "revisar" : "pendente",
          observacoes: null,
        };
      });

      const { error: itemsError } = await supabase
        .from("cotacoes_compras_itens")
        .insert(itemsToSave);

      if (itemsError) throw itemsError;

      toast.success(`Cotação ${cotacao.numero_cotacao} criada com ${items.length} item(ns)!`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error creating cotacao:", error);
      toast.error(error.message || "Erro ao criar cotação");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number, currency: string = "BRL") => {
    const symbol = currency === "USD" ? "US$" : "R$";
    return `${symbol} ${value.toLocaleString("pt-BR", {
      minimumFractionDigits: 2,
    })}`;
  };

  const getItemStatus = (item: any) => {
    if (!item.product_id) {
      return { label: "Não vinculado", variant: "destructive" as const, icon: AlertTriangle };
    }
    if (item.imediato) {
      return { label: "Imediato", variant: "default" as const, icon: Zap };
    }
    if (item.needs_review) {
      return { label: "Revisar", variant: "destructive" as const, icon: AlertTriangle };
    }
    return { label: "Bom para salvar", variant: "default" as const, icon: CheckCircle2, className: "bg-green-600 hover:bg-green-700" };
  };

  const unlinkedCount = items.filter((i) => !i.product_id).length;
  const linkedCount = items.filter((i) => i.product_id).length;
  const totalBRL = items.reduce(
    (sum, item) => sum + (item.valor_convertido || item.total || 0),
    0
  );
  const totalOriginal = items.reduce(
    (sum, item) => sum + (item.total || 0),
    0
  );

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5" />
              Revisar e Salvar Cotação
            </DialogTitle>
            <DialogDescription>
              Revise os itens extraídos, vincule produtos e salve as cotações
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Informações gerais */}
            <Card className="p-4">
              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Fornecedor *</Label>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuickSupplierDialogOpen(true)}
                      className="h-6 text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Novo
                    </Button>
                  </div>
                  <Select
                    value={selectedSupplier}
                    onValueChange={setSelectedSupplier}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o fornecedor" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Moeda</Label>
                  <Input
                    value={extractedData?.moeda || "BRL"}
                    disabled
                    className="bg-muted"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Taxa de Câmbio</Label>
                  {extractedData?.moeda === "USD" ? (
                    <Input
                      type="number"
                      step="0.0001"
                      value={dollarRate}
                      onChange={(e) => handleDollarRateChange(parseFloat(e.target.value) || 5.0)}
                      className="bg-background"
                    />
                  ) : (
                    <Input value="-" disabled className="bg-muted" />
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Total {extractedData?.moeda || "BRL"}</Label>
                  <Input
                    value={formatCurrency(totalOriginal, extractedData?.moeda)}
                    disabled
                    className="bg-muted font-semibold"
                  />
                  {extractedData?.moeda === "USD" && (
                    <p className="text-xs text-muted-foreground">
                      {formatCurrency(totalBRL, "BRL")} convertido
                    </p>
                  )}
                </div>
              </div>
            </Card>

            {/* Cliente Final (Faturamento Direto) */}
            {extractedData?.faturamento_direto && extractedData?.cliente_final && (
              <Card className="p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Cliente Final (Detectado)
                  </h3>
                  {clienteFinalStatus === "cadastrado" ? (
                    <Badge variant="default" className="bg-green-600">
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Cadastrado
                    </Badge>
                  ) : clienteFinalStatus === "nao_cadastrado" ? (
                    <Badge variant="destructive">
                      <AlertTriangle className="h-3 w-3 mr-1" />
                      Não cadastrado
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Verificando...</Badge>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs text-muted-foreground">Nome</Label>
                    <p className="font-medium">{clienteFinal?.nome || extractedData.cliente_final.nome || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">CNPJ</Label>
                    <p className="font-medium">{clienteFinal?.cnpj || extractedData.cliente_final.cnpj || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Endereço</Label>
                    <p className="text-sm">{clienteFinal?.endereco || extractedData.cliente_final.endereco || "—"}</p>
                  </div>
                  <div>
                    <Label className="text-xs text-muted-foreground">Cidade / UF</Label>
                    <p className="text-sm">
                      {clienteFinal?.cidade || extractedData.cliente_final.cidade || "—"} /{" "}
                      {clienteFinal?.uf || clienteFinal?.estado || extractedData.cliente_final.uf || "—"}
                    </p>
                  </div>
                </div>
                {clienteFinalStatus === "nao_cadastrado" && (
                  <div className="mt-4">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setClienteFinalDialogOpen(true)}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Cadastrar Cliente
                    </Button>
                  </div>
                )}
              </Card>
            )}

            {/* Alerta de itens não vinculados */}
            {unlinkedCount > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {unlinkedCount} item(ns) não vinculado(s). Por favor, vincule todos os itens antes de salvar.
                </AlertDescription>
              </Alert>
            )}

            {/* Tabela de itens */}
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Part #</TableHead>
                    <TableHead>NCM</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(() => {
                    // Agrupar itens por produto principal
                    const produtoPrincipal = extractedData?.produto_principal;
                    const produtoPrincipalCodigo = produtoPrincipal?.codigo || "";
                    
                    // Separar produto principal e acessórios
                    const produtoPrincipalItem = items.find(
                      (i) => i.is_produto_principal && i.produto_principal_codigo === produtoPrincipalCodigo
                    );
                    const acessorios = items.filter(
                      (i) => i.is_acessorio && i.produto_principal_codigo === produtoPrincipalCodigo
                    );
                    const outrosItens = items.filter(
                      (i) => !i.is_produto_principal && !i.is_acessorio
                    );

                    const itemsToRender: any[] = [];

                    // Adicionar produto principal primeiro (se houver)
                    if (produtoPrincipalItem) {
                      const principalIndex = items.findIndex((i) => i === produtoPrincipalItem);
                      itemsToRender.push({ ...produtoPrincipalItem, isGroupHeader: false, originalIndex: principalIndex });
                      // Adicionar acessórios após o principal
                      acessorios.forEach((acessorio) => {
                        const acessorioIndex = items.findIndex((i) => i === acessorio);
                        itemsToRender.push({ ...acessorio, isGroupHeader: false, isAcessorio: true, originalIndex: acessorioIndex });
                      });
                    }
                    // Adicionar outros itens
                    outrosItens.forEach((item) => {
                      const itemIndex = items.findIndex((i) => i === item);
                      itemsToRender.push({ ...item, isGroupHeader: false, originalIndex: itemIndex });
                    });

                    return itemsToRender.map((item, displayIndex) => {
                      const originalIndex = item.originalIndex ?? displayIndex;
                      const status = getItemStatus(item);
                      const StatusIcon = status.icon;
                      const isAcessorio = item.isAcessorio;
                      const isProdutoPrincipal = item.is_produto_principal;
                      
                      return (
                        <TableRow 
                          key={originalIndex}
                          className={isAcessorio ? "bg-muted/30 border-l-4 border-l-blue-400" : isProdutoPrincipal ? "bg-blue-50/50 font-semibold" : ""}
                        >
                          <TableCell>
                            <div className={isAcessorio ? "pl-6 flex items-center gap-2" : "flex items-center gap-2"}>
                              {isAcessorio && (
                                <span className="text-blue-500">└─</span>
                              )}
                              {isProdutoPrincipal && (
                                <Badge className="bg-blue-500 text-white text-xs mr-2">
                                  Produto Principal
                                </Badge>
                              )}
                              {isAcessorio && (
                                <Badge variant="outline" className="text-xs bg-blue-50 border-blue-300">
                                  Acessório {item.produto_principal_codigo}
                                </Badge>
                              )}
                              {item.editing ? (
                                <Input
                                  value={item.descricao}
                                  onChange={(e) =>
                                    handleItemChange(originalIndex, "descricao", e.target.value)
                                  }
                                  className="w-full"
                                />
                              ) : (
                                <div>
                                  <p className={`font-medium ${isAcessorio ? "text-sm" : ""}`}>
                                    {item.nome_completo || item.descricao}
                                  </p>
                                  {item.product_suggested && !item.product_id && (
                                    <Badge variant="outline" className="mt-1 text-xs">
                                      Sugerido: {item.product_suggested.nome}
                                    </Badge>
                                  )}
                                  {item.product_id && (
                                    <Badge variant="default" className="mt-1 text-xs bg-green-500">
                                      Vinculado: {item.product_suggested?.nome || "Produto"}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </TableCell>
                        <TableCell>
                          {item.editing ? (
                            <Input
                              value={item.part_number || ""}
                              onChange={(e) =>
                                handleItemChange(originalIndex, "part_number", e.target.value)
                              }
                              className="w-full"
                            />
                          ) : (
                            <span className="text-sm font-mono">
                              {item.part_number || "-"}
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          {item.editing ? (
                            <Input
                              value={item.ncm || ""}
                              onChange={(e) =>
                                handleItemChange(originalIndex, "ncm", e.target.value)
                              }
                              className="w-full"
                            />
                          ) : (
                            <span className="text-sm font-mono">{item.ncm || "-"}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.editing ? (
                              <Input
                                type="number"
                                value={item.quantidade}
                                onChange={(e) =>
                                  handleItemChange(
                                    originalIndex,
                                    "quantidade",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-20 ml-auto"
                              />
                          ) : (
                            item.quantidade
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {item.editing ? (
                            <Input
                              type="number"
                              step="0.01"
                              value={item.preco_unitario}
                              onChange={(e) =>
                                handleItemChange(
                                  originalIndex,
                                  "preco_unitario",
                                  parseFloat(e.target.value) || 0
                                )
                              }
                              className="w-32 ml-auto"
                            />
                          ) : (
                            <div>
                              <p>
                                {formatCurrency(
                                  item.valor_original || item.preco_unitario,
                                  extractedData?.moeda
                                )}
                              </p>
                              {extractedData?.moeda === "USD" && (
                                <p className="text-xs text-muted-foreground">
                                  {formatCurrency(item.valor_convertido, "BRL")}
                                </p>
                              )}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          {formatCurrency(item.total || 0, extractedData?.moeda)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={status.variant}
                            className={`gap-1 ${status.className || ""}`}
                          >
                            <StatusIcon className="h-3 w-3" />
                            {status.label}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            {item.editing ? (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleSaveItem(originalIndex)}
                              >
                                <Save className="h-4 w-4" />
                              </Button>
                            ) : (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditItem(originalIndex)}
                                  title="Editar item"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                {!item.product_id ? (
                                  <>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => {
                                        setItemToLinkProduct(item);
                                        setProductLinkDialogOpen(true);
                                      }}
                                      title="Vincular produto"
                                    >
                                      <Link2 className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleCreateProduct(item)}
                                      title="Cadastrar novo produto"
                                    >
                                      <Plus className="h-4 w-4" />
                                    </Button>
                                  </>
                                ) : (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleEditProduct(item)}
                                    title="Editar produto"
                                  >
                                    <Package className="h-4 w-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                    });
                  })()}
                </TableBody>
              </Table>
            </div>

            {/* Rodapé com estatísticas */}
            <Card className="p-4">
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Total de Itens</p>
                  <p className="text-2xl font-bold">{items.length}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Vinculados</p>
                  <p className="text-2xl font-bold text-green-600">{linkedCount}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Não Vinculados</p>
                  <p className="text-2xl font-bold text-red-600">{unlinkedCount}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Valor Total</p>
                  <p className="text-2xl font-bold">
                    {formatCurrency(totalOriginal, extractedData?.moeda)}
                  </p>
                  {extractedData?.moeda === "USD" && (
                    <p className="text-sm text-muted-foreground">
                      {formatCurrency(totalBRL, "BRL")}
                    </p>
                  )}
                </div>
              </div>
              {unlinkedCount > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      // Tentar vincular automaticamente os itens restantes
                      toast.info("Funcionalidade de vinculação automática em desenvolvimento");
                    }}
                  >
                    Vincular {unlinkedCount} item(ns) automaticamente
                  </Button>
                </div>
              )}
            </Card>

            {/* Botões */}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button 
                onClick={handleSaveQuotes} 
                disabled={loading || unlinkedCount > 0 || !selectedSupplier || !extractedData?.moeda}
                title={
                  !selectedSupplier 
                    ? "Selecione um fornecedor" 
                    : !extractedData?.moeda 
                    ? "Moeda não definida"
                    : unlinkedCount > 0 
                    ? `${unlinkedCount} item(ns) não vinculado(s)`
                    : "Salvar cotação"
                }
              >
                {loading ? "Salvando..." : "Salvar Cotação no Sistema"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modals */}
      {itemToCreateProduct && (
        <ProdutoFormDialog
          open={newProductDialogOpen}
          onOpenChange={(open) => {
            setNewProductDialogOpen(open);
            if (!open) {
              setItemToCreateProduct(null);
            }
          }}
          product={{
            nome: itemToCreateProduct.descricao,
            codigo_fabricante: itemToCreateProduct.part_number,
            ncm: itemToCreateProduct.ncm,
            custo_dolar:
              extractedData?.moeda === "USD"
                ? itemToCreateProduct.preco_unitario
                : null,
            moeda_preferencial: extractedData?.moeda || "BRL",
            categoria: "",
            tipo: "venda",
          }}
          onClose={handleProductCreated}
        />
      )}

      {itemToEditProduct && itemToEditProduct.product && itemToEditProduct.product.id && (
        <ProdutoFormDialog
          open={editProductDialogOpen}
          onOpenChange={(open) => {
            setEditProductDialogOpen(open);
            if (!open) {
              setItemToEditProduct(null);
            }
          }}
          product={itemToEditProduct.product}
          onClose={handleProductUpdated}
        />
      )}

      <QuickSupplierDialog
        open={quickSupplierDialogOpen}
        onOpenChange={setQuickSupplierDialogOpen}
        onSuccess={handleSupplierCreated}
      />

      <ProductLinkDialog
        open={productLinkDialogOpen}
        onOpenChange={setProductLinkDialogOpen}
        item={itemToLinkProduct}
        products={products}
        onLink={handleLinkProduct}
      />

      {itemWithMatches && (
        <ProductMatchModal
          open={productMatchModalOpen}
          onOpenChange={setProductMatchModalOpen}
          item={itemWithMatches}
          matches={matchesForItem}
          onLink={handleLinkProduct}
          onViewOthers={() => {
            setProductMatchModalOpen(false);
            setItemToLinkProduct(itemWithMatches);
            setProductLinkDialogOpen(true);
          }}
          onSkip={() => {
            setProductMatchModalOpen(false);
            setItemWithMatches(null);
            setMatchesForItem([]);
          }}
        />
      )}

      {existingCotacao && (
        <AddToExistingCotacaoDialog
          open={existingCotacaoDialogOpen}
          onOpenChange={setExistingCotacaoDialogOpen}
          cotacao={existingCotacao}
          onAddToExisting={async () => {
            setExistingCotacaoDialogOpen(false);
            await addItemsToExistingCotacao(existingCotacao.id);
          }}
          onCreateNew={async () => {
            setExistingCotacaoDialogOpen(false);
            setExistingCotacao(null);
            await createNewCotacao();
          }}
        />
      )}

      {clienteFinal && clienteFinalStatus === "nao_cadastrado" && (
        <ClienteFinalDialog
          open={clienteFinalDialogOpen}
          onOpenChange={setClienteFinalDialogOpen}
          clienteData={clienteFinal}
          onCadastrarAutomatico={handleCadastrarClienteAutomatico}
          onCadastrarManual={handleCadastrarClienteManual}
          onPular={handlePularCliente}
        />
      )}
    </>
  );
}
