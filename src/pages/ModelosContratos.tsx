import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Search, Edit, Copy, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { ModeloContratoFormDialog } from "@/components/Contratos/ModeloContratoFormDialog";

interface ModeloContrato {
  id: string;
  nome: string;
  tipo: string;
  status: string;
  updated_at: string;
}

const tipoLabels = {
  locacao: "Locação",
  venda: "Venda",
  comodato: "Comodato",
  servico: "Serviço",
};

export default function ModelosContratos() {
  const [modelos, setModelos] = useState<ModeloContrato[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [tipoFilter, setTipoFilter] = useState<string>("todos");
  const [openForm, setOpenForm] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [selectedModelo, setSelectedModelo] = useState<ModeloContrato | undefined>();
  const [deleteId, setDeleteId] = useState<string>("");

  useEffect(() => {
    loadModelos();
  }, []);

  const loadModelos = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("contract_templates")
        .select("*")
        .order("created_at", { ascending: false });

      const { data, error } = await query;

      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar modelos: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (modelo: ModeloContrato) => {
    setSelectedModelo(modelo);
    setOpenForm(true);
  };

  const handleDuplicate = async (modelo: ModeloContrato) => {
    try {
      const { data: original } = await supabase
        .from("contract_templates")
        .select("*")
        .eq("id", modelo.id)
        .single();

      if (!original) throw new Error("Modelo não encontrado");

      const { data: user } = await supabase.auth.getUser();
      if (!user.user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("contract_templates").insert({
        nome: `${original.nome} (Cópia)`,
        tipo: original.tipo,
        cabecalho_html: original.cabecalho_html,
        corpo_html: original.corpo_html,
        rodape_html: original.rodape_html,
        observacoes_internas: original.observacoes_internas,
        status: "inativo",
        created_by: user.user.id,
      });

      if (error) throw error;
      toast.success("Modelo duplicado com sucesso!");
      loadModelos();
    } catch (error: any) {
      toast.error("Erro ao duplicar modelo: " + error.message);
    }
  };

  const handleDelete = (id: string) => {
    setDeleteId(id);
    setOpenDelete(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("contract_templates")
        .delete()
        .eq("id", deleteId);

      if (error) throw error;
      toast.success("Modelo excluído com sucesso!");
      loadModelos();
    } catch (error: any) {
      toast.error("Erro ao excluir modelo: " + error.message);
    } finally {
      setOpenDelete(false);
      setDeleteId("");
    }
  };

  const handleFormSuccess = () => {
    loadModelos();
    setOpenForm(false);
    setSelectedModelo(undefined);
  };

  const filteredModelos = modelos.filter((modelo) => {
    const matchesSearch = modelo.nome.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTipo = tipoFilter === "todos" || modelo.tipo === tipoFilter;
    return matchesSearch && matchesTipo;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Contrato</h1>
          <p className="text-muted-foreground">
            Gerencie modelos reutilizáveis para geração de contratos
          </p>
        </div>
        
        <Button onClick={() => { setSelectedModelo(undefined); setOpenForm(true); }} className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Modelo
        </Button>
      </div>

      <Card className="glass-strong p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar modelo..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={tipoFilter} onValueChange={setTipoFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="todos">Todos os tipos</SelectItem>
              <SelectItem value="locacao">Locação</SelectItem>
              <SelectItem value="venda">Venda</SelectItem>
              <SelectItem value="comodato">Comodato</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">Carregando...</div>
        ) : filteredModelos.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Nenhum modelo encontrado
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModelos.map((modelo) => (
                <TableRow key={modelo.id}>
                  <TableCell className="font-medium">{modelo.nome}</TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoLabels[modelo.tipo as keyof typeof tipoLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {new Date(modelo.updated_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={modelo.status === "ativo" ? "default" : "secondary"}>
                      {modelo.status}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(modelo)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(modelo)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(modelo.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <ModeloContratoFormDialog
        open={openForm}
        onOpenChange={setOpenForm}
        modelo={selectedModelo}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={openDelete} onOpenChange={setOpenDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este modelo? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}