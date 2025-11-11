import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Settings, User, Bell, Shield, Database, Mail } from "lucide-react";
import { toast } from "sonner";

export default function Configuracoes() {
  const handleSave = () => {
    toast.success("Configurações salvas com sucesso!");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações do sistema
        </p>
      </div>

      <Tabs defaultValue="geral" className="space-y-6">
        <TabsList className="grid w-full max-w-2xl grid-cols-5">
          <TabsTrigger value="geral">Geral</TabsTrigger>
          <TabsTrigger value="perfil">Perfil</TabsTrigger>
          <TabsTrigger value="notificacoes">Notificações</TabsTrigger>
          <TabsTrigger value="seguranca">Segurança</TabsTrigger>
          <TabsTrigger value="integracao">Integração</TabsTrigger>
        </TabsList>

        <TabsContent value="geral">
          <Card className="glass-strong p-6">
            <div className="flex items-center gap-3 mb-6">
              <Settings className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Configurações Gerais</h2>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="empresa">Nome da Empresa</Label>
                <Input id="empresa" defaultValue="Konnecta CRM" />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cnpj">CNPJ</Label>
                  <Input id="cnpj" defaultValue="00.000.000/0000-00" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="telefone">Telefone</Label>
                  <Input id="telefone" defaultValue="(00) 0000-0000" />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="endereco">Endereço</Label>
                <Input id="endereco" defaultValue="Rua Exemplo, 123 - Centro" />
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Preferências do Sistema</h3>
                
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Moeda Padrão</Label>
                    <p className="text-sm text-muted-foreground">Real Brasileiro (BRL)</p>
                  </div>
                  <Switch defaultChecked />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Formato de Data</Label>
                    <p className="text-sm text-muted-foreground">DD/MM/YYYY</p>
                  </div>
                  <Switch defaultChecked />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancelar</Button>
                <Button onClick={handleSave}>Salvar Alterações</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="perfil">
          <Card className="glass-strong p-6">
            <div className="flex items-center gap-3 mb-6">
              <User className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Perfil do Usuário</h2>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="nome">Nome Completo</Label>
                  <Input id="nome" defaultValue="Administrador" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">E-mail</Label>
                  <Input id="email" type="email" defaultValue="admin@konnecta.com" />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="cargo">Cargo</Label>
                  <Input id="cargo" defaultValue="Administrador" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="departamento">Departamento</Label>
                  <Input id="departamento" defaultValue="TI" />
                </div>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="text-sm font-semibold">Alterar Senha</h3>
                
                <div className="space-y-2">
                  <Label htmlFor="senha-atual">Senha Atual</Label>
                  <Input id="senha-atual" type="password" />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="nova-senha">Nova Senha</Label>
                    <Input id="nova-senha" type="password" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirmar-senha">Confirmar Senha</Label>
                    <Input id="confirmar-senha" type="password" />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancelar</Button>
                <Button onClick={handleSave}>Salvar Alterações</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="notificacoes">
          <Card className="glass-strong p-6">
            <div className="flex items-center gap-3 mb-6">
              <Bell className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Notificações</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Alertas de Contratos Vencendo</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba notificações sobre contratos próximos do vencimento
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Propostas Aguardando Resposta</Label>
                  <p className="text-sm text-muted-foreground">
                    Alerta quando propostas ficam sem resposta por mais de 3 dias
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Novos Leads no Funil</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificações sobre novos leads cadastrados
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Relatórios Semanais</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba relatórios automáticos toda segunda-feira
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Notificações por E-mail</Label>
                  <p className="text-sm text-muted-foreground">
                    Receber notificações também por e-mail
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancelar</Button>
                <Button onClick={handleSave}>Salvar Preferências</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="seguranca">
          <Card className="glass-strong p-6">
            <div className="flex items-center gap-3 mb-6">
              <Shield className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Segurança</h2>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Autenticação de Dois Fatores</Label>
                  <p className="text-sm text-muted-foreground">
                    Adicione uma camada extra de segurança
                  </p>
                </div>
                <Switch />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Logs de Auditoria</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar todas as ações dos usuários
                  </p>
                </div>
                <Switch defaultChecked />
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Sessões Ativas</Label>
                <p className="text-sm text-muted-foreground mb-4">
                  1 sessão ativa no momento
                </p>
                <Button variant="destructive" size="sm">
                  Encerrar Todas as Sessões
                </Button>
              </div>

              <div className="flex justify-end gap-2 pt-4">
                <Button variant="outline">Cancelar</Button>
                <Button onClick={handleSave}>Salvar Configurações</Button>
              </div>
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="integracao">
          <Card className="glass-strong p-6">
            <div className="flex items-center gap-3 mb-6">
              <Database className="h-5 w-5" />
              <h2 className="text-xl font-semibold">Integrações</h2>
            </div>

            <div className="space-y-6">
              <Card className="glass p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">WhatsApp Business</h3>
                      <p className="text-sm text-muted-foreground">
                        Enviar propostas e notificações via WhatsApp
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Conectar</Button>
                </div>
              </Card>

              <Card className="glass p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Mail className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">E-mail SMTP</h3>
                      <p className="text-sm text-muted-foreground">
                        Configurar servidor de e-mail personalizado
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Configurar</Button>
                </div>
              </Card>

              <Card className="glass p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Database className="h-8 w-8 text-primary" />
                    <div>
                      <h3 className="font-semibold">Sistema Contábil</h3>
                      <p className="text-sm text-muted-foreground">
                        Integrar com software de contabilidade
                      </p>
                    </div>
                  </div>
                  <Button variant="outline">Integrar</Button>
                </div>
              </Card>
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
