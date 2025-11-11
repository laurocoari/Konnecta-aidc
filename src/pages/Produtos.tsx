import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, Package, DollarSign, Tag } from "lucide-react";

const mockProdutos = [
  {
    id: 1,
    codigo: "RFID-001",
    nome: "Leitor RFID Portátil",
    categoria: "Hardware",
    tipo: "venda",
    valorVenda: 2500,
    estoque: 15,
    status: "ativo",
  },
  {
    id: 2,
    codigo: "RFID-002",
    nome: "Antena RFID UHF",
    categoria: "Hardware",
    tipo: "venda",
    valorVenda: 1800,
    estoque: 8,
    status: "ativo",
  },
  {
    id: 3,
    codigo: "LOC-001",
    nome: "Sistema RFID Completo",
    categoria: "Equipamento",
    tipo: "locacao",
    valorLocacao: 450,
    estoque: 5,
    status: "ativo",
  },
];

export default function Produtos() {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Produtos & Equipamentos</h1>
          <p className="text-muted-foreground">
            Gerencie seu catálogo de produtos e equipamentos
          </p>
        </div>
        <Button className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Produto
        </Button>
      </div>

      <Card className="glass-strong p-6">
        <div className="mb-6 flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar produtos por código ou nome..."
              className="pl-9"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {mockProdutos.map((produto) => (
            <Card key={produto.id} className="glass p-5">
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-primary/10 p-2">
                    <Package className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-xs font-mono text-muted-foreground">
                      {produto.codigo}
                    </p>
                    <h3 className="font-semibold">{produto.nome}</h3>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Categoria</span>
                  <Badge variant="outline" className="gap-1">
                    <Tag className="h-3 w-3" />
                    {produto.categoria}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Tipo</span>
                  <Badge variant={produto.tipo === "venda" ? "default" : "secondary"}>
                    {produto.tipo === "venda" ? "Venda" : "Locação"}
                  </Badge>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Valor</span>
                  <span className="flex items-center gap-1 font-semibold text-success">
                    <DollarSign className="h-4 w-4" />
                    R$ {produto.tipo === "venda" 
                      ? produto.valorVenda?.toLocaleString('pt-BR')
                      : produto.valorLocacao?.toLocaleString('pt-BR') + "/mês"
                    }
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Estoque</span>
                  <span className={produto.estoque > 10 ? "text-success" : "text-warning"}>
                    {produto.estoque} unidades
                  </span>
                </div>
              </div>

              <Button className="mt-4 w-full" variant="outline">
                Ver Detalhes
              </Button>
            </Card>
          ))}
        </div>
      </Card>
    </div>
  );
}
