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
import { Loader2 } from "lucide-react";

interface DeleteARDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isMultiple: boolean;
  count?: number;
  clienteNome?: string;
  valorTotal?: number;
  isLoading?: boolean;
  onConfirm: () => void;
}

export function DeleteARDialog({
  open,
  onOpenChange,
  isMultiple,
  count = 1,
  clienteNome,
  valorTotal,
  isLoading = false,
  onConfirm,
}: DeleteARDialogProps) {
  const [confirmationText, setConfirmationText] = useState("");
  const requiredText = "DELETAR";
  const isConfirmed = confirmationText === requiredText;

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && !isLoading) {
      setConfirmationText("");
    }
    if (!isLoading) {
      onOpenChange(newOpen);
    }
  };

  const handleConfirm = () => {
    if (isConfirmed && !isLoading) {
      setConfirmationText("");
      onConfirm();
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isMultiple ? "Excluir contas selecionadas" : "Confirmar Exclusão"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {isMultiple ? (
              <>
                Tem certeza que deseja excluir <strong>{count}</strong> conta(s) a receber selecionada(s)?
              </>
            ) : (
              <>
                Tem certeza que deseja excluir a conta a receber
                {clienteNome && (
                  <> de <strong>{clienteNome}</strong></>
                )}
                {valorTotal && (
                  <> no valor de <strong>R$ {valorTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</strong></>
                )}
                ?
              </>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-destructive font-semibold">
            Esta ação não pode ser desfeita e irá excluir todos os dados relacionados.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirmation-input">
              Para confirmar, digite <strong className="font-mono">{requiredText}</strong>:
            </Label>
            <Input
              id="confirmation-input"
              type="text"
              value={confirmationText}
              onChange={(e) => {
                const newValue = (e.target.value ?? "").toUpperCase();
                setConfirmationText(newValue);
              }}
              placeholder={requiredText}
              className="font-mono"
              autoComplete="off"
              disabled={isLoading}
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed && !isLoading) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed || isLoading}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Excluindo...
              </>
            ) : (
              "Confirmar exclusão"
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

