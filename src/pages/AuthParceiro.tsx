import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { UserCheck } from "lucide-react";

export default function AuthParceiro() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/central-parceiro");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/central-parceiro");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Login realizado com sucesso!");
    }

    setLoading(false);
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const nomeFantasia = formData.get("nomeFantasia") as string;
    const razaoSocial = formData.get("razaoSocial") as string;
    const cnpj = formData.get("cnpj") as string;
    const telefone = formData.get("telefone") as string;
    const cidade = formData.get("cidade") as string;
    const estado = formData.get("estado") as string;

    try {
      // Criar usuário no auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: "revendedor",
          },
          emailRedirectTo: `${window.location.origin}/auth/parceiro?approved=true`,
        },
      });

      if (authError) {
        toast.error(authError.message);
        setLoading(false);
        return;
      }

      if (!authData.user) {
        toast.error("Erro ao criar conta");
        setLoading(false);
        return;
      }

      // Criar registro na tabela partners com status pendente
      const { error: partnerError } = await supabase
        .from("partners")
        .insert({
          user_id: authData.user.id,
          nome_fantasia: nomeFantasia,
          razao_social: razaoSocial,
          cnpj: cnpj.replace(/\D/g, ""),
          email: email,
          telefone: telefone,
          cidade: cidade,
          estado: estado.toUpperCase(),
          approval_status: "pendente",
          status: "inativo", // Inativo até ser aprovado
        });

      if (partnerError) {
        logger.error("DB", "Erro ao criar registro de parceiro", partnerError);
        toast.error(partnerError.message || "Erro ao criar registro de parceiro");
        // Nota: O usuário foi criado no auth mas não será deletado automaticamente
        // Um admin pode deletar manualmente se necessário
        setLoading(false);
        return;
      }

      toast.success(
        "Cadastro realizado com sucesso! Aguarde a aprovação do administrador. Você receberá um email quando sua conta for aprovada."
      );
      
      // Limpar formulário
      e.currentTarget.reset();
    } catch (error: any) {
      toast.error(error.message || "Erro ao criar conta");
    }

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="glass-strong w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <UserCheck className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-primary">Central do Parceiro</h1>
          <p className="text-sm text-muted-foreground">Portal exclusivo para revendedores Konnecta</p>
        </div>

        <Tabs defaultValue="login" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="login">Login</TabsTrigger>
            <TabsTrigger value="signup">Cadastro</TabsTrigger>
          </TabsList>

          <TabsContent value="login">
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-mail</Label>
                <Input
                  id="login-email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Senha</Label>
                <Input
                  id="login-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  required
                />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Entrando..." : "Entrar"}
              </Button>
            </form>
          </TabsContent>

          <TabsContent value="signup">
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-name">Nome Completo</Label>
                <Input
                  id="signup-name"
                  name="fullName"
                  placeholder="Seu nome completo"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-email">E-mail</Label>
                <Input
                  id="signup-email"
                  name="email"
                  type="email"
                  placeholder="seu@email.com"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-password">Senha</Label>
                <Input
                  id="signup-password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-nome-fantasia">Nome Fantasia</Label>
                <Input
                  id="signup-nome-fantasia"
                  name="nomeFantasia"
                  placeholder="Nome da sua empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-razao-social">Razão Social</Label>
                <Input
                  id="signup-razao-social"
                  name="razaoSocial"
                  placeholder="Razão social da empresa"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-cnpj">CNPJ</Label>
                <Input
                  id="signup-cnpj"
                  name="cnpj"
                  placeholder="00.000.000/0000-00"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-telefone">Telefone</Label>
                  <Input
                    id="signup-telefone"
                    name="telefone"
                    placeholder="(00) 00000-0000"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-estado">Estado</Label>
                  <Input
                    id="signup-estado"
                    name="estado"
                    placeholder="SP"
                    maxLength={2}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="signup-cidade">Cidade</Label>
                <Input
                  id="signup-cidade"
                  name="cidade"
                  placeholder="Sua cidade"
                  required
                />
              </div>
              <div className="rounded-lg bg-muted p-3 text-sm text-muted-foreground">
                <p className="font-medium mb-1">⚠️ Atenção</p>
                <p>Seu cadastro será analisado pela equipe Konnecta. Você receberá um email quando sua conta for aprovada.</p>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando conta..." : "Solicitar Cadastro como Parceiro"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>

        <div className="mt-6 text-center">
          <Button
            variant="link"
            onClick={() => navigate("/")}
            className="text-sm text-muted-foreground"
          >
            Voltar para página inicial
          </Button>
        </div>
      </Card>
    </div>
  );
}
