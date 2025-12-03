import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Trash2 } from "lucide-react";

interface BulkDeletePropostasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  quantidade: number;
  onConfirm: () => void;
  loading?: boolean;
}

export function BulkDeletePropostasDialog({
  open,
  onOpenChange,
  quantidade,
  onConfirm,
  loading = false,
}: BulkDeletePropostasDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const requiredText = "DELETAR";
  const isConfirmed = confirmationText === requiredText;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      setConfirmationText("");
    }
    onOpenChange(newOpen);
  };

  const handleConfirm = () => {
    if (isConfirmed) {
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão em Massa</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir <strong>{quantidade} proposta(s)</strong> selecionada(s)?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-destructive font-semibold">
            Esta ação não pode ser desfeita e irá excluir todos os dados relacionados às propostas,
            como itens e simulações de ROI. Contratos e pedidos de venda vinculados terão a referência removida.
          </p>
          <div className="space-y-2">
            <Label htmlFor="bulk-confirmation-input">
              Digite <strong className="font-mono">{requiredText}</strong> para confirmar:
            </Label>
            <Input
              id="bulk-confirmation-input"
              type="text"
              value={confirmationText ?? ""}
              onChange={(e) => setConfirmationText((e.target.value ?? "").toUpperCase())}
              placeholder={requiredText}
              className="font-mono"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed && !loading) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={loading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || loading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Excluir {quantidade} Proposta(s)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}


