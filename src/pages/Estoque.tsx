import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Search,
  Warehouse,
  Package,
  ArrowUpDown,
  TrendingUp,
  TrendingDown,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { WarehouseFormDialog } from "@/components/Estoque/WarehouseFormDialog";
import { StockMovementDialog } from "@/components/Estoque/StockMovementDialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Estoque() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [inventory, setInventory] = useState<any[]>([]);
  const [movements, setMovements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>("todos");
  const [searchTerm, setSearchTerm] = useState("");
  const [warehouseDialogOpen, setWarehouseDialogOpen] = useState(false);
  const [movementDialogOpen, setMovementDialogOpen] = useState(false);
  const [selectedInventory, setSelectedInventory] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("estoque");

  useEffect(() => {
    loadWarehouses();
    loadInventory();
    loadMovements();
  }, []);

  useEffect(() => {
    loadInventory();
  }, [selectedWarehouse]);

  const loadWarehouses = async () => {
    const { data } = await supabase
      .from("warehouses")
      .select("*")
      .order("nome");
    if (data) setWarehouses(data);
  };

  const loadInventory = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("inventory")
        .select(`
          *,
          product:products(id, nome, codigo, sku_interno, categoria, imagem_principal, estoque_atual),
          warehouse:warehouses(id, nome)
        `);

      if (selectedWarehouse !== "todos") {
        query = query.eq("warehouse_id", selectedWarehouse);
      }

      const { data, error } = await query.order("updated_at", { ascending: false });

      if (error) throw error;
      setInventory(data || []);
    } catch (error: any) {
      console.error("Error loading inventory:", error);
      toast.error("Erro ao carregar estoque");
    } finally {
      setLoading(false);
    }
  };

  const loadMovements = async () => {
    try {
      const { data, error } = await supabase
        .from("stock_movements")
        .select(`
          *,
          inventory:inventory(
            product:products(id, nome, codigo, sku_interno),
            warehouse:warehouses(id, nome)
          ),
          origem_warehouse:warehouses!stock_movements_origem_warehouse_id_fkey(id, nome),
          destino_warehouse:warehouses!stock_movements_destino_warehouse_id_fkey(id, nome),
          created_by_user:profiles!stock_movements_created_by_fkey(id, full_name)
        `)
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) throw error;
      setMovements(data || []);
    } catch (error: any) {
      console.error("Error loading movements:", error);
    }
  };

  const handleNewMovement = (inventoryItem?: any) => {
    setSelectedInventory(inventoryItem || null);
    setMovementDialogOpen(true);
  };

  const handleMovementSuccess = () => {
    loadInventory();
    loadMovements();
  };

  const getMovementTypeBadge = (tipo: string) => {
    const configs: Record<string, { label: string; variant: any; icon: any }> = {
      entrada: { label: "Entrada", variant: "default", icon: TrendingUp },
      saida: { label: "Saída", variant: "destructive", icon: TrendingDown },
      ajuste: { label: "Ajuste", variant: "secondary", icon: RefreshCw },
      transferencia: { label: "Transferência", variant: "outline", icon: ArrowUpDown },
    };
    const config = configs[tipo] || { label: tipo, variant: "default", icon: Package };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const filteredInventory = inventory.filter((item) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        item.product?.nome?.toLowerCase().includes(term) ||
        item.product?.codigo?.toLowerCase().includes(term) ||
        item.product?.sku_interno?.toLowerCase().includes(term) ||
        item.warehouse?.nome?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Controle de Estoque</h1>
          <p className="text-muted-foreground">
            Gerencie depósitos, estoque e movimentações de produtos
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => setWarehouseDialogOpen(true)}
            className="gap-2"
          >
            <Warehouse className="h-4 w-4" />
            Novo Depósito
          </Button>
          <Button onClick={() => handleNewMovement()} className="gap-2">
            <Plus className="h-4 w-4" />
            Nova Movimentação
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="estoque">Estoque</TabsTrigger>
          <TabsTrigger value="movimentacoes">Movimentações</TabsTrigger>
        </TabsList>

        <TabsContent value="estoque" className="space-y-4">
          {/* Filtros */}
          <Card className="glass-strong p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por produto ou depósito..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={selectedWarehouse} onValueChange={setSelectedWarehouse}>
                <SelectTrigger>
                  <SelectValue placeholder="Depósito" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Depósitos</SelectItem>
                  {warehouses.map((w) => (
                    <SelectItem key={w.id} value={w.id}>
                      {w.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Tabela de Estoque */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando estoque...
            </div>
          ) : filteredInventory.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhum produto em estoque encontrado.
              </p>
            </Card>
          ) : (
            <Card className="glass-strong">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>Depósito</TableHead>
                    <TableHead className="text-right">Quantidade</TableHead>
                    <TableHead>Última Atualização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredInventory.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          {item.product?.imagem_principal && (
                            <img
                              src={item.product.imagem_principal}
                              alt={item.product.nome}
                              className="w-10 h-10 rounded object-cover"
                            />
                          )}
                          <div>
                            <div className="font-medium">
                              {item.product?.nome || "N/A"}
                            </div>
                            <div className="text-xs text-muted-foreground space-y-0.5">
                              {item.product?.sku_interno && (
                                <div className="font-mono font-semibold text-primary">
                                  SKU: {item.product.sku_interno}
                                </div>
                              )}
                              {item.product?.codigo && (
                                <div>Código: {item.product.codigo}</div>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Warehouse className="h-4 w-4 text-muted-foreground" />
                          {item.warehouse?.nome || "N/A"}
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge
                          variant={item.quantidade === 0 ? "destructive" : "default"}
                          className="text-lg"
                        >
                          {item.quantidade}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {new Date(item.updated_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleNewMovement(item)}
                        >
                          Movimentar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="movimentacoes" className="space-y-4">
          <Card className="glass-strong">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Produto</TableHead>
                  <TableHead>Depósito</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Descrição</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {movements.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                      Nenhuma movimentação registrada
                    </TableCell>
                  </TableRow>
                ) : (
                  movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        {new Date(movement.created_at).toLocaleDateString("pt-BR")}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">
                            {movement.inventory?.product?.nome || "N/A"}
                          </div>
                          {movement.inventory?.product?.sku_interno && (
                            <div className="text-xs text-muted-foreground font-mono">
                              SKU: {movement.inventory.product.sku_interno}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {movement.inventory?.warehouse?.nome || "N/A"}
                      </TableCell>
                      <TableCell>{getMovementTypeBadge(movement.tipo)}</TableCell>
                      <TableCell className="text-right font-semibold">
                        {movement.quantidade}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {movement.descricao || "-"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </Card>
        </TabsContent>
      </Tabs>

      <WarehouseFormDialog
        open={warehouseDialogOpen}
        onOpenChange={setWarehouseDialogOpen}
        onSuccess={() => {
          loadWarehouses();
          loadInventory();
        }}
      />

      <StockMovementDialog
        open={movementDialogOpen}
        onOpenChange={setMovementDialogOpen}
        inventoryItem={selectedInventory}
        warehouses={warehouses}
        onSuccess={handleMovementSuccess}
      />
    </div>
  );
}

