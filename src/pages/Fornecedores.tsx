import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Building2, Mail, Phone } from "lucide-react";

const mockFornecedores = [
  {
    id: 1,
    nome: "Tech Supplies LTDA",
    cnpj: "12.345.678/0001-90",
    contato: "Roberto Fernandes",
    email: "compras@techsupplies.com",
    telefone: "(11) 3456-7890",
    categoria: "Hardware",
    status: "ativo",
  },
  {
    id: 2,
    nome: "Distribuidora Nacional",
    cnpj: "98.765.432/0001-10",
    contato: "Ana Paula Costa",
    email: "vendas@distnacional.com",
    telefone: "(21) 2345-6789",
    categoria: "Equipamentos",
    status: "ativo",
  },
];

export default function Fornecedores() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Fornecedores</h1>
          <p className="text-muted-foreground">
            Gerencie seus fornecedores e realize cotações
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Fornecedor
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {mockFornecedores.map((fornecedor) => (
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
              <Badge variant="success">{fornecedor.status}</Badge>
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <p className="mb-1 text-xs text-muted-foreground">Contato Principal</p>
                <p className="font-medium">{fornecedor.contato}</p>
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-3 w-3" />
                {fornecedor.email}
              </div>

              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-3 w-3" />
                {fornecedor.telefone}
              </div>

              <div className="pt-2">
                <Badge variant="outline">{fornecedor.categoria}</Badge>
              </div>
            </div>

            <Button className="mt-4 w-full" variant="outline">
              Solicitar Cotação
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}
