import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, FileText, Edit, Copy, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import ModeloPropostaFormDialog from "@/components/Propostas/ModeloPropostaFormDialog";

const tipoLabels = {
  venda: "Venda",
  locacao: "Locação",
  servico: "Serviço",
  projeto: "Projeto",
};

const statusColors = {
  ativo: "success",
  inativo: "secondary",
} as const;

export default function ModelosPropostas() {
  const [modelos, setModelos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterTipo, setFilterTipo] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [selectedModelo, setSelectedModelo] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [modeloToDelete, setModeloToDelete] = useState<any>(null);

  useEffect(() => {
    loadModelos();
  }, []);

  const loadModelos = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("proposal_templates")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setModelos(data || []);
    } catch (error: any) {
      toast.error("Erro ao carregar modelos");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (modelo: any) => {
    setSelectedModelo(modelo);
    setFormDialogOpen(true);
  };

  const handleDuplicate = async (modelo: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Usuário não autenticado");

      const { error } = await supabase.from("proposal_templates").insert({
        ...modelo,
        id: undefined,
        nome: `${modelo.nome} (Cópia)`,
        created_by: user.id,
        created_at: undefined,
        updated_at: undefined,
      });

      if (error) throw error;
      toast.success("Modelo duplicado com sucesso!");
      loadModelos();
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleDelete = async () => {
    if (!modeloToDelete) return;

    try {
      const { error } = await supabase
        .from("proposal_templates")
        .delete()
        .eq("id", modeloToDelete.id);

      if (error) throw error;
      toast.success("Modelo excluído com sucesso!");
      loadModelos();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteDialogOpen(false);
      setModeloToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    loadModelos();
    setSelectedModelo(null);
  };

  // Filtrar modelos
  const filteredModelos = modelos.filter((modelo) => {
    const matchTipo = filterTipo === "all" || modelo.tipo === filterTipo;
    const matchSearch = modelo.nome.toLowerCase().includes(searchTerm.toLowerCase());
    return matchTipo && matchSearch;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Modelos de Proposta</h1>
          <p className="text-muted-foreground">
            Crie modelos padronizados para agilizar suas propostas
          </p>
        </div>
        <Button
          className="gap-2"
          onClick={() => {
            setSelectedModelo(null);
            setFormDialogOpen(true);
          }}
        >
          <Plus className="h-4 w-4" />
          Novo Modelo
        </Button>
      </div>

      <Card className="glass-strong p-6">
        <div className="flex gap-4 mb-6">
          <Input
            placeholder="Buscar modelo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-sm"
          />
          <Select value={filterTipo} onValueChange={setFilterTipo}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filtrar por tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Tipos</SelectItem>
              <SelectItem value="venda">Venda</SelectItem>
              <SelectItem value="locacao">Locação</SelectItem>
              <SelectItem value="servico">Serviço</SelectItem>
              <SelectItem value="projeto">Projeto</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-8">Carregando...</p>
        ) : filteredModelos.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">
            Nenhum modelo encontrado
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome do Modelo</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Última Atualização</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredModelos.map((modelo) => (
                <TableRow key={modelo.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      {modelo.nome}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">
                      {tipoLabels[modelo.tipo as keyof typeof tipoLabels]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {format(new Date(modelo.updated_at), "dd/MM/yyyy HH:mm")}
                  </TableCell>
                  <TableCell>
                    <Badge variant={statusColors[modelo.status as keyof typeof statusColors]}>
                      {modelo.status === "ativo" ? "Ativo" : "Inativo"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(modelo)}
                        title="Editar"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDuplicate(modelo)}
                        title="Duplicar"
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setModeloToDelete(modelo);
                          setDeleteDialogOpen(true);
                        }}
                        title="Excluir"
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

      <ModeloPropostaFormDialog
        open={formDialogOpen}
        onOpenChange={setFormDialogOpen}
        modelo={selectedModelo}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o modelo "{modeloToDelete?.nome}"? Esta ação não pode
              ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
