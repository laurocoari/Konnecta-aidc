import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { Shield, UserCheck } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-primary/20 via-background to-secondary/20 p-4">
      <div className="text-center space-y-8 max-w-4xl">
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-primary">Konnecta CRM</h1>
          <p className="text-xl text-muted-foreground">Sistema de Gestão Comercial</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mt-12">
          <Card className="glass-strong p-8 space-y-4 hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate("/auth")}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <Shield className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Sistema Administrativo</h2>
            <p className="text-muted-foreground">
              Acesso para administradores e equipe comercial
            </p>
            <Button className="w-full" size="lg">
              Entrar como Admin
            </Button>
          </Card>

          <Card className="glass-strong p-8 space-y-4 hover:scale-105 transition-transform cursor-pointer" onClick={() => navigate("/auth/parceiro")}>
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-bold">Central do Parceiro</h2>
            <p className="text-muted-foreground">
              Portal exclusivo para revendedores e parceiros
            </p>
            <Button className="w-full" size="lg" variant="outline">
              Entrar como Parceiro
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Index;
