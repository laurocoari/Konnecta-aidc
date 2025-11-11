import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Plus, FileText, Calendar, DollarSign, Eye, Download } from "lucide-react";

const mockPropostas = [
  {
    id: 1,
    numero: "PROP-2025-001",
    cliente: "TechCorp Ltda",
    valor: 45000,
    validade: "30/11/2025",
    status: "enviada",
    data: "10/11/2025",
  },
  {
    id: 2,
    numero: "PROP-2025-002",
    cliente: "Inovação Digital",
    valor: 28000,
    validade: "25/11/2025",
    status: "aprovada",
    data: "12/11/2025",
  },
  {
    id: 3,
    numero: "PROP-2025-003",
    cliente: "Distribuidora Sul",
    valor: 62000,
    validade: "05/12/2025",
    status: "aguardando",
    data: "15/11/2025",
  },
];

const statusColors = {
  enviada: "default",
  aguardando: "warning",
  aprovada: "success",
  recusada: "destructive",
} as const;

export default function Propostas() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Propostas Comerciais</h1>
          <p className="text-muted-foreground">
            Crie e gerencie propostas para seus clientes
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Proposta
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Total de Propostas</p>
          <p className="mt-1 text-3xl font-bold">24</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Aguardando Resposta</p>
          <p className="mt-1 text-3xl font-bold text-warning">8</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Aprovadas</p>
          <p className="mt-1 text-3xl font-bold text-success">12</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Valor Total</p>
          <p className="mt-1 text-3xl font-bold text-primary">R$ 890k</p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Número</TableHead>
              <TableHead>Cliente</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Validade</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {mockPropostas.map((proposta) => (
              <TableRow key={proposta.id}>
                <TableCell className="font-mono font-medium">
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-muted-foreground" />
                    {proposta.numero}
                  </div>
                </TableCell>
                <TableCell>{proposta.cliente}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-1 font-semibold text-success">
                    <DollarSign className="h-4 w-4" />
                    R$ {proposta.valor.toLocaleString('pt-BR')}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    {proposta.data}
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2 text-sm">
                    <Calendar className="h-3 w-3" />
                    {proposta.validade}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant={statusColors[proposta.status as keyof typeof statusColors]}>
                    {proposta.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="sm">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
