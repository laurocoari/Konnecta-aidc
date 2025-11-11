import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Phone, Mail, Building2, Eye } from "lucide-react";

const mockClientes = [
  {
    id: 1,
    nome: "TechCorp Ltda",
    cnpj: "12.345.678/0001-90",
    contato: "João Silva",
    email: "joao@techcorp.com",
    telefone: "(11) 98765-4321",
    status: "ativo",
    tipo: "cliente",
  },
  {
    id: 2,
    nome: "Inovação Digital",
    cnpj: "98.765.432/0001-10",
    contato: "Maria Santos",
    email: "maria@inovacao.com",
    telefone: "(21) 91234-5678",
    status: "potencial",
    tipo: "lead",
  },
  {
    id: 3,
    nome: "Distribuidora Sul",
    cnpj: "11.222.333/0001-44",
    contato: "Carlos Oliveira",
    email: "carlos@distrisul.com",
    telefone: "(51) 99876-5432",
    status: "ativo",
    tipo: "revendedor",
  },
];

const statusColors = {
  ativo: "success",
  potencial: "warning",
  inativo: "destructive",
} as const;

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie sua base de clientes e prospects
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Cliente
        </Button>
      </div>

      <Card className="glass-strong p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, CNPJ ou contato..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Cliente</TableHead>
              <TableHead>CNPJ</TableHead>
              <TableHead>Contato</TableHead>
              <TableHead>Informações</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tipo</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockClientes.map((cliente) => (
              <TableRow key={cliente.id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    {cliente.nome}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {cliente.cnpj}
                </TableCell>
                <TableCell>{cliente.contato}</TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {cliente.email}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {cliente.telefone}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[cliente.status as keyof typeof statusColors]}>
                    {cliente.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant="outline">{cliente.tipo}</Badge>
                </TableCell>
                <TableCell className="text-right">
                  <Button variant="ghost" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    Ver Detalhes
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
