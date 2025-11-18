import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { 
  fetchCNPJData, 
  isValidCNPJLength, 
  formatEndereco, 
  formatCEP,
  formatCNPJ,
  cleanCNPJ 
} from "@/lib/cnpjService";

interface ClienteFormDialogProps {
  cliente?: any;
  onSuccess?: () => void;
}

export function ClienteFormDialog({ cliente, onSuccess }: ClienteFormDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingCNPJ, setLoadingCNPJ] = useState(false);
  const [cnpjSearched, setCnpjSearched] = useState<string>("");
  const [formData, setFormData] = useState({
    nome: "",
    cnpj: "",
    ie: "",
    tipo: "cliente",
    contato_principal: "",
    email: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
  });

  useEffect(() => {
    if (cliente && open) {
      setFormData({
        nome: cliente.nome || "",
        cnpj: cliente.cnpj || "",
        ie: cliente.ie || "",
        tipo: cliente.tipo || "cliente",
        contato_principal: cliente.contato_principal || "",
        email: cliente.email || "",
        telefone: cliente.telefone || "",
        endereco: cliente.endereco || "",
        cidade: cliente.cidade || "",
        estado: cliente.estado || "",
        cep: cliente.cep || "",
        observacoes: cliente.observacoes || "",
      });
      // Marcar CNPJ como já buscado se estiver editando
      if (cliente.cnpj) {
        setCnpjSearched(cleanCNPJ(cliente.cnpj));
      }
    } else if (!cliente && open) {
      // Resetar formulário quando abrir para novo cliente
      setFormData({
        nome: "",
        cnpj: "",
        ie: "",
        tipo: "cliente",
        contato_principal: "",
        email: "",
        telefone: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        observacoes: "",
      });
      setCnpjSearched(""); // Resetar flag de busca
    }
    
    // Resetar flag quando dialog fechar
    if (!open) {
      setCnpjSearched("");
    }
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isEditing = !!cliente;
      logger.db(isEditing ? "Atualizando cliente no banco de dados" : "Salvando novo cliente no banco de dados");
      logger.db(`Dados: ${JSON.stringify({ ...formData, cnpj: formData.cnpj.substring(0, 5) + "..." })}`);

      const dataToSave = {
        nome: formData.nome,
        cnpj: formData.cnpj,
        ie: formData.ie || null,
        tipo: formData.tipo,
        contato_principal: formData.contato_principal,
        email: formData.email,
        telefone: formData.telefone,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado.toUpperCase(),
        cep: formData.cep,
        observacoes: formData.observacoes || null,
      };

      if (isEditing) {
        // Verificar se CNPJ mudou e se já existe outro cliente com esse CNPJ
        if (formData.cnpj !== cliente.cnpj) {
          const { data: existingClient } = await supabase
            .from("clients")
            .select("id")
            .eq("cnpj", formData.cnpj)
            .neq("id", cliente.id)
            .maybeSingle();

          if (existingClient) {
            toast.error("Já existe outro cliente cadastrado com este CNPJ");
            setLoading(false);
            return;
          }
        }

        const { error } = await supabase
          .from("clients")
          .update(dataToSave)
          .eq("id", cliente.id);

        if (error) {
          logger.error("DB", "Erro ao atualizar cliente", error);
          throw error;
        }

        logger.db(`✅ Cliente atualizado com sucesso: ${cliente.id}`);
        toast.success("Cliente atualizado com sucesso!");
      } else {
        // Verificar se já existe cliente com o mesmo CNPJ
        const { data: existingClient } = await supabase
          .from("clients")
          .select("id")
          .eq("cnpj", formData.cnpj)
          .maybeSingle();

        if (existingClient) {
          toast.error("Já existe um cliente cadastrado com este CNPJ");
          logger.warn("DB", "Tentativa de cadastrar cliente com CNPJ duplicado", { cnpj: formData.cnpj });
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from("clients")
          .insert(dataToSave)
          .select()
          .single();

        if (error) {
          logger.error("DB", "Erro ao salvar cliente", error);
          throw error;
        }

        logger.db(`✅ Cliente cadastrado com sucesso: ${data.id}`);
        toast.success("Cliente cadastrado com sucesso!");
      }
      
      setOpen(false);
      
      // Chamar callback para recarregar lista
      if (onSuccess) {
        onSuccess();
      }
    } catch (error: any) {
      logger.error("DB", "Erro ao salvar cliente", error);
      toast.error(error.message || (cliente ? "Erro ao atualizar cliente" : "Erro ao cadastrar cliente"));
    } finally {
      setLoading(false);
    }
  };

  // Controlar abertura do dialog quando cliente é passado (para edição)
  useEffect(() => {
    if (cliente && !open) {
      setOpen(true);
    }
  }, [cliente]);

  // Buscar dados do CNPJ automaticamente quando CNPJ completo for digitado
  useEffect(() => {
    // Não executar se dialog não estiver aberto
    if (!open) return;

    const handleCNPJSearch = async () => {
      // Só buscar se:
      // 1. Não estiver carregando
      // 2. CNPJ tiver 14 dígitos
      // 3. Não tiver buscado este CNPJ ainda
      if (loadingCNPJ) return;
      
      const cleanedCNPJ = cleanCNPJ(formData.cnpj);
      
      if (!isValidCNPJLength(formData.cnpj)) {
        return;
      }

      // Se já buscou este CNPJ, não buscar novamente
      if (cnpjSearched === cleanedCNPJ) {
        return;
      }

      // Se estiver editando e o CNPJ não mudou, não buscar
      if (cliente) {
        const clienteCNPJ = cleanCNPJ(cliente.cnpj || "");
        if (cleanedCNPJ === clienteCNPJ && clienteCNPJ.length === 14) {
          return;
        }
      }

      setLoadingCNPJ(true);
      setCnpjSearched(cleanedCNPJ);

      try {
        const cnpjData = await fetchCNPJData(formData.cnpj);
        
        if (cnpjData) {
          // Preencher campos automaticamente com dados da API
          // O usuário pode editar depois se necessário
          setFormData(prev => ({
            ...prev,
            nome: cnpjData.razao_social || prev.nome,
            cnpj: formatCNPJ(cnpjData.cnpj) || prev.cnpj,
            endereco: formatEndereco(cnpjData) || prev.endereco,
            cidade: cnpjData.municipio || prev.cidade,
            estado: cnpjData.uf || prev.estado,
            cep: cnpjData.cep ? formatCEP(cnpjData.cep) : prev.cep,
            telefone: cnpjData.ddd_telefone_1 || prev.telefone,
            email: cnpjData.email || prev.email,
          }));

          toast.success("Dados do CNPJ preenchidos automaticamente! Você pode editar se necessário.");
        }
      } catch (error: any) {
        logger.error("Erro ao buscar CNPJ:", error);
        toast.error(error.message || "Erro ao buscar dados do CNPJ");
        setCnpjSearched(""); // Permitir tentar novamente
      } finally {
        setLoadingCNPJ(false);
      }
    };

    // Debounce para não buscar a cada digitação
    const timeoutId = setTimeout(() => {
      handleCNPJSearch();
    }, 1000); // Aguardar 1 segundo após parar de digitar

    return () => clearTimeout(timeoutId);
  }, [formData.cnpj, open, cliente, loadingCNPJ, cnpjSearched]);

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen && cliente) {
        // Resetar cliente quando fechar
        if (onSuccess) {
          onSuccess();
        }
      }
    }}>
      {!cliente && (
        <DialogTrigger asChild>
          <Button className="gap-2">
            <Plus className="h-4 w-4" />
            Novo Cliente
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{cliente ? "Editar Cliente" : "Cadastrar Novo Cliente"}</DialogTitle>
            <DialogDescription>
              {cliente ? "Atualize as informações do cliente" : "Adicione um novo cliente ou prospect à sua base"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="nome">Nome / Razão Social *</Label>
                <Input 
                  id="nome" 
                  placeholder="Nome do cliente" 
                  required 
                  value={formData.nome}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <div className="relative">
                  <Input 
                    id="cnpj" 
                    placeholder="00.000.000/0000-00" 
                    required 
                    value={formData.cnpj}
                    onChange={(e) => {
                      setFormData({ ...formData, cnpj: e.target.value });
                      // Resetar flag de busca se CNPJ mudar
                      const cleaned = cleanCNPJ(e.target.value);
                      if (cleaned !== cnpjSearched && cleaned.length < 14) {
                        setCnpjSearched("");
                      }
                    }}
                    disabled={loadingCNPJ}
                  />
                  {loadingCNPJ && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
                {isValidCNPJLength(formData.cnpj) && !loadingCNPJ && cnpjSearched !== cleanCNPJ(formData.cnpj) && (
                  <p className="text-xs text-muted-foreground">
                    Buscando dados do CNPJ...
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="ie">Inscrição Estadual</Label>
                <Input 
                  id="ie" 
                  placeholder="000.000.000.000"
                  value={formData.ie}
                  onChange={(e) => setFormData({ ...formData, ie: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  required
                  value={formData.tipo}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cliente">Cliente</SelectItem>
                    <SelectItem value="potencial">Potencial</SelectItem>
                    <SelectItem value="revendedor">Revendedor</SelectItem>
                    <SelectItem value="fornecedor">Fornecedor</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="contato">Contato Principal *</Label>
              <Input 
                id="contato" 
                placeholder="Nome do responsável" 
                required 
                value={formData.contato_principal}
                onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input 
                  id="email" 
                  type="email" 
                  placeholder="contato@empresa.com" 
                  required 
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input 
                  id="telefone" 
                  placeholder="(00) 00000-0000" 
                  required 
                  value={formData.telefone}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo *</Label>
              <Input 
                id="endereco" 
                placeholder="Rua, número, bairro" 
                required 
                value={formData.endereco}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input 
                  id="cidade" 
                  placeholder="Cidade" 
                  required 
                  value={formData.cidade}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Input 
                  id="estado" 
                  placeholder="UF" 
                  maxLength={2} 
                  required 
                  value={formData.estado}
                  onChange={(e) => setFormData({ ...formData, estado: e.target.value.toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input 
                  id="cep" 
                  placeholder="00000-000" 
                  required 
                  value={formData.cep}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre o cliente"
                rows={3}
                value={formData.observacoes}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => {
                setOpen(false);
                setFormData({
                  nome: "",
                  cnpj: "",
                  ie: "",
                  tipo: "cliente",
                  contato_principal: "",
                  email: "",
                  telefone: "",
                  endereco: "",
                  cidade: "",
                  estado: "",
                  cep: "",
                  observacoes: "",
                });
              }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (cliente ? "Atualizando..." : "Cadastrando...") : (cliente ? "Atualizar Cliente" : "Cadastrar Cliente")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
