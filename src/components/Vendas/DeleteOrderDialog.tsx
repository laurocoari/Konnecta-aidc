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

interface DeleteOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderNumber: string;
  onConfirm: () => void;
}

export function DeleteOrderDialog({
  open,
  onOpenChange,
  orderNumber,
  onConfirm,
}: DeleteOrderDialogProps) {
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
      setConfirmationText("");
      onConfirm();
      onOpenChange(false);
    }
  };

  return (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
          <AlertDialogDescription>
            Tem certeza que deseja excluir o pedido <strong>{orderNumber}</strong>?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-destructive font-semibold">
            Esta ação não pode ser desfeita e irá excluir todos os dados relacionados ao pedido.
          </p>
          <div className="space-y-2">
            <Label htmlFor="confirmation-input">
              Digite <strong className="font-mono">{requiredText}</strong> para confirmar:
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
            Excluir Pedido
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

