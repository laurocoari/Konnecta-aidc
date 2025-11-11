import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];
type Brand = Database["public"]["Tables"]["brands"]["Row"];

interface FornecedorFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fornecedor?: Supplier | null;
  onSuccess: () => void;
}

export default function FornecedorFormDialog({
  open,
  onOpenChange,
  fornecedor,
  onSuccess,
}: FornecedorFormDialogProps) {
  const [loading, setLoading] = useState(false);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    contato_principal: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    categoria: "",
    status: "ativo",
    observacoes: "",
  });

  useEffect(() => {
    loadBrands();
  }, []);

  useEffect(() => {
    if (fornecedor) {
      setFormData({
        nome: fornecedor.nome || "",
        cnpj: fornecedor.cnpj || "",
        contato_principal: fornecedor.contato_principal || "",
        email: fornecedor.email || "",
        telefone: fornecedor.telefone || "",
        endereco: fornecedor.endereco || "",
        cidade: fornecedor.cidade || "",
        estado: fornecedor.estado || "",
        cep: fornecedor.cep || "",
        categoria: fornecedor.categoria || "",
        status: fornecedor.status || "ativo",
        observacoes: fornecedor.observacoes || "",
      });
      loadSupplierBrands(fornecedor.id);
    } else {
      setFormData({
        nome: "",
        cnpj: "",
        contato_principal: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        categoria: "",
        status: "ativo",
        observacoes: "",
      });
      setSelectedBrands([]);
    }
  }, [fornecedor]);

  const loadBrands = async () => {
    const { data, error } = await supabase
      .from("brands")
      .select("*")
      .eq("status", "ativa")
      .order("nome");

    if (error) {
      console.error("Error loading brands:", error);
      return;
    }

    setBrands(data || []);
  };

  const loadSupplierBrands = async (supplierId: string) => {
    const { data, error } = await supabase
      .from("supplier_brands")
      .select("brand_id")
      .eq("supplier_id", supplierId);

    if (error) {
      console.error("Error loading supplier brands:", error);
      return;
    }

    setSelectedBrands(data.map((sb) => sb.brand_id));
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const toggleBrand = (brandId: string) => {
    setSelectedBrands((prev) =>
      prev.includes(brandId)
        ? prev.filter((id) => id !== brandId)
        : [...prev, brandId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let supplierId: string;

      if (fornecedor) {
        // Update existing supplier
        const { error } = await supabase
          .from("suppliers")
          .update(formData)
          .eq("id", fornecedor.id);

        if (error) throw error;
        supplierId = fornecedor.id;
        toast.success("Fornecedor atualizado com sucesso!");
      } else {
        // Create new supplier
        const { data, error } = await supabase
          .from("suppliers")
          .insert(formData)
          .select()
          .single();

        if (error) throw error;
        supplierId = data.id;
        toast.success("Fornecedor criado com sucesso!");
      }

      // Update supplier brands
      // First, delete existing brands
      await supabase
        .from("supplier_brands")
        .delete()
        .eq("supplier_id", supplierId);

      // Then insert new brands
      if (selectedBrands.length > 0) {
        const supplierBrandsData = selectedBrands.map((brandId) => ({
          supplier_id: supplierId,
          brand_id: brandId,
        }));

        const { error: brandsError } = await supabase
          .from("supplier_brands")
          .insert(supplierBrandsData);

        if (brandsError) throw brandsError;
      }

      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error("Error saving supplier:", error);
      toast.error(error.message || "Erro ao salvar fornecedor");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {fornecedor ? "Editar Fornecedor" : "Novo Fornecedor"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Dados Básicos */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Dados Básicos</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label htmlFor="nome">Nome do Fornecedor *</Label>
                <Input
                  id="nome"
                  value={formData.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                  required
                />
              </div>

              <div>
                <Label htmlFor="cnpj">CNPJ *</Label>
                <Input
                  id="cnpj"
                  value={formData.cnpj}
                  onChange={(e) => handleChange("cnpj", e.target.value)}
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="categoria">Categoria</Label>
                <Input
                  id="categoria"
                  value={formData.categoria}
                  onChange={(e) => handleChange("categoria", e.target.value)}
                  placeholder="Ex: Hardware, Equipamentos"
                />
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
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
            </div>
          </div>

          {/* Contato */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Contato</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="contato_principal">Contato Principal</Label>
                <Input
                  id="contato_principal"
                  value={formData.contato_principal}
                  onChange={(e) => handleChange("contato_principal", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="telefone">Telefone</Label>
                <Input
                  id="telefone"
                  value={formData.telefone}
                  onChange={(e) => handleChange("telefone", e.target.value)}
                  placeholder="(00) 0000-0000"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="email">E-mail</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleChange("email", e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Endereço */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Endereço</h3>
            <div className="grid grid-cols-4 gap-4">
              <div className="col-span-3">
                <Label htmlFor="endereco">Endereço</Label>
                <Input
                  id="endereco"
                  value={formData.endereco}
                  onChange={(e) => handleChange("endereco", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="cep">CEP</Label>
                <Input
                  id="cep"
                  value={formData.cep}
                  onChange={(e) => handleChange("cep", e.target.value)}
                  placeholder="00000-000"
                />
              </div>

              <div className="col-span-2">
                <Label htmlFor="cidade">Cidade</Label>
                <Input
                  id="cidade"
                  value={formData.cidade}
                  onChange={(e) => handleChange("cidade", e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="estado">Estado</Label>
                <Input
                  id="estado"
                  value={formData.estado}
                  onChange={(e) => handleChange("estado", e.target.value)}
                  placeholder="UF"
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          {/* Marcas */}
          <div className="space-y-4">
            <h3 className="text-sm font-semibold">Marcas que Trabalha</h3>
            <div className="grid grid-cols-3 gap-3 max-h-48 overflow-y-auto p-4 border rounded-md">
              {brands.map((brand) => (
                <div key={brand.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`brand-${brand.id}`}
                    checked={selectedBrands.includes(brand.id)}
                    onCheckedChange={() => toggleBrand(brand.id)}
                  />
                  <label
                    htmlFor={`brand-${brand.id}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                  >
                    {brand.nome}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Observações */}
          <div>
            <Label htmlFor="observacoes">Observações</Label>
            <Textarea
              id="observacoes"
              value={formData.observacoes}
              onChange={(e) => handleChange("observacoes", e.target.value)}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Salvando..." : "Salvar"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
