import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  CheckSquare,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Edit,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { TaskFormDialog } from "@/components/Tarefas/TaskFormDialog";
import { useAuth } from "@/hooks/useAuth";

export default function Tarefas() {
  const { user } = useAuth();
  const [tasks, setTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("todos");
  const [filterPrioridade, setFilterPrioridade] = useState<string>("todos");
  const [taskDialogOpen, setTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<any>(null);
  const [activeTab, setActiveTab] = useState("pendentes");

  useEffect(() => {
    loadTasks();
  }, [filterStatus, filterPrioridade, activeTab]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from("tasks")
        .select(`
          *,
          contact:contacts(id, nome, empresa),
          opportunity:opportunities_crm(id, nome)
        `)
        .order("data_vencimento", { ascending: true });

      if (filterStatus !== "todos") {
        query = query.eq("status", filterStatus);
      }

      if (filterPrioridade !== "todos") {
        query = query.eq("prioridade", filterPrioridade);
      }

      if (activeTab === "minhas") {
        query = query.eq("responsavel_id", user?.id);
      } else if (activeTab === "pendentes") {
        query = query.eq("status", "pendente");
      } else if (activeTab === "vencidas") {
        query = query
          .eq("status", "pendente")
          .lt("data_vencimento", new Date().toISOString().split("T")[0]);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Buscar profiles separadamente para responsáveis e criadores
      const userIds = [
        ...new Set([
          ...(data || []).map(t => t.responsavel_id).filter(Boolean),
          ...(data || []).map(t => t.created_by).filter(Boolean),
        ])
      ];
      
      let usersMap: Record<string, any> = {};
      
      if (userIds.length > 0) {
        const { data: profilesData } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", userIds);
        
        if (profilesData) {
          profilesData.forEach(p => {
            usersMap[p.id] = p;
          });
        }
      }

      // Adicionar dados dos usuários às tarefas
      const tasksWithUsers = (data || []).map(task => ({
        ...task,
        responsavel: task.responsavel_id ? usersMap[task.responsavel_id] : null,
        created_by_user: task.created_by ? usersMap[task.created_by] : null,
      }));

      setTasks(tasksWithUsers);
    } catch (error: any) {
      console.error("Error loading tasks:", error);
      toast.error("Erro ao carregar tarefas");
    } finally {
      setLoading(false);
    }
  };

  const handleNewTask = () => {
    setSelectedTask(null);
    setTaskDialogOpen(true);
  };

  const handleEditTask = (task: any) => {
    setSelectedTask(task);
    setTaskDialogOpen(true);
  };

  const handleToggleComplete = async (task: any) => {
    try {
      const newStatus =
        task.status === "concluida" ? "pendente" : "concluida";
      const { error } = await supabase
        .from("tasks")
        .update({
          status: newStatus,
          completed_at: newStatus === "concluida" ? new Date().toISOString() : null,
        })
        .eq("id", task.id);

      if (error) throw error;
      toast.success(
        newStatus === "concluida"
          ? "Tarefa marcada como concluída!"
          : "Tarefa reaberta!"
      );
      loadTasks();
    } catch (error: any) {
      console.error("Error updating task:", error);
      toast.error("Erro ao atualizar tarefa");
    }
  };

  const getStatusBadge = (status: string) => {
    const configs: Record<string, { label: string; variant: any; icon: any }> =
      {
        pendente: {
          label: "Pendente",
          variant: "default",
          icon: Clock,
        },
        em_andamento: {
          label: "Em Andamento",
          variant: "default",
          icon: AlertCircle,
        },
        concluida: {
          label: "Concluída",
          variant: "default",
          icon: CheckCircle2,
        },
        cancelada: {
          label: "Cancelada",
          variant: "secondary",
          icon: XCircle,
        },
      };
    const config = configs[status] || {
      label: status,
      variant: "default",
      icon: CheckSquare,
    };
    const Icon = config.icon;
    return (
      <Badge variant={config.variant} className="gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPrioridadeBadge = (prioridade: string) => {
    const configs: Record<string, { label: string; variant: any }> = {
      baixa: { label: "Baixa", variant: "secondary" },
      media: { label: "Média", variant: "default" },
      alta: { label: "Alta", variant: "default" },
      urgente: { label: "Urgente", variant: "destructive" },
    };
    const config = configs[prioridade] || {
      label: prioridade,
      variant: "default",
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const isOverdue = (dataVencimento: string) => {
    if (!dataVencimento) return false;
    return new Date(dataVencimento) < new Date() && new Date(dataVencimento).toDateString() !== new Date().toDateString();
  };

  const filteredTasks = tasks.filter((task) => {
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      return (
        task.titulo?.toLowerCase().includes(term) ||
        task.descricao?.toLowerCase().includes(term) ||
        task.contact?.nome?.toLowerCase().includes(term) ||
        task.opportunity?.nome?.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Tarefas e Atividades</h1>
          <p className="text-muted-foreground">
            Gerencie tarefas relacionadas a contatos e oportunidades
          </p>
        </div>
        <Button onClick={handleNewTask} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Tarefa
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="pendentes">Pendentes</TabsTrigger>
          <TabsTrigger value="vencidas">Vencidas</TabsTrigger>
          <TabsTrigger value="minhas">Minhas Tarefas</TabsTrigger>
          <TabsTrigger value="todas">Todas</TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="space-y-4">
          {/* Filtros */}
          <Card className="glass-strong p-4">
            <div className="grid gap-4 md:grid-cols-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar por título ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todos os Status</SelectItem>
                  <SelectItem value="pendente">Pendente</SelectItem>
                  <SelectItem value="em_andamento">Em Andamento</SelectItem>
                  <SelectItem value="concluida">Concluída</SelectItem>
                  <SelectItem value="cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterPrioridade}
                onValueChange={setFilterPrioridade}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Prioridade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="todos">Todas as Prioridades</SelectItem>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </Card>

          {/* Tabela */}
          {loading ? (
            <div className="text-center py-12 text-muted-foreground">
              Carregando tarefas...
            </div>
          ) : filteredTasks.length === 0 ? (
            <Card className="glass-strong p-12 text-center">
              <CheckSquare className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">
                Nenhuma tarefa encontrada. Clique em "Nova Tarefa" para
                começar.
              </p>
            </Card>
          ) : (
            <Card className="glass-strong">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Relacionado a</TableHead>
                    <TableHead>Vencimento</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Responsável</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTasks.map((task) => (
                    <TableRow
                      key={task.id}
                      className={
                        isOverdue(task.data_vencimento) &&
                        task.status !== "concluida"
                          ? "bg-red-50 dark:bg-red-950/20"
                          : ""
                      }
                    >
                      <TableCell>
                        <div>
                          <div className="font-medium">{task.titulo}</div>
                          {task.descricao && (
                            <div className="text-xs text-muted-foreground mt-1 line-clamp-1">
                              {task.descricao}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {task.contact ? (
                          <div className="text-sm">
                            <div className="font-medium">{task.contact.nome}</div>
                            {task.contact.empresa && (
                              <div className="text-xs text-muted-foreground">
                                {task.contact.empresa}
                              </div>
                            )}
                          </div>
                        ) : task.opportunity ? (
                          <div className="text-sm">{task.opportunity.nome}</div>
                        ) : (
                          "-"
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          {task.data_vencimento
                            ? new Date(
                                task.data_vencimento
                              ).toLocaleDateString("pt-BR")
                            : "-"}
                          {isOverdue(task.data_vencimento) &&
                            task.status !== "concluida" && (
                              <Badge variant="destructive" className="text-xs">
                                Vencida
                              </Badge>
                            )}
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(task.status)}</TableCell>
                      <TableCell>
                        {getPrioridadeBadge(task.prioridade)}
                      </TableCell>
                      <TableCell>
                        {task.responsavel?.full_name || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleToggleComplete(task)}
                          >
                            {task.status === "concluida" ? (
                              <XCircle className="h-4 w-4" />
                            ) : (
                              <CheckCircle2 className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditTask(task)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <TaskFormDialog
        open={taskDialogOpen}
        onOpenChange={setTaskDialogOpen}
        task={selectedTask}
        onSuccess={() => {
          loadTasks();
          setSelectedTask(null);
        }}
      />
    </div>
  );
}

