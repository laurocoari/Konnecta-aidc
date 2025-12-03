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

interface DeletePropostaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  propostaCodigo: string;
  onConfirm: () => void;
}

export function DeletePropostaDialog({
  open,
  onOpenChange,
  propostaCodigo,
  onConfirm,
}: DeletePropostaDialogProps) {
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
    console.log("handleConfirm chamado", { isConfirmed, confirmationText, requiredText });
    if (isConfirmed) {
      console.log("Confirmação válida, chamando onConfirm");
      setConfirmationText("");
      onConfirm();
      onOpenChange(false);
    } else {
      console.warn("Confirmação inválida", { confirmationText, requiredText });
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir a proposta <strong>{propostaCodigo}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-destructive font-semibold">
            Esta ação não pode ser desfeita e irá excluir todos os dados relacionados à proposta.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirmation-input">
              Digite <strong className="font-mono">{requiredText}</strong> para confirmar:
            </Label>
            <Input
              id="confirmation-input"
              type="text"
              value={confirmationText ?? ""}
              onChange={(e) => {
                const newValue = (e.target.value ?? "").toUpperCase();
                console.log("Input mudou", { old: confirmationText, new: newValue, required: requiredText });
                setConfirmationText(newValue);
              }}
              placeholder={requiredText}
              className="font-mono"
              autoComplete="off"
              onKeyDown={(e) => {
                if (e.key === "Enter" && isConfirmed) {
                  e.preventDefault();
                  handleConfirm();
                }
              }}
            />
          </div>
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleConfirm}
            disabled={!isConfirmed}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Excluir Proposta
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

