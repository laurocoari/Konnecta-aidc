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
import { Package, DollarSign, FileText, Image, Video, Plus, Trash2, Upload } from "lucide-react";

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
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState<any>({
    codigo: "",
    nome: "",
    categoria: "",
    tipo: "venda",
    descricao: "",
    imagem_principal: "",
    galeria: [],
    brand_id: "",
    custo_medio: "",
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
    especificacoes: [],
    videos: [],
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
        galeria: product.galeria || [],
        brand_id: product.brand_id || "",
        custo_medio: product.custo_medio || "",
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
        especificacoes: product.especificacoes || [],
        videos: product.videos || [],
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
        galeria: [],
        brand_id: "",
        custo_medio: "",
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
        especificacoes: [],
        videos: [],
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
    if (field === "custo_medio" || field === "margem_lucro") {
      const custo = field === "custo_medio" ? parseFloat(value) : parseFloat(formData.custo_medio);
      const margem = field === "margem_lucro" ? parseFloat(value) : parseFloat(formData.margem_lucro);
      if (custo && margem) {
        calculateValorVenda(custo, margem);
      }
    }
  };

  const handleFileUpload = async (file: File, type: 'image' | 'video') => {
    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${type}s/${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('product-media')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('product-media')
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao fazer upload do arquivo');
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleFileUpload(file, 'image');
    if (url) {
      setFormData((prev: any) => ({
        ...prev,
        galeria: [...(prev.galeria || []), url],
      }));
      toast.success('Imagem adicionada à galeria');
    }
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = await handleFileUpload(file, 'video');
    if (url) {
      setFormData((prev: any) => ({
        ...prev,
        videos: [...(prev.videos || []), { tipo: 'upload', url, titulo: file.name }],
      }));
      toast.success('Vídeo adicionado com sucesso');
    }
  };

  const addYoutubeVideo = () => {
    const url = prompt('Cole o link do vídeo do YouTube:');
    if (url) {
      setFormData((prev: any) => ({
        ...prev,
        videos: [...(prev.videos || []), { tipo: 'youtube', url, titulo: 'Vídeo do YouTube' }],
      }));
    }
  };

  const addSpecification = () => {
    setFormData((prev: any) => ({
      ...prev,
      especificacoes: [...(prev.especificacoes || []), { nome: '', valor: '' }],
    }));
  };

  const updateSpecification = (index: number, field: 'nome' | 'valor', value: string) => {
    const newSpecs = [...formData.especificacoes];
    newSpecs[index][field] = value;
    setFormData((prev: any) => ({ ...prev, especificacoes: newSpecs }));
  };

  const removeSpecification = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      especificacoes: prev.especificacoes.filter((_: any, i: number) => i !== index),
    }));
  };

  const removeImage = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      galeria: prev.galeria.filter((_: any, i: number) => i !== index),
    }));
  };

  const removeVideo = (index: number) => {
    setFormData((prev: any) => ({
      ...prev,
      videos: prev.videos.filter((_: any, i: number) => i !== index),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const dataToSave = {
        ...formData,
        custo_medio: formData.custo_medio ? parseFloat(formData.custo_medio) : null,
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
              <TabsTrigger value="midia" className="gap-2">
                <Image className="h-4 w-4" />
                Mídia & Especificações
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
                  <Label htmlFor="custo_medio">Custo Médio (R$)</Label>
                  <Input
                    id="custo_medio"
                    type="number"
                    step="0.01"
                    value={formData.custo_medio}
                    onChange={(e) => handleChange("custo_medio", e.target.value)}
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

            <TabsContent value="midia" className="space-y-6 mt-4">
              {/* Galeria de Imagens */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Image className="h-4 w-4" />
                    Galeria de Fotos
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => document.getElementById('image-upload')?.click()}
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? 'Enviando...' : 'Upload Foto'}
                  </Button>
                  <input
                    id="image-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                  />
                </div>
                <div className="grid grid-cols-4 gap-3">
                  {formData.galeria?.map((url: string, index: number) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Produto ${index + 1}`}
                        className="w-full h-24 object-cover rounded border"
                      />
                      <Button
                        type="button"
                        variant="destructive"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => removeImage(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
                {formData.galeria?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma imagem adicionada
                  </p>
                )}
              </div>

              {/* Vídeos */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <Video className="h-4 w-4" />
                    Vídeos do Produto
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addYoutubeVideo}
                    >
                      YouTube
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => document.getElementById('video-upload')?.click()}
                      disabled={uploading}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {uploading ? 'Enviando...' : 'Upload Vídeo'}
                    </Button>
                  </div>
                  <input
                    id="video-upload"
                    type="file"
                    accept="video/*"
                    className="hidden"
                    onChange={handleVideoUpload}
                  />
                </div>
                <div className="space-y-2">
                  {formData.videos?.map((video: any, index: number) => (
                    <div key={index} className="flex items-center gap-2 p-3 border rounded">
                      <Video className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{video.titulo}</p>
                        <p className="text-xs text-muted-foreground truncate">{video.url}</p>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVideo(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {formData.videos?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhum vídeo adicionado
                  </p>
                )}
              </div>

              {/* Especificações Técnicas */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-semibold flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Especificações Técnicas
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addSpecification}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar
                  </Button>
                </div>
                <div className="space-y-2">
                  {formData.especificacoes?.map((spec: any, index: number) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        placeholder="Nome (ex: Processador)"
                        value={spec.nome}
                        onChange={(e) => updateSpecification(index, 'nome', e.target.value)}
                        className="flex-1"
                      />
                      <Input
                        placeholder="Valor (ex: Intel Core i7)"
                        value={spec.valor}
                        onChange={(e) => updateSpecification(index, 'valor', e.target.value)}
                        className="flex-1"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeSpecification(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                {formData.especificacoes?.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    Nenhuma especificação adicionada
                  </p>
                )}
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
