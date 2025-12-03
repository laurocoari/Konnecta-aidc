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
import { Plus, Loader2, Upload, X, Image as ImageIcon, FileText, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { SafeImage } from "@/components/ui/SafeImage";
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
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const [cnpjSearched, setCnpjSearched] = useState<string>("");
  const [formData, setFormData] = useState<{
    nome: string;
    cnpj: string;
    ie: string;
    tipo: string;
    contato_principal: string;
    email: string;
    email_administrativo: string;
    email_financeiro: string;
    telefone: string;
    contato_financeiro_nome: string;
    telefone_financeiro: string;
    endereco: string;
    cidade: string;
    estado: string;
    cep: string;
    observacoes: string;
    logomarca_url: string;
    anexos: Array<{
      nome: string;
      url: string;
      tipo: string;
      tamanho: number;
      data_upload: string;
    }>;
    _logoFile?: File;
    _attachmentFiles?: File[];
  }>({
    nome: "",
    cnpj: "",
    ie: "",
    tipo: "cliente",
    contato_principal: "",
    email: "",
    email_administrativo: "",
    email_financeiro: "",
    telefone: "",
    endereco: "",
    cidade: "",
    estado: "",
    cep: "",
    observacoes: "",
    logomarca_url: "",
    anexos: [],
  });

  useEffect(() => {
    if (!open) {
      setCnpjSearched("");
      return;
    }

    if (cliente) {
      // Garantir que todos os valores sejam strings definidas (nunca undefined)
      setFormData({
        nome: String(cliente.nome ?? ""),
        cnpj: String(cliente.cnpj ?? ""),
        ie: String(cliente.ie ?? ""),
        tipo: String(cliente.tipo ?? "cliente"),
        contato_principal: String(cliente.contato_principal ?? ""),
        email: String(cliente.email ?? ""),
        email_administrativo: String(cliente.email_administrativo ?? ""),
        email_financeiro: String(cliente.email_financeiro ?? ""),
        telefone: String(cliente.telefone ?? ""),
        contato_financeiro_nome: String(cliente.contato_financeiro_nome ?? ""),
        telefone_financeiro: String(cliente.telefone_financeiro ?? ""),
        endereco: String(cliente.endereco ?? ""),
        cidade: String(cliente.cidade ?? ""),
        estado: String(cliente.estado ?? ""),
        cep: String(cliente.cep ?? ""),
        observacoes: String(cliente.observacoes ?? ""),
        logomarca_url: String(cliente.logomarca_url ?? ""),
        anexos: Array.isArray(cliente.anexos) ? cliente.anexos : [],
      });
      // Marcar CNPJ como já buscado se estiver editando
      if (cliente.cnpj) {
        setCnpjSearched(cleanCNPJ(cliente.cnpj));
      }
    } else {
      // Resetar formulário quando abrir para novo cliente
      setFormData({
        nome: "",
        cnpj: "",
        ie: "",
        tipo: "cliente",
        contato_principal: "",
        email: "",
        email_administrativo: "",
        email_financeiro: "",
        telefone: "",
        contato_financeiro_nome: "",
        telefone_financeiro: "",
        endereco: "",
        cidade: "",
        estado: "",
        cep: "",
        observacoes: "",
        logomarca_url: "",
        anexos: [],
      });
      setCnpjSearched(""); // Resetar flag de busca
    }
  }, [cliente, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const isEditing = !!cliente;
      logger.db(isEditing ? "Atualizando cliente no banco de dados" : "Salvando novo cliente no banco de dados");
      logger.db(`Dados: ${JSON.stringify({ ...formData, cnpj: formData.cnpj.substring(0, 5) + "..." })}`);

      const dataToSave: any = {
        nome: formData.nome,
        cnpj: formData.cnpj,
        ie: formData.ie || null,
        tipo: formData.tipo,
        contato_principal: formData.contato_principal,
        email: formData.email,
        email_administrativo: formData.email_administrativo || null,
        email_financeiro: formData.email_financeiro || null,
        telefone: formData.telefone,
        contato_financeiro_nome: formData.contato_financeiro_nome || null,
        telefone_financeiro: formData.telefone_financeiro || null,
        endereco: formData.endereco,
        cidade: formData.cidade,
        estado: formData.estado.toUpperCase(),
        cep: formData.cep,
        observacoes: formData.observacoes || null,
      };

      // Para edição, incluir logomarca e anexos se já existirem (não são temporários)
      if (isEditing) {
        if (formData.logomarca_url && !formData.logomarca_url.startsWith('blob:')) {
          dataToSave.logomarca_url = formData.logomarca_url;
        }
        if (formData.anexos.length > 0 && !formData.anexos.some(a => a.url.startsWith('blob:'))) {
          dataToSave.anexos = formData.anexos;
        }
      }

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
        
        // Se há arquivos temporários, fazer upload agora
        if (data.id) {
          // Upload da logomarca se houver arquivo temporário
          if (formData._logoFile) {
            try {
              const fileExt = formData._logoFile.name.split('.').pop();
              const fileName = `logomarca-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
              const filePath = `${data.id}/logomarca/${fileName}`;

              const { error: uploadError, data: uploadData } = await supabase.storage
                .from('client-files')
                .upload(filePath, formData._logoFile, {
                  cacheControl: '3600',
                  upsert: false,
                });

              if (!uploadError && uploadData) {
                const { data: { publicUrl } } = supabase.storage
                  .from('client-files')
                  .getPublicUrl(filePath);

                await supabase
                  .from("clients")
                  .update({ logomarca_url: publicUrl })
                  .eq("id", data.id);
              }
            } catch (logoError: any) {
              logger.error("Erro ao fazer upload da logomarca após criar cliente:", logoError);
            }
          }

          // Upload dos anexos se houver arquivos temporários
          if (formData._attachmentFiles && formData._attachmentFiles.length > 0) {
            try {
              const uploadedAnexos = [];
              for (const file of formData._attachmentFiles) {
                const fileExt = file.name.split('.').pop();
                const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
                const filePath = `${data.id}/anexos/${fileName}`;

                const { error: uploadError, data: uploadData } = await supabase.storage
                  .from('client-files')
                  .upload(filePath, file, {
                    cacheControl: '3600',
                    upsert: false,
                  });

                if (!uploadError && uploadData) {
                  const { data: { publicUrl } } = supabase.storage
                    .from('client-files')
                    .getPublicUrl(filePath);

                  uploadedAnexos.push({
                    nome: file.name,
                    url: publicUrl,
                    tipo: file.type,
                    tamanho: file.size,
                    data_upload: new Date().toISOString(),
                  });
                }
              }

              if (uploadedAnexos.length > 0) {
                await supabase
                  .from("clients")
                  .update({ anexos: uploadedAnexos })
                  .eq("id", data.id);
              }
            } catch (anexosError: any) {
              logger.error("Erro ao fazer upload dos anexos após criar cliente:", anexosError);
            }
          }
        }

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

  // Função para upload de logomarca
  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo de arquivo (apenas imagens)
    const validImageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!validImageTypes.includes(file.type)) {
      toast.error('Por favor, selecione uma imagem válida (JPG, PNG, GIF ou WEBP)');
      return;
    }

    // Validar tamanho (máximo 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error('A imagem deve ter no máximo 5MB');
      return;
    }

    // Se não há cliente criado ainda, armazenar o arquivo temporariamente
    if (!cliente?.id) {
      // Criar URL temporária para preview
      const tempUrl = URL.createObjectURL(file);
      setFormData(prev => ({
        ...prev,
        logomarca_url: tempUrl,
        _logoFile: file, // Armazenar arquivo temporariamente
      }));
      toast.success('Logomarca selecionada! Será enviada ao salvar o cliente.');
      return;
    }

    setUploadingLogo(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `logomarca-${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `${cliente.id}/logomarca/${fileName}`;

      // Se já existe uma logomarca, deletar a antiga
      if (formData.logomarca_url && !formData.logomarca_url.startsWith('blob:')) {
        const urlParts = formData.logomarca_url.split('/');
        const oldFileName = urlParts[urlParts.length - 1];
        await supabase.storage.from('client-files').remove([`${cliente.id}/logomarca/${oldFileName}`]);
      }

      const { error: uploadError, data } = await supabase.storage
        .from('client-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('client-files')
        .getPublicUrl(filePath);

      setFormData(prev => ({
        ...prev,
        logomarca_url: publicUrl,
        _logoFile: undefined,
      }));

      toast.success('Logomarca enviada com sucesso!');
    } catch (error: any) {
      logger.error("Erro ao fazer upload da logomarca:", error);
      toast.error('Erro ao fazer upload da logomarca: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUploadingLogo(false);
    }
  };

  // Função para remover logomarca
  const handleRemoveLogo = async () => {
    if (!formData.logomarca_url || !cliente?.id) {
      setFormData(prev => ({ ...prev, logomarca_url: "" }));
      return;
    }

    try {
      // Extrair nome do arquivo da URL
      const urlParts = formData.logomarca_url.split('/');
      const fileName = urlParts[urlParts.length - 1];
      const filePath = `${cliente.id}/logomarca/${fileName}`;

      const { error } = await supabase.storage
        .from('client-files')
        .remove([filePath]);

      if (error) throw error;

      setFormData(prev => ({ ...prev, logomarca_url: "" }));
      toast.success('Logomarca removida com sucesso!');
    } catch (error: any) {
      logger.error("Erro ao remover logomarca:", error);
      toast.error('Erro ao remover logomarca');
    }
  };

  // Função para upload de anexos
  const handleAttachmentUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    // Validar tipos de arquivo permitidos
    const validTypes = [
      'application/pdf',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/jpeg',
      'image/jpg',
      'image/png',
    ];

    const maxSize = 10 * 1024 * 1024; // 10MB

    // Validar arquivos
    const validFiles: File[] = [];
    for (const file of Array.from(files)) {
      if (!validTypes.includes(file.type)) {
        toast.error(`Tipo de arquivo não permitido: ${file.name}`);
        continue;
      }
      if (file.size > maxSize) {
        toast.error(`Arquivo muito grande: ${file.name} (máximo 10MB)`);
        continue;
      }
      validFiles.push(file);
    }

    if (validFiles.length === 0) return;

    // Se não há cliente criado ainda, armazenar os arquivos temporariamente
    if (!cliente?.id) {
      const tempAnexos = validFiles.map(file => ({
        nome: file.name,
        url: URL.createObjectURL(file),
        tipo: file.type,
        tamanho: file.size,
        data_upload: new Date().toISOString(),
      }));

      setFormData(prev => ({
        ...prev,
        anexos: [...prev.anexos, ...tempAnexos],
        _attachmentFiles: [...(prev._attachmentFiles || []), ...validFiles],
      }));

      toast.success(`${validFiles.length} arquivo(s) selecionado(s)! Serão enviados ao salvar o cliente.`);
      e.target.value = '';
      return;
    }

    setUploadingAttachment(true);
    try {
      const uploadPromises = validFiles.map(async (file) => {
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;
        const filePath = `${cliente.id}/anexos/${fileName}`;

        const { error: uploadError, data } = await supabase.storage
          .from('client-files')
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('client-files')
          .getPublicUrl(filePath);

        return {
          nome: file.name,
          url: publicUrl,
          tipo: file.type,
          tamanho: file.size,
          data_upload: new Date().toISOString(),
        };
      });

      const uploadedFiles = await Promise.all(uploadPromises);
      
      setFormData(prev => ({
        ...prev,
        anexos: [...prev.anexos, ...uploadedFiles],
      }));

      toast.success(`${uploadedFiles.length} arquivo(s) enviado(s) com sucesso!`);
    } catch (error: any) {
      logger.error("Erro ao fazer upload de anexos:", error);
      toast.error('Erro ao fazer upload: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUploadingAttachment(false);
      // Resetar input
      e.target.value = '';
    }
  };

  // Função para remover anexo
  const handleRemoveAttachment = async (index: number) => {
    const attachment = formData.anexos[index];
    
    // Se é um arquivo temporário (blob URL), apenas remover da lista
    if (attachment.url.startsWith('blob:')) {
      setFormData(prev => {
        const attachmentToRemove = prev.anexos[index];
        const newAnexos = prev.anexos.filter((_, i) => i !== index);
        // Remover o arquivo correspondente do array de arquivos temporários
        const newFiles = prev._attachmentFiles?.filter((file) => file.name !== attachmentToRemove.nome) || [];
        return {
          ...prev,
          anexos: newAnexos,
          _attachmentFiles: newFiles,
        };
      });
      toast.success('Anexo removido!');
      return;
    }
    
    if (cliente?.id && attachment.url) {
      try {
        // Extrair nome do arquivo da URL
        const urlParts = attachment.url.split('/');
        const fileName = urlParts[urlParts.length - 1];
        const filePath = `${cliente.id}/anexos/${fileName}`;

        const { error } = await supabase.storage
          .from('client-files')
          .remove([filePath]);

        if (error) throw error;
      } catch (error: any) {
        logger.error("Erro ao remover anexo:", error);
        toast.error('Erro ao remover anexo');
        return;
      }
    }

    setFormData(prev => ({
      ...prev,
      anexos: prev.anexos.filter((_, i) => i !== index),
    }));

    toast.success('Anexo removido com sucesso!');
  };

  // Função para formatar tamanho do arquivo
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

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
                  value={formData.nome ?? ""}
                  onChange={(e) => setFormData({ ...formData, nome: e.target.value ?? "" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cnpj">CNPJ *</Label>
                <div className="relative">
                  <Input 
                    id="cnpj" 
                    placeholder="00.000.000/0000-00" 
                    required 
                    value={formData.cnpj ?? ""}
                    onChange={(e) => {
                      const value = e.target.value ?? "";
                      setFormData({ ...formData, cnpj: value });
                      // Resetar flag de busca se CNPJ mudar
                      const cleaned = cleanCNPJ(value);
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
                  value={formData.ie ?? ""}
                  onChange={(e) => setFormData({ ...formData, ie: e.target.value ?? "" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tipo">Tipo *</Label>
                <Select 
                  required
                  value={formData.tipo || "cliente"}
                  onValueChange={(value) => setFormData({ ...formData, tipo: value || "cliente" })}
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
                value={formData.contato_principal ?? ""}
                onChange={(e) => setFormData({ ...formData, contato_principal: e.target.value ?? "" })}
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
                  value={formData.email ?? ""}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value ?? "" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone">Telefone *</Label>
                <Input 
                  id="telefone" 
                  placeholder="(00) 00000-0000" 
                  required 
                  value={formData.telefone ?? ""}
                  onChange={(e) => setFormData({ ...formData, telefone: e.target.value ?? "" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="email_administrativo">E-mail Administrativo</Label>
                <Input 
                  id="email_administrativo" 
                  type="email" 
                  placeholder="admin@empresa.com" 
                  value={formData.email_administrativo ?? ""}
                  onChange={(e) => setFormData({ ...formData, email_administrativo: e.target.value ?? "" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email_financeiro">E-mail Financeiro</Label>
                <Input 
                  id="email_financeiro" 
                  type="email" 
                  placeholder="financeiro@empresa.com" 
                  value={formData.email_financeiro ?? ""}
                  onChange={(e) => setFormData({ ...formData, email_financeiro: e.target.value ?? "" })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="contato_financeiro_nome">Nome do Contato Financeiro</Label>
                <Input 
                  id="contato_financeiro_nome" 
                  placeholder="Nome do responsável financeiro" 
                  value={formData.contato_financeiro_nome ?? ""}
                  onChange={(e) => setFormData({ ...formData, contato_financeiro_nome: e.target.value ?? "" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="telefone_financeiro">Telefone Financeiro</Label>
                <Input 
                  id="telefone_financeiro" 
                  placeholder="(00) 00000-0000" 
                  value={formData.telefone_financeiro ?? ""}
                  onChange={(e) => setFormData({ ...formData, telefone_financeiro: e.target.value ?? "" })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="endereco">Endereço Completo *</Label>
              <Input 
                id="endereco" 
                placeholder="Rua, número, bairro" 
                required 
                value={formData.endereco ?? ""}
                onChange={(e) => setFormData({ ...formData, endereco: e.target.value ?? "" })}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="cidade">Cidade *</Label>
                <Input 
                  id="cidade" 
                  placeholder="Cidade" 
                  required 
                  value={formData.cidade ?? ""}
                  onChange={(e) => setFormData({ ...formData, cidade: e.target.value ?? "" })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="estado">Estado *</Label>
                <Input 
                  id="estado" 
                  placeholder="UF" 
                  maxLength={2} 
                  required 
                  value={formData.estado ?? ""}
                  onChange={(e) => setFormData({ ...formData, estado: (e.target.value ?? "").toUpperCase() })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="cep">CEP *</Label>
                <Input 
                  id="cep" 
                  placeholder="00000-000" 
                  required 
                  value={formData.cep ?? ""}
                  onChange={(e) => setFormData({ ...formData, cep: e.target.value ?? "" })}
                />
              </div>
            </div>

            {/* Upload de Logomarca */}
            <div className="space-y-2">
              <Label>Logomarca do Cliente</Label>
              <div className="flex items-center gap-4">
                {formData.logomarca_url ? (
                  <div className="relative">
                    <SafeImage
                      src={formData.logomarca_url}
                      alt="Logomarca"
                      className="w-24 h-24 object-contain border rounded p-2"
                      fallbackIcon={<ImageIcon className="h-8 w-8 text-muted-foreground" />}
                    />
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      className="absolute -top-2 -right-2 h-6 w-6 rounded-full p-0"
                      onClick={handleRemoveLogo}
                      disabled={uploadingLogo}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="w-24 h-24 border-2 border-dashed rounded flex items-center justify-center">
                    <ImageIcon className="h-8 w-8 text-muted-foreground" />
                  </div>
                )}
                <div className="flex-1">
                  <Input
                    type="file"
                    accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                    onChange={handleLogoUpload}
                    disabled={uploadingLogo}
                    className="hidden"
                    id="logo-upload"
                  />
                  <Label
                    htmlFor="logo-upload"
                    className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                  >
                    {uploadingLogo ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Enviando...
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        {formData.logomarca_url ? "Alterar Logomarca" : "Enviar Logomarca"}
                      </>
                    )}
                  </Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Formatos: JPG, PNG, GIF, WEBP (máx. 5MB)
                  </p>
                </div>
              </div>
            </div>

            {/* Upload de Anexos */}
            <div className="space-y-2">
              <Label>Anexos (PDF, Excel, Word, Imagens)</Label>
              <div className="space-y-2">
                <Input
                  type="file"
                  accept=".pdf,.xls,.xlsx,.doc,.docx,.jpg,.jpeg,.png"
                  multiple
                  onChange={handleAttachmentUpload}
                  disabled={uploadingAttachment}
                  className="hidden"
                  id="attachment-upload"
                />
                <Label
                  htmlFor="attachment-upload"
                  className="cursor-pointer inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-accent"
                >
                  {uploadingAttachment ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      Adicionar Anexos
                    </>
                  )}
                </Label>
                <p className="text-xs text-muted-foreground">
                  Formatos: PDF, Excel, Word, Imagens (máx. 10MB por arquivo)
                </p>

                {/* Lista de anexos */}
                {formData.anexos.length > 0 && (
                  <div className="mt-4 space-y-2">
                    {formData.anexos.map((anexo, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 border rounded-md bg-muted/50"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <FileText className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{anexo.nome}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatFileSize(anexo.tamanho)} • {new Date(anexo.data_upload).toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (anexo.url.startsWith('blob:')) {
                                toast.info('Arquivo será enviado ao salvar o cliente');
                              } else {
                                window.open(anexo.url, '_blank');
                              }
                            }}
                            className="h-8"
                            disabled={anexo.url.startsWith('blob:')}
                          >
                            {anexo.url.startsWith('blob:') ? 'Pendente' : 'Abrir'}
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRemoveAttachment(index)}
                            className="h-8 text-destructive hover:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="observacoes">Observações</Label>
              <Textarea
                id="observacoes"
                placeholder="Informações adicionais sobre o cliente"
                rows={3}
                value={formData.observacoes ?? ""}
                onChange={(e) => setFormData({ ...formData, observacoes: e.target.value ?? "" })}
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
                  email_administrativo: "",
                  email_financeiro: "",
                  telefone: "",
                  contato_financeiro_nome: "",
                  telefone_financeiro: "",
                  endereco: "",
                  cidade: "",
                  estado: "",
                  cep: "",
                  observacoes: "",
                  logomarca_url: "",
                  anexos: [],
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
