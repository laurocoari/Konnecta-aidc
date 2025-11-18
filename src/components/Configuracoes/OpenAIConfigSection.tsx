import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Brain, Key, Settings, TestTube, CheckCircle2, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

export function OpenAIConfigSection() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [formData, setFormData] = useState({
    api_key: "",
    model: "gpt-4o-mini",
    max_tokens: 2000,
    enabled: false,
  });

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const { data, error } = await supabase
        .from("openai_config")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setConfig(data);
        setFormData({
          api_key: "", // Nunca mostrar a chave
          model: data.model || "gpt-4o-mini",
          max_tokens: data.max_tokens || 2000,
          enabled: data.enabled || false,
        });
      }
    } catch (error: any) {
      console.error("Error loading config:", error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const configData = {
        api_key_encrypted: formData.api_key || config?.api_key_encrypted,
        model: formData.model,
        max_tokens: formData.max_tokens,
        enabled: formData.enabled,
        updated_by: user?.id,
      };

      if (config) {
        const { error } = await supabase
          .from("openai_config")
          .update(configData)
          .eq("id", config.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("openai_config")
          .insert(configData);

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      await loadConfig();
    } catch (error: any) {
      console.error("Error saving config:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  const handleTest = async () => {
    if (!formData.api_key && !config?.api_key_encrypted) {
      toast.error("Configure a API Key antes de testar");
      return;
    }

    setTesting(true);
    try {
      const apiKey = formData.api_key || config?.api_key_encrypted;

      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        toast.success("Conexão com OpenAI testada com sucesso!");
      } else {
        const error = await response.json();
        throw new Error(error.error?.message || "Erro ao conectar com OpenAI");
      }
    } catch (error: any) {
      console.error("Error testing connection:", error);
      toast.error(error.message || "Erro ao testar conexão");
    } finally {
      setTesting(false);
    }
  };

  return (
    <Card className="glass-strong p-6">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-5 w-5" />
        <h2 className="text-xl font-semibold">IA e Automação</h2>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <Label>Ativar Leitura Inteligente de Cotações</Label>
            <p className="text-sm text-muted-foreground">
              Use IA para extrair automaticamente dados de cotações
            </p>
          </div>
          <Switch
            checked={formData.enabled}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, enabled: checked })
            }
          />
        </div>

        <Separator />

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="api_key" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key da OpenAI *
            </Label>
            <Input
              id="api_key"
              type="password"
              value={formData.api_key}
              onChange={(e) =>
                setFormData({ ...formData, api_key: e.target.value })
              }
              placeholder={
                config?.api_key_encrypted
                  ? "•••••••••••• (já configurada)"
                  : "sk-..."
              }
            />
            <p className="text-xs text-muted-foreground">
              A chave será armazenada de forma segura no servidor
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="model" className="flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Modelo
              </Label>
              <Input
                id="model"
                value={formData.model}
                onChange={(e) =>
                  setFormData({ ...formData, model: e.target.value })
                }
                placeholder="gpt-4o-mini"
              />
              <p className="text-xs text-muted-foreground">
                Modelo recomendado: gpt-4o-mini
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max_tokens">Limite de Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={formData.max_tokens}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    max_tokens: parseInt(e.target.value) || 2000,
                  })
                }
              />
              <p className="text-xs text-muted-foreground">
                Máximo de tokens por requisição
              </p>
            </div>
          </div>
        </div>

        <Separator />

        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handleTest}
            disabled={testing}
            className="gap-2"
          >
            <TestTube className="h-4 w-4" />
            {testing ? "Testando..." : "Testar Conexão"}
          </Button>

          <div className="flex gap-2">
            <Button variant="outline" onClick={loadConfig}>
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? "Salvando..." : "Salvar Configurações"}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}

