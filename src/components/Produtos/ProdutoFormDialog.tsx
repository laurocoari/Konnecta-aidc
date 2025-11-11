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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Package, DollarSign, FileText, Link2 } from "lucide-react";

interface ProdutoFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: any;
  onClose: () => void;
}

export function ProdutoFormDialog({
  open,
  onOpenChange,
  product,
  onClose,
}: ProdutoFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<any[]>([]);
  const [formData, setFormData] = useState<any>({
    codigo: "",
    nome: "",
    categoria: "",
    tipo: "venda",
    descricao: "",
    imagem_principal: "",
    brand_id: "",
    valor_custo: "",
    margem_lucro: "",
    valor_venda: "",
    valor_locacao: "",
    unidade: "un",
    estoque_atual: 0,
    estoque_minimo: 0,
    localizacao: "",
    ncm: "",
    ean: "",
    cfop: "",
    cst: "",
    origem: "0",
    icms: "",
    ipi: "",
    pis: "",
    cofins: "",
    observacoes_fiscais: "",
    status: "ativo",
  });

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (product) {
      setFormData({
        codigo: product.codigo || "",
        nome: product.nome || "",
        categoria: product.categoria || "",
        tipo: product.tipo || "venda",
        descricao: product.descricao || "",
        imagem_principal: product.imagem_principal || "",
        brand_id: product.brand_id || "",
        valor_custo: product.valor_custo || "",
        margem_lucro: product.margem_lucro || "",
        valor_venda: product.valor_venda || "",
        valor_locacao: product.valor_locacao || "",
        unidade: product.unidade || "un",
        estoque_atual: product.estoque_atual || 0,
        estoque_minimo: product.estoque_minimo || 0,
        localizacao: product.localizacao || "",
        ncm: product.ncm || "",
        ean: product.ean || "",
        cfop: product.cfop || "",
        cst: product.cst || "",
        origem: product.origem || "0",
        icms: product.icms || "",
        ipi: product.ipi || "",
        pis: product.pis || "",
        cofins: product.cofins || "",
        observacoes_fiscais: product.observacoes_fiscais || "",
        status: product.status || "ativo",
      });
    } else {
      // Reset form
      setFormData({
        codigo: "",
        nome: "",
        categoria: "",
        tipo: "venda",
        descricao: "",
        imagem_principal: "",
        brand_id: "",
        valor_custo: "",
        margem_lucro: "",
        valor_venda: "",
        valor_locacao: "",
        unidade: "un",
        estoque_atual: 0,
        estoque_minimo: 0,
        localizacao: "",
        ncm: "",
        ean: "",
        cfop: "",
        cst: "",
        origem: "0",
        icms: "",
        ipi: "",
        pis: "",
        cofins: "",
        observacoes_fiscais: "",
        status: "ativo",
      });
    }
  }, [product, open]);

  const loadBrands = async () => {
    try {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .eq("status", "ativa")
        .order("nome", { ascending: true });

      if (error) throw error;
      setBrands(data || []);
    } catch (error: any) {
      console.error("Error loading brands:", error);
    }
  };

  const calculateValorVenda = (custo: number, margem: number) => {
    if (custo && margem) {
      const venda = custo * (1 + margem / 100);
      setFormData((prev: any) => ({
        ...prev,
        valor_venda: venda.toFixed(2),
      }));
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({
      ...prev,
      [field]: value,
    }));

    // Auto-calculate valor_venda when custo or margem changes
    if (field === "valor_custo" || field === "margem_lucro") {
      const custo = field === "valor_custo" ? parseFloat(value) : parseFloat(formData.valor_custo);
      const margem = field === "margem_lucro" ? parseFloat(value) : parseFloat(formData.margem_lucro);
      if (custo && margem) {
        calculateValorVenda(custo, margem);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        valor_custo: formData.valor_custo ? parseFloat(formData.valor_custo) : null,
        margem_lucro: formData.margem_lucro ? parseFloat(formData.margem_lucro) : null,
        valor_venda: formData.valor_venda ? parseFloat(formData.valor_venda) : null,
        valor_locacao: formData.valor_locacao ? parseFloat(formData.valor_locacao) : null,
        estoque_atual: parseInt(formData.estoque_atual) || 0,
        estoque_minimo: parseInt(formData.estoque_minimo) || 0,
        icms: formData.icms ? parseFloat(formData.icms) : null,
        ipi: formData.ipi ? parseFloat(formData.ipi) : null,
        pis: formData.pis ? parseFloat(formData.pis) : null,
        cofins: formData.cofins ? parseFloat(formData.cofins) : null,
      };

      if (product) {
        // Update existing product
        const { error } = await supabase
          .from("products")
          .update(dataToSave)
          .eq("id", product.id);

        if (error) throw error;
        toast.success("Produto atualizado com sucesso!");
      } else {
        // Create new product
        const { error } = await supabase.from("products").insert(dataToSave);

        if (error) throw error;
        toast.success("Produto cadastrado com sucesso!");
      }

      onClose();
    } catch (error: any) {
      console.error("Error saving product:", error);
      toast.error(error.message || "Erro ao salvar produto");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{product ? "Editar Produto" : "Novo Produto"}</DialogTitle>
          <DialogDescription>
            Preencha os dados do produto organizados por categoria
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <Tabs defaultValue="geral" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="geral" className="gap-2">
                <Package className="h-4 w-4" />
                Dados Gerais
              </TabsTrigger>
              <TabsTrigger value="comercial" className="gap-2">
                <DollarSign className="h-4 w-4" />
                Comercial
              </TabsTrigger>
              <TabsTrigger value="fiscal" className="gap-2">
                <FileText className="h-4 w-4" />
                Fiscal
              </TabsTrigger>
              <TabsTrigger value="integracoes" className="gap-2">
                <Link2 className="h-4 w-4" />
                Integrações
              </TabsTrigger>
            </TabsList>

            <TabsContent value="geral" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="codigo">Código Interno *</Label>
                  <Input
                    id="codigo"
                    value={formData.codigo}
                    onChange={(e) => handleChange("codigo", e.target.value)}
                    placeholder="PRD-001"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome do Produto *</Label>
                  <Input
                    id="nome"
                    value={formData.nome}
                    onChange={(e) => handleChange("nome", e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="categoria">Categoria *</Label>
                  <Input
                    id="categoria"
                    value={formData.categoria}
                    onChange={(e) => handleChange("categoria", e.target.value)}
                    placeholder="Hardware, Equipamento, Software..."
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="brand_id">Marca</Label>
                  <Select value={formData.brand_id} onValueChange={(value) => handleChange("brand_id", value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a marca (opcional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {brands.map((brand) => (
                        <SelectItem key={brand.id} value={brand.id}>
                          {brand.nome}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tipo">Tipo *</Label>
                  <Select value={formData.tipo} onValueChange={(value) => handleChange("tipo", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="venda">Venda</SelectItem>
                      <SelectItem value="locacao">Locação</SelectItem>
                      <SelectItem value="ambos">Ambos</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="descricao">Descrição Detalhada</Label>
                <Textarea
                  id="descricao"
                  value={formData.descricao}
                  onChange={(e) => handleChange("descricao", e.target.value)}
                  rows={4}
                  placeholder="Descrição completa do produto..."
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="imagem_principal">URL da Imagem Principal</Label>
                <Input
                  id="imagem_principal"
                  value={formData.imagem_principal}
                  onChange={(e) => handleChange("imagem_principal", e.target.value)}
                  placeholder="https://..."
                />
              </div>
            </TabsContent>

            <TabsContent value="comercial" className="space-y-4 mt-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_custo">Valor de Custo (R$)</Label>
                  <Input
                    id="valor_custo"
                    type="number"
                    step="0.01"
                    value={formData.valor_custo}
                    onChange={(e) => handleChange("valor_custo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="margem_lucro">Margem de Lucro (%)</Label>
                  <Input
                    id="margem_lucro"
                    type="number"
                    step="0.01"
                    value={formData.margem_lucro}
                    onChange={(e) => handleChange("margem_lucro", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_venda">Valor de Venda (R$)</Label>
                  <Input
                    id="valor_venda"
                    type="number"
                    step="0.01"
                    value={formData.valor_venda}
                    onChange={(e) => handleChange("valor_venda", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="valor_locacao">Valor de Locação Mensal (R$)</Label>
                  <Input
                    id="valor_locacao"
                    type="number"
                    step="0.01"
                    value={formData.valor_locacao}
                    onChange={(e) => handleChange("valor_locacao", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unidade">Unidade de Medida</Label>
                  <Select value={formData.unidade} onValueChange={(value) => handleChange("unidade", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="un">Unidade</SelectItem>
                      <SelectItem value="cx">Caixa</SelectItem>
                      <SelectItem value="kg">Quilograma</SelectItem>
                      <SelectItem value="pç">Peça</SelectItem>
                      <SelectItem value="m">Metro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="estoque_atual">Estoque Atual</Label>
                  <Input
                    id="estoque_atual"
                    type="number"
                    value={formData.estoque_atual}
                    onChange={(e) => handleChange("estoque_atual", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="estoque_minimo">Estoque Mínimo</Label>
                  <Input
                    id="estoque_minimo"
                    type="number"
                    value={formData.estoque_minimo}
                    onChange={(e) => handleChange("estoque_minimo", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="localizacao">Localização Física</Label>
                  <Input
                    id="localizacao"
                    value={formData.localizacao}
                    onChange={(e) => handleChange("localizacao", e.target.value)}
                    placeholder="Armazém A, Prateleira 3..."
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Situação</Label>
                <Select value={formData.status} onValueChange={(value) => handleChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ativo">Ativo</SelectItem>
                    <SelectItem value="inativo">Inativo</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="fiscal" className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ncm">Código NCM</Label>
                  <Input
                    id="ncm"
                    value={formData.ncm}
                    onChange={(e) => handleChange("ncm", e.target.value)}
                    placeholder="8471.60.52"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ean">Código EAN / Código de Barras</Label>
                  <Input
                    id="ean"
                    value={formData.ean}
                    onChange={(e) => handleChange("ean", e.target.value)}
                    placeholder="7891234567890"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cfop">CFOP</Label>
                  <Input
                    id="cfop"
                    value={formData.cfop}
                    onChange={(e) => handleChange("cfop", e.target.value)}
                    placeholder="5102"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cst">CST / CSOSN</Label>
                  <Input
                    id="cst"
                    value={formData.cst}
                    onChange={(e) => handleChange("cst", e.target.value)}
                    placeholder="00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="origem">Origem</Label>
                  <Select value={formData.origem} onValueChange={(value) => handleChange("origem", value)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="0">0 - Nacional</SelectItem>
                      <SelectItem value="1">1 - Estrangeira (Importação direta)</SelectItem>
                      <SelectItem value="2">2 - Estrangeira (Adquirida no mercado interno)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="icms">ICMS (%)</Label>
                  <Input
                    id="icms"
                    type="number"
                    step="0.01"
                    value={formData.icms}
                    onChange={(e) => handleChange("icms", e.target.value)}
                    placeholder="18.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ipi">IPI (%)</Label>
                  <Input
                    id="ipi"
                    type="number"
                    step="0.01"
                    value={formData.ipi}
                    onChange={(e) => handleChange("ipi", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pis">PIS (%)</Label>
                  <Input
                    id="pis"
                    type="number"
                    step="0.01"
                    value={formData.pis}
                    onChange={(e) => handleChange("pis", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cofins">COFINS (%)</Label>
                  <Input
                    id="cofins"
                    type="number"
                    step="0.01"
                    value={formData.cofins}
                    onChange={(e) => handleChange("cofins", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="observacoes_fiscais">Observações Fiscais</Label>
                <Textarea
                  id="observacoes_fiscais"
                  value={formData.observacoes_fiscais}
                  onChange={(e) => handleChange("observacoes_fiscais", e.target.value)}
                  rows={3}
                />
              </div>
            </TabsContent>

            <TabsContent value="integracoes" className="space-y-4 mt-4">
              <div className="text-center py-8 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Funcionalidade de integrações em desenvolvimento</p>
                <p className="text-sm mt-2">
                  Em breve: vinculação com fornecedores, histórico de compras e movimentações
                </p>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex justify-end gap-2 mt-6 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : product ? "Atualizar" : "Cadastrar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
