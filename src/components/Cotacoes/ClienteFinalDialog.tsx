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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Building2, CheckCircle2, AlertTriangle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ClienteFinalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  clienteData: {
    nome: string;
    cnpj: string;
    endereco: string;
    bairro: string;
    cidade: string;
    uf: string;
    cep: string;
    ie?: string;
  };
  onCadastrarAutomatico: () => void;
  onCadastrarManual: () => void;
  onPular: () => void;
}

export function ClienteFinalDialog({
  open,
  onOpenChange,
  clienteData,
  onCadastrarAutomatico,
  onCadastrarManual,
  onPular,
}: ClienteFinalDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Cliente não está cadastrado
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-4">
            <p>
              A IA detectou um cliente final (faturamento direto) que não está cadastrado no sistema.
            </p>

            <div className="bg-muted p-4 rounded-lg space-y-2">
              <div className="flex items-center gap-2 font-semibold">
                <Building2 className="h-4 w-4" />
                Dados do Cliente Final
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="font-medium">Nome:</span> {clienteData.nome || "—"}
                </div>
                <div>
                  <span className="font-medium">CNPJ:</span> {clienteData.cnpj || "—"}
                </div>
                <div>
                  <span className="font-medium">Endereço:</span> {clienteData.endereco || "—"}
                </div>
                <div>
                  <span className="font-medium">Bairro:</span> {clienteData.bairro || "—"}
                </div>
                <div>
                  <span className="font-medium">Cidade:</span> {clienteData.cidade || "—"}
                </div>
                <div>
                  <span className="font-medium">UF:</span> {clienteData.uf || "—"}
                </div>
                <div>
                  <span className="font-medium">CEP:</span> {clienteData.cep || "—"}
                </div>
                {clienteData.ie && (
                  <div>
                    <span className="font-medium">IE:</span> {clienteData.ie}
                  </div>
                )}
              </div>
            </div>

            <p className="text-sm text-muted-foreground">
              Deseja cadastrar automaticamente ou prefere cadastrar manualmente?
            </p>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex-col sm:flex-row gap-2">
          <AlertDialogCancel onClick={onPular} className="w-full sm:w-auto">
            Pular (não recomendado)
          </AlertDialogCancel>
          <Button
            variant="outline"
            onClick={onCadastrarManual}
            className="w-full sm:w-auto"
          >
            Cadastrar Manualmente
          </Button>
          <AlertDialogAction onClick={onCadastrarAutomatico} className="w-full sm:w-auto">
            <CheckCircle2 className="h-4 w-4 mr-2" />
            Cadastrar Cliente Agora (Automático)
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}





