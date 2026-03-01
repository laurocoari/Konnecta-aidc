import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [savedEmail, setSavedEmail] = useState("");
  const [savedPassword, setSavedPassword] = useState("");

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate("/dashboard");
      }
    });

    // Carregar credenciais salvas do localStorage
    const savedCredentials = localStorage.getItem("konnecta_saved_credentials");
    if (savedCredentials) {
      try {
        const { email, password } = JSON.parse(savedCredentials);
        setSavedEmail(email || "");
        setSavedPassword(password || "");
        setRememberMe(true);
      } catch (error) {
        console.error("Erro ao carregar credenciais salvas:", error);
      }
    }

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    // Usar valores dos estados (campos controlados)
    const email = savedEmail.trim();
    const password = savedPassword;

    if (!email || !password) {
      toast.error("Por favor, preencha todos os campos");
      setLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Salvar credenciais se "Lembrar senha" estiver marcado
      if (rememberMe) {
        localStorage.setItem(
          "konnecta_saved_credentials",
          JSON.stringify({ email, password })
        );
      } else {
        // Remover credenciais salvas se não quiser lembrar
        localStorage.removeItem("konnecta_saved_credentials");
        // Limpar campos também
        setSavedEmail("");
        setSavedPassword("");
      }
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

    const { data: authData, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: "admin", // Assumindo que Auth.tsx é para admin
        },
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

    if (error) {
      toast.error(error.message);
    } else {
      // Enviar email de boas-vindas para admin
      if (authData.user) {
        try {
          await supabase.functions.invoke("send-welcome-email", {
            body: {
              type: "admin_welcome",
              email: email,
              fullName: fullName,
            },
          });
        } catch (emailErr) {
          console.warn("Erro ao enviar email de boas-vindas:", emailErr);
        }
      }
      toast.success("Conta criada! Você será redirecionado...");
    }

    setLoading(false);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      toast.error("Por favor, informe seu e-mail");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail.trim(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("E-mail de recuperação enviado! Verifique sua caixa de entrada.");
      setShowForgotPassword(false);
    }
    setLoading(false);
  };

  if (showForgotPassword) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
        <Card className="glass-strong w-full max-w-md p-8">
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold text-primary">Konnecta CRM</h1>
            <p className="text-sm text-muted-foreground">Recuperação de Senha</p>
          </div>
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="forgot-email">E-mail cadastrado</Label>
              <Input
                id="forgot-email"
                type="email"
                placeholder="seu@email.com"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Enviaremos um link para redefinir sua senha.
            </p>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Enviando..." : "Enviar Link de Recuperação"}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <Button
              variant="link"
              onClick={() => setShowForgotPassword(false)}
              className="text-sm text-muted-foreground"
            >
              Voltar para Login
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <Card className="glass-strong w-full max-w-md p-8">
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold text-primary">Konnecta CRM</h1>
          <p className="text-sm text-muted-foreground">Sistema Administrativo</p>
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
                  value={savedEmail}
                  onChange={(e) => setSavedEmail(e.target.value)}
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
                  value={savedPassword}
                  onChange={(e) => setSavedPassword(e.target.value)}
                  required
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="remember"
                    name="remember"
                    checked={rememberMe}
                    onCheckedChange={(checked) => setRememberMe(checked === true)}
                  />
                  <Label
                    htmlFor="remember"
                    className="text-sm font-normal cursor-pointer"
                  >
                    Lembrar senha
                  </Label>
                </div>
                <Button
                  type="button"
                  variant="link"
                  className="text-xs text-muted-foreground p-0 h-auto"
                  onClick={() => setShowForgotPassword(true)}
                >
                  Esqueci minha senha
                </Button>
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
                  placeholder="Seu nome"
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
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Criando conta..." : "Criar Conta"}
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
