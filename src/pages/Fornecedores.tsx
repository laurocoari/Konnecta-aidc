import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Mail, Phone, Pencil, Trash2, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import FornecedorFormDialog from "@/components/Fornecedores/FornecedorFormDialog";
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
import type { Database } from "@/integrations/supabase/types";

type Supplier = Database["public"]["Tables"]["suppliers"]["Row"];

export default function Fornecedores() {
  const [fornecedores, setFornecedores] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedFornecedor, setSelectedFornecedor] = useState<Supplier | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [fornecedorToDelete, setFornecedorToDelete] = useState<Supplier | null>(null);
  const [supplierBrands, setSupplierBrands] = useState<Record<string, string[]>>({});

  useEffect(() => {
    loadFornecedores();
  }, []);

  const loadFornecedores = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .order("nome");

      if (error) throw error;

      setFornecedores(data || []);

      // Load brands for each supplier
      if (data && data.length > 0) {
        const supplierIds = data.map((s) => s.id);
        const { data: brandsData, error: brandsError } = await supabase
          .from("supplier_brands")
          .select("supplier_id, brand_id, brands(nome)")
          .in("supplier_id", supplierIds);

        if (brandsError) {
          console.error("Error loading brands:", brandsError);
        } else {
          const brandsBySupplier: Record<string, string[]> = {};
          brandsData.forEach((sb: any) => {
            if (!brandsBySupplier[sb.supplier_id]) {
              brandsBySupplier[sb.supplier_id] = [];
            }
            brandsBySupplier[sb.supplier_id].push(sb.brands.nome);
          });
          setSupplierBrands(brandsBySupplier);
        }
      }
    } catch (error: any) {
      console.error("Error loading fornecedores:", error);
      toast.error("Erro ao carregar fornecedores");
    } finally {
      setLoading(false);
    }
  };

  const handleNew = () => {
    setSelectedFornecedor(null);
    setDialogOpen(true);
  };

  const handleEdit = (fornecedor: Supplier) => {
    setSelectedFornecedor(fornecedor);
    setDialogOpen(true);
  };

  const handleDeleteClick = (fornecedor: Supplier) => {
    setFornecedorToDelete(fornecedor);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!fornecedorToDelete) return;

    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", fornecedorToDelete.id);

      if (error) throw error;

      toast.success("Fornecedor excluído com sucesso!");
      loadFornecedores();
    } catch (error: any) {
      console.error("Error deleting fornecedor:", error);
      toast.error("Erro ao excluir fornecedor");
    } finally {
      setDeleteDialogOpen(false);
      setFornecedorToDelete(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie seus fornecedores e realize cotações
          </p>
        </div>
        <Button className="gap-2" onClick={handleNew}>
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">
          Carregando fornecedores...
        </div>
      ) : fornecedores.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          Nenhum fornecedor cadastrado. Clique em "Novo Fornecedor" para começar.
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {fornecedores.map((fornecedor) => (
            <Card key={fornecedor.id} className="glass-strong p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <Building2 className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{fornecedor.nome}</h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      {fornecedor.cnpj}
                    </p>
                  </div>
                </div>
                <Badge variant={fornecedor.status === "ativo" ? "default" : "secondary"}>
                  {fornecedor.status}
                </Badge>
              </div>

              <div className="space-y-3 text-sm">
                {fornecedor.contato_principal && (
                  <div>
                    <p className="mb-1 text-xs text-muted-foreground">Contato Principal</p>
                    <p className="font-medium">{fornecedor.contato_principal}</p>
                  </div>
                )}

                {fornecedor.email && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Mail className="h-3 w-3 flex-shrink-0" />
                    <span className="truncate">{fornecedor.email}</span>
                  </div>
                )}

                {fornecedor.telefone && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Phone className="h-3 w-3 flex-shrink-0" />
                    {fornecedor.telefone}
                  </div>
                )}

                <div className="flex flex-wrap gap-2 pt-2">
                  {fornecedor.categoria && (
                    <Badge variant="outline">{fornecedor.categoria}</Badge>
                  )}
                  {supplierBrands[fornecedor.id] && supplierBrands[fornecedor.id].length > 0 && (
                    <div className="flex items-center gap-1">
                      <Tag className="h-3 w-3 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">
                        {supplierBrands[fornecedor.id].length} marca(s)
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 flex gap-2">
                <Button
                  className="flex-1"
                  variant="outline"
                  size="sm"
                  onClick={() => handleEdit(fornecedor)}
                >
                  <Pencil className="h-3 w-3 mr-1" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteClick(fornecedor)}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <FornecedorFormDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        fornecedor={selectedFornecedor}
        onSuccess={loadFornecedores}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o fornecedor{" "}
              <strong>{fornecedorToDelete?.nome}</strong>? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
