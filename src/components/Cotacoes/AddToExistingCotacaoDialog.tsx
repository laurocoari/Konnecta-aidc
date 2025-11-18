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
import { Building2, Package } from "lucide-react";

interface AddToExistingCotacaoDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cotacao: {
    numero_cotacao: string;
    quantidade_itens: number;
    supplier?: { nome: string };
  };
  onAddToExisting: () => void;
  onCreateNew: () => void;
}

export function AddToExistingCotacaoDialog({
  open,
  onOpenChange,
  cotacao,
  onAddToExisting,
  onCreateNew,
}: AddToExistingCotacaoDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Cotação Ativa Encontrada
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            <p>
              Você já tem uma cotação ativa <strong>{cotacao.numero_cotacao}</strong> com{" "}
              <strong>{cotacao.quantidade_itens} item(ns)</strong> do fornecedor{" "}
              <strong>{cotacao.supplier?.nome}</strong>.
            </p>
            <p>Deseja adicionar os novos itens nela ou criar uma nova cotação?</p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCreateNew}>
            Criar Nova Cotação
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAddToExisting}>
            <Package className="h-4 w-4 mr-2" />
            Adicionar na Cotação Existente
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

