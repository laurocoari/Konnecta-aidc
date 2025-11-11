import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
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
import { Plus, Search, Edit, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { MarcaFormDialog } from "@/components/Marcas/MarcaFormDialog";

export default function Marcas() {
  const [marcas, setMarcas] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [formOpen, setFormOpen] = useState(false);
  const [selectedMarca, setSelectedMarca] = useState<any>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [marcaToDelete, setMarcaToDelete] = useState<any>(null);

  useEffect(() => {
    loadMarcas();
  }, []);

  const loadMarcas = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("nome", { ascending: true });

      if (error) throw error;
      setMarcas(data || []);
    } catch (error: any) {
      console.error("Error loading brands:", error);
      toast.error("Erro ao carregar marcas");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (marca: any) => {
    setSelectedMarca(marca);
    setFormOpen(true);
  };

  const handleDelete = (marca: any) => {
    setMarcaToDelete(marca);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!marcaToDelete) return;

    try {
      const { error } = await supabase
        .from("brands")
        .delete()
        .eq("id", marcaToDelete.id);

      if (error) throw error;

      toast.success("Marca excluída com sucesso!");
      loadMarcas();
    } catch (error: any) {
      console.error("Error deleting brand:", error);
      toast.error("Erro ao excluir marca");
    } finally {
      setDeleteDialogOpen(false);
      setMarcaToDelete(null);
    }
  };

  const handleFormSuccess = () => {
    loadMarcas();
    setFormOpen(false);
    setSelectedMarca(null);
  };

  const filteredMarcas = marcas.filter((marca) => {
    const matchesSearch = marca.nome
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus =
      statusFilter === "all" || marca.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Marcas</h1>
            <p className="text-muted-foreground">
              Gerencie as marcas de produtos
            </p>
          </div>
        </div>
        <Button
          onClick={() => {
            setSelectedMarca(null);
            setFormOpen(true);
          }}
          className="gap-2"
        >
          <Plus className="h-4 w-4" />
          Nova Marca
        </Button>
      </div>

      <Card className="p-6">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar marcas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              <SelectItem value="ativa">Ativas</SelectItem>
              <SelectItem value="inativa">Inativas</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Logo</TableHead>
                <TableHead>Nome</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Carregando...
                  </TableCell>
                </TableRow>
              ) : filteredMarcas.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center">
                    Nenhuma marca encontrada
                  </TableCell>
                </TableRow>
              ) : (
                filteredMarcas.map((marca) => (
                  <TableRow key={marca.id}>
                    <TableCell>
                      {marca.logo_url ? (
                        <img
                          src={marca.logo_url}
                          alt={marca.nome}
                          className="h-10 w-10 object-contain rounded"
                        />
                      ) : (
                        <div className="h-10 w-10 bg-muted rounded flex items-center justify-center text-xs text-muted-foreground">
                          N/A
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="font-medium">{marca.nome}</TableCell>
                    <TableCell className="max-w-[300px] text-sm text-muted-foreground">
                      {marca.descricao || "-"}
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                          marca.status === "ativa"
                            ? "bg-green-50 text-green-700"
                            : "bg-gray-50 text-gray-700"
                        }`}
                      >
                        {marca.status === "ativa" ? "Ativa" : "Inativa"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(marca)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(marca)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      <MarcaFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        marca={selectedMarca}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a marca "{marcaToDelete?.nome}"?
              Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
