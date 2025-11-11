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
import { Plus, Search, UserCheck, DollarSign, TrendingUp, Phone, Mail } from "lucide-react";
import { toast } from "sonner";

const mockRevendedores = [
  {
    id: 1,
    nome: "Carlos Mendes",
    cnpj: "12.345.678/0001-90",
    email: "carlos@revendedor.com",
    telefone: "(11) 98765-4321",
    area: "São Paulo - SP",
    comissao: 15,
    vendas: 45000,
    status: "ativo",
  },
  {
    id: 2,
    nome: "Patricia Costa",
    cnpj: "98.765.432/0001-10",
    email: "patricia@vendas.com",
    telefone: "(21) 91234-5678",
    area: "Rio de Janeiro - RJ",
    comissao: 12,
    vendas: 32000,
    status: "ativo",
  },
];

export default function Revendedores() {
  const [searchTerm, setSearchTerm] = useState("");
  const [open, setOpen] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    toast.success("Revendedor cadastrado com sucesso!");
    setOpen(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Revendedores & Parceiros</h1>
          <p className="text-muted-foreground">
            Gerencie sua rede de revendedores e acompanhe desempenho
          </p>
        </div>
        
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Revendedor
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px]">
            <form onSubmit={handleSubmit}>
              <DialogHeader>
                <DialogTitle>Cadastrar Novo Revendedor</DialogTitle>
                <DialogDescription>
                  Adicione um novo revendedor à sua rede comercial
                </DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nome">Nome / Razão Social *</Label>
                    <Input id="nome" placeholder="Nome do revendedor" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="cnpj">CNPJ *</Label>
                    <Input id="cnpj" placeholder="00.000.000/0000-00" required />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">E-mail *</Label>
                    <Input id="email" type="email" placeholder="contato@email.com" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="telefone">Telefone *</Label>
                    <Input id="telefone" placeholder="(00) 00000-0000" required />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="area">Área de Atuação *</Label>
                  <Input id="area" placeholder="Cidade - Estado" required />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comissao">Comissão (%) *</Label>
                    <Input id="comissao" type="number" placeholder="15" min="0" max="100" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="desconto">Desconto Máximo (%) *</Label>
                    <Input id="desconto" type="number" placeholder="10" min="0" max="100" required />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Cadastrar</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-6 md:grid-cols-4">
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Total Revendedores</p>
          <p className="mt-1 text-3xl font-bold">24</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Vendas do Mês</p>
          <p className="mt-1 text-3xl font-bold text-success">R$ 245k</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Comissões a Pagar</p>
          <p className="mt-1 text-3xl font-bold text-warning">R$ 32k</p>
        </Card>
        <Card className="glass-strong p-4">
          <p className="text-sm text-muted-foreground">Taxa Conversão Média</p>
          <p className="mt-1 text-3xl font-bold text-primary">28%</p>
        </Card>
      </div>

      <Card className="glass-strong p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar revendedor..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {mockRevendedores.map((revendedor) => (
            <Card key={revendedor.id} className="glass p-6">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-3">
                    <UserCheck className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold">{revendedor.nome}</h3>
                    <p className="text-xs font-mono text-muted-foreground">
                      {revendedor.cnpj}
                    </p>
                  </div>
                </div>
                <Badge variant="success">{revendedor.status}</Badge>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Mail className="h-3 w-3" />
                  {revendedor.email}
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Phone className="h-3 w-3" />
                  {revendedor.telefone}
                </div>

                <div className="pt-3 border-t border-border space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Área</span>
                    <span className="font-medium">{revendedor.area}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Comissão</span>
                    <span className="font-semibold text-primary">{revendedor.comissao}%</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Vendas do Mês</span>
                    <div className="flex items-center gap-1 font-semibold text-success">
                      <DollarSign className="h-3 w-3" />
                      R$ {revendedor.vendas.toLocaleString('pt-BR')}
                    </div>
                  </div>
                </div>
              </div>

              <Button className="mt-4 w-full gap-2" variant="outline">
                <TrendingUp className="h-4 w-4" />
                Ver Desempenho
              </Button>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
