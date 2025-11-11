import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, FileText, Calendar, DollarSign, Download, Eye, AlertCircle } from "lucide-react";
import { toast } from "sonner";

const mockContratos = [
  {
    id: 1,
    numero: "CTR-2025-001",
    cliente: "TechCorp Ltda",
    tipo: "locacao",
    valor: 450,
    dataInicio: "01/01/2025",
    dataTermino: "31/12/2025",
    status: "ativo",
    proximoVencimento: "15/12/2025",
  },
  {
    id: 2,
    numero: "CTR-2025-002",
    cliente: "Inovação Digital",
    tipo: "venda",
    valor: 28000,
    dataInicio: "15/10/2025",
    dataTermino: "15/10/2025",
    status: "concluido",
    proximoVencimento: "-",
  },
  {
    id: 3,
    numero: "CTR-2024-089",
    cliente: "Distribuidora Sul",
    tipo: "locacao",
    valor: 850,
    dataInicio: "01/06/2024",
    dataTermino: "31/05/2025",
    status: "vencendo",
    proximoVencimento: "31/05/2025",
  },
];

const statusColors = {
  ativo: "success",
  vencendo: "warning",
  concluido: "default",
  rescindido: "destructive",
} as const;

export default function Contratos() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Contrato criado com sucesso!");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Contratos</h1>
          <p className="text-muted-foreground">
            Gerencie contratos de venda e locação
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Contrato
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Criar Novo Contrato</DialogTitle>
                <DialogDescription>
                  Registre um novo contrato de venda ou locação
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="numero">Número do Contrato *</Label>
                    <Input id="numero" placeholder="CTR-2025-000" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="tipo">Tipo *</Label>
                    <Select required>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o tipo" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="venda">Venda</SelectItem>
                        <SelectItem value="locacao">Locação</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="cliente">Cliente *</Label>
                  <Select required>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">TechCorp Ltda</SelectItem>
                      <SelectItem value="2">Inovação Digital</SelectItem>
                      <SelectItem value="3">Distribuidora Sul</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="valor">Valor *</Label>
                    <Input id="valor" type="number" placeholder="0.00" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prazo">Prazo (meses)</Label>
                    <Input id="prazo" type="number" placeholder="12" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="inicio">Data Início *</Label>
                    <Input id="inicio" type="date" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="termino">Data Término *</Label>
                    <Input id="termino" type="date" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações</Label>
                  <Textarea
                    id="observacoes"
                    placeholder="Condições especiais, reajustes, multas, etc."
                    rows={3}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Contrato</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Contratos Ativos</p>
          <p className="mt-1 text-3xl font-bold">142</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Vencendo em 30 dias</p>
          <p className="mt-1 text-3xl font-bold text-warning">8</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Valor Total Mensal</p>
          <p className="mt-1 text-3xl font-bold text-success">R$ 67k</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Taxa Renovação</p>
          <p className="mt-1 text-3xl font-bold text-primary">87%</p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar contrato ou cliente..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-4">
          {mockContratos.map((contrato) => (
            <Card key={contrato.id} className="glass p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4 flex-1">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <FileText className="h-6 w-6 text-primary" />
                  </div>
                  
                  <div className="flex-1 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <h3 className="font-semibold text-lg">{contrato.cliente}</h3>
                        <p className="text-sm font-mono text-muted-foreground">
                          {contrato.numero}
                        </p>
                      </div>
                      <Badge variant={statusColors[contrato.status as keyof typeof statusColors]}>
                        {contrato.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-xs text-muted-foreground">Tipo</p>
                        <Badge variant="outline" className="mt-1">
                          {contrato.tipo === "venda" ? "Venda" : "Locação"}
                        </Badge>
                      </div>
                      
                      <div>
                        <p className="text-xs text-muted-foreground">Valor</p>
                        <div className="mt-1 flex items-center gap-1 font-semibold text-success">
                          <DollarSign className="h-4 w-4" />
                          R$ {contrato.valor.toLocaleString('pt-BR')}
                          {contrato.tipo === "locacao" && "/mês"}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Vigência</p>
                        <div className="mt-1 flex items-center gap-1 text-sm">
                          <Calendar className="h-3 w-3" />
                          {contrato.dataInicio}
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-muted-foreground">Próximo Vencimento</p>
                        <div className="mt-1 flex items-center gap-1 text-sm">
                          {contrato.status === "vencendo" && <AlertCircle className="h-3 w-3 text-warning" />}
                          <Calendar className="h-3 w-3" />
                          {contrato.proximoVencimento}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex gap-2 ml-4">
                  <Button variant="ghost" size="sm">
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Download className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
