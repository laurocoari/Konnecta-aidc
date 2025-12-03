import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Lock, Package, Warehouse, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export default function EstoquePublico() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState(false);
  const [warehouse, setWarehouse] = useState<any>(null);
  const [inventory, setInventory] = useState<any[]>([]);
  const [error, setError] = useState<string>("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  useEffect(() => {
    if (id) {
      loadWarehouse();
    } else {
      setError("Link de compartilhamento inválido");
      setLoading(false);
    }
  }, [id]);

  const loadWarehouse = async () => {
    if (!id) return;

    try {
      // Buscar depósito pelo token (acesso público)
      const { data, error: warehouseError } = await supabase
        .from("warehouses")
        .select("*")
        .eq("token_publico", id)
        .eq("compartilhamento_ativo", true)
        .single();

      if (warehouseError) throw warehouseError;

      if (!data) {
        setError("O link de compartilhamento não é válido ou expirou");
        setLoading(false);
        return;
      }

      // Verificar se expirou
      if (data.compartilhamento_expira_em && new Date(data.compartilhamento_expira_em) < new Date()) {
        setError("O link de compartilhamento expirou");
        setLoading(false);
        return;
      }

      setWarehouse(data);

      // Se não tem usuário/senha configurados, permitir acesso direto
      if (!data.usuario_publico || !data.senha_publica) {
        setAuthenticated(true);
        loadInventory(data.id);
      } else {
        setLoading(false);
      }
    } catch (error: any) {
      console.error("Erro ao carregar depósito:", error);
      setError("Erro ao carregar estoque compartilhado: " + error.message);
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!warehouse) return;

    // Verificação simples de usuário e senha (em produção, usar hash)
    // Por enquanto, comparar diretamente (senha deve estar em hash no banco)
    if (username === warehouse.usuario_publico && password === warehouse.senha_publica) {
      setAuthenticated(true);
      loadInventory(warehouse.id);
      toast.success("Acesso autorizado");
    } else {
      toast.error("Usuário ou senha incorretos");
    }
  };

  const loadInventory = async (warehouseId: string) => {
    setLoading(true);
    try {
      const { data, error: inventoryError } = await supabase
        .from("inventory")
        .select(`
          *,
          product:products(
            id,
            nome,
            codigo,
            sku_interno,
            categoria,
            imagem_principal,
            estoque_atual
          ),
          warehouse:warehouses(id, nome)
        `)
        .eq("warehouse_id", warehouseId)
        .order("updated_at", { ascending: false });

      if (inventoryError) throw inventoryError;

      setInventory(data || []);
    } catch (error: any) {
      console.error("Erro ao carregar estoque:", error);
      toast.error("Erro ao carregar estoque: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8 w-full max-w-md">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p className="text-muted-foreground">Carregando...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (error && !warehouse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
        <Card className="p-8 w-full max-w-md">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-semibold text-destructive">Erro no login</h2>
            <p className="text-muted-foreground">{error}</p>
            <Button onClick={() => navigate("/")} variant="outline">
              Voltar ao início
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!authenticated && warehouse) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
        <Card className="p-8 w-full max-w-md">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <div className="rounded-full bg-primary/10 p-3">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
              </div>
              <h1 className="text-2xl font-bold">Acesso ao Estoque</h1>
              <p className="text-sm text-muted-foreground">
                Digite suas credenciais para visualizar o estoque compartilhado
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <Label htmlFor="username">Usuário</Label>
                <Input
                  id="username"
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Digite seu usuário"
                  required
                  autoFocus
                />
              </div>

              <div>
                <Label htmlFor="password">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Digite sua senha"
                  required
                />
              </div>

              <Button type="submit" className="w-full">
                Entrar
              </Button>
            </form>

            <p className="text-xs text-center text-muted-foreground">
              Acesso limitado apenas à visualização de estoque
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <div className="max-w-7xl mx-auto space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-3">
                <Warehouse className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl font-bold">{warehouse?.nome || "Estoque Compartilhado"}</h1>
                <p className="text-sm text-muted-foreground">
                  Visualização de estoque compartilhado
                </p>
              </div>
            </div>
            <Badge variant="outline" className="gap-2">
              <Package className="h-4 w-4" />
              {inventory.length} {inventory.length === 1 ? "item" : "itens"}
            </Badge>
          </div>
        </Card>

        {loading ? (
          <Card className="p-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando estoque...</p>
            </div>
          </Card>
        ) : inventory.length === 0 ? (
          <Card className="p-12 text-center">
            <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Nenhum produto em estoque encontrado neste depósito.
            </p>
          </Card>
        ) : (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead className="text-right">Quantidade</TableHead>
                  <TableHead>Última Atualização</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {inventory.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {item.product?.imagem_principal && (
                          <img
                            src={item.product.imagem_principal}
                            alt={item.product.nome}
                            className="w-10 h-10 rounded object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        )}
                        <div>
                          <div className="font-medium">
                            {item.product?.nome || "N/A"}
                          </div>
                          {item.product?.categoria && (
                            <div className="text-xs text-muted-foreground">
                              {item.product.categoria}
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {item.product?.sku_interno && (
                          <div className="font-mono text-xs font-semibold text-primary">
                            SKU: {item.product.sku_interno}
                          </div>
                        )}
                        {item.product?.codigo && (
                          <div className="text-xs text-muted-foreground">
                            Código: {item.product.codigo}
                          </div>
                        )}
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
                      {new Date(item.updated_at).toLocaleDateString("pt-BR", {
                        day: "2-digit",
                        month: "2-digit",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </div>
    </div>
  );
}



