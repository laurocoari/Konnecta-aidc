import { useState, useEffect } from "react";
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
import { Button } from "@/components/ui/button";
import { ClienteFormDialog } from "@/components/Clientes/ClienteFormDialog";
import { ExportButton } from "@/components/ExportButton";
import { Search, Phone, Mail, Building2, Eye, Edit, Paperclip } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { logger } from "@/lib/logger";
import { ExcelColumn } from "@/lib/excelExport";
import { SafeImage } from "@/components/ui/SafeImage";

const statusColors = {
  ativo: "success",
  potencial: "warning",
  inativo: "destructive",
} as const;

export default function Clientes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [clientes, setClientes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingCliente, setEditingCliente] = useState<any>(null);

  useEffect(() => {
    loadClientes();
  }, []);

  const loadClientes = async () => {
    try {
      setLoading(true);
      logger.db("Carregando clientes do banco de dados");
      
      // Verificar autenticação primeiro
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        logger.error("AUTH", "Usuário não autenticado", authError);
        toast.error("Usuário não autenticado. Faça login novamente.");
        return;
      }
      
      logger.db(`Usuário autenticado: ${user.email} (${user.id})`);
      
      const { data, error } = await supabase
        .from("clients")
        .select(`
          *,
          origin_partner:partners!clients_origin_partner_id_fkey(
            id,
            nome_fantasia,
            razao_social
          ),
          exclusive_partner:partners!clients_exclusive_partner_id_fkey(
            id,
            nome_fantasia,
            razao_social
          )
        `)
        .order("nome");

      if (error) {
        logger.error("DB", "Erro ao carregar clientes", error);
        logger.error("DB", `Código do erro: ${error.code}`, error);
        
        // Mensagem mais específica baseada no erro
        if (error.code === 'PGRST116' || error.message.includes('permission denied') || error.message.includes('row-level security')) {
          toast.error("Sem permissão para visualizar clientes. Verifique seu perfil de acesso.");
          logger.warn("DB", "Possível problema de RLS - usuário pode não ter role adequado");
        } else {
          toast.error("Erro ao carregar clientes: " + error.message);
        }
        return;
      }

      logger.db(`✅ ${data?.length || 0} clientes carregados`);
      
      if (data && data.length > 0) {
        logger.db(`Clientes encontrados: ${data.map(c => c.nome).join(", ")}`);
      } else {
        logger.warn("DB", "Nenhum cliente encontrado na tabela");
      }
      
      setClientes(data || []);
    } catch (error: any) {
      logger.error("DB", "Erro ao carregar clientes", error);
      toast.error("Erro ao carregar clientes: " + (error.message || "Erro desconhecido"));
    } finally {
      setLoading(false);
    }
  };

  const filteredClientes = clientes.filter((cliente) => {
    const searchLower = searchTerm.toLowerCase();
    return (
      cliente.nome.toLowerCase().includes(searchLower) ||
      cliente.cnpj.toLowerCase().includes(searchLower) ||
      cliente.contato_principal.toLowerCase().includes(searchLower) ||
      cliente.email.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Clientes</h1>
          <p className="text-muted-foreground">
            Gerencie sua base de clientes e prospects
          </p>
        </div>
        <div className="flex gap-2">
          <ExportButton
            filename="clientes"
            title="Relatório de Clientes"
            columns={[
              { header: "Nome", key: "nome", width: 30 },
              { header: "CNPJ", key: "cnpj", width: 18 },
              { header: "Contato Principal", key: "contato_principal", width: 25 },
              { header: "Email", key: "email", width: 30 },
              { header: "Telefone", key: "telefone", width: 15 },
              { header: "E-mail Administrativo", key: "email_administrativo", width: 30 },
              { header: "E-mail Financeiro", key: "email_financeiro", width: 30 },
              { header: "Contato Financeiro", key: "contato_financeiro_nome", width: 25 },
              { header: "Telefone Financeiro", key: "telefone_financeiro", width: 15 },
              { header: "Cidade", key: "cidade", width: 20 },
              { header: "Estado", key: "estado", width: 10 },
              { header: "CEP", key: "cep", width: 12 },
              { header: "Tipo", key: "tipo", width: 12 },
            ]}
            data={filteredClientes.map((c) => ({
              nome: c.nome,
              cnpj: c.cnpj,
              contato_principal: c.contato_principal,
              email: c.email,
              telefone: c.telefone,
              email_administrativo: c.email_administrativo || "",
              email_financeiro: c.email_financeiro || "",
              contato_financeiro_nome: c.contato_financeiro_nome || "",
              telefone_financeiro: c.telefone_financeiro || "",
              cidade: c.cidade,
              estado: c.estado,
              cep: c.cep,
              tipo: c.tipo || "cliente",
            }))}
          />
          <ClienteFormDialog cliente={editingCliente} onSuccess={() => { loadClientes(); setEditingCliente(null); }} />
        </div>
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

        {loading ? (
          <div className="text-center py-8 text-muted-foreground">
            Carregando clientes...
          </div>
        ) : filteredClientes.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            {searchTerm 
              ? "Nenhum cliente encontrado com os filtros aplicados."
              : "Nenhum cliente cadastrado ainda. Use o botão acima para cadastrar um novo cliente."}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Cliente</TableHead>
                <TableHead>CNPJ</TableHead>
                <TableHead>Contato</TableHead>
                <TableHead>Informações</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClientes.map((cliente) => (
                <TableRow key={cliente.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-3">
                      {cliente.logomarca_url ? (
                        <SafeImage
                          src={cliente.logomarca_url}
                          alt={cliente.nome}
                          className="w-10 h-10 object-contain border rounded p-1"
                          fallbackIcon={<Building2 className="h-5 w-5 text-muted-foreground" />}
                        />
                      ) : (
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <div>{cliente.nome}</div>
                        {cliente.anexos && Array.isArray(cliente.anexos) && cliente.anexos.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <Paperclip className="h-3 w-3" />
                            {cliente.anexos.length} anexo(s)
                          </div>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono text-sm">
                    {cliente.cnpj}
                  </TableCell>
                  <TableCell>{cliente.contato_principal}</TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Mail className="h-3 w-3" />
                        {cliente.email}
                      </div>
                      {cliente.email_administrativo && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          Admin: {cliente.email_administrativo}
                        </div>
                      )}
                      {cliente.email_financeiro && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Mail className="h-3 w-3" />
                          Financeiro: {cliente.email_financeiro}
                        </div>
                      )}
                      {cliente.contato_financeiro_nome && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          Contato Financeiro: {cliente.contato_financeiro_nome}
                        </div>
                      )}
                      {cliente.telefone_financeiro && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Phone className="h-3 w-3" />
                          Tel. Financeiro: {cliente.telefone_financeiro}
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Phone className="h-3 w-3" />
                        {cliente.telefone}
                      </div>
                      {(cliente.cidade || cliente.estado) && (
                        <div className="text-xs text-muted-foreground">
                          {cliente.cidade}, {cliente.estado}
                        </div>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{cliente.tipo || "cliente"}</Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setEditingCliente(cliente)}
                        className="gap-2"
                      >
                        <Edit className="h-4 w-4" />
                        Editar
                      </Button>
                      <Button variant="ghost" size="sm" className="gap-2">
                        <Eye className="h-4 w-4" />
                        Ver Detalhes
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}
