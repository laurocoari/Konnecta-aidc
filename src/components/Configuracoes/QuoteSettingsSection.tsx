import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { DollarSign, Settings, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function QuoteSettingsSection() {
  const [loading, setLoading] = useState(false);
  const [updatingRate, setUpdatingRate] = useState(false);
  const [settings, setSettings] = useState<any>(null);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [formData, setFormData] = useState({
    valor_dolar_atual: 5.0,
    usar_dolar_no_financeiro: false,
    origem_cotacao_padrao: "email",
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("quote_settings")
        .select("*")
        .single();

      if (error && error.code !== "PGRST116") {
        throw error;
      }

      if (data) {
        setSettings(data);
        setFormData({
          valor_dolar_atual: data.valor_dolar_atual || 5.0,
          usar_dolar_no_financeiro: data.usar_dolar_no_financeiro || false,
          origem_cotacao_padrao: data.origem_cotacao_padrao || "email",
        });
        if (data.updated_at) {
          const date = new Date(data.updated_at);
          setLastUpdate(date.toLocaleString("pt-BR"));
        }
      }
    } catch (error: any) {
      console.error("Error loading settings:", error);
    }
  };

  const handleUpdateDollarRate = async () => {
    setUpdatingRate(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error("Usuário não autenticado");
      }

      const response = await supabase.functions.invoke("atualizar-cotacao-dolar", {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || "Erro ao atualizar cotação");
      }

      const result = response.data;

      if (!result || !result.success) {
        throw new Error(result?.error || "Erro desconhecido");
      }

      toast.success(result.message || "Cotação atualizada com sucesso!");
      await loadSettings();
    } catch (error: any) {
      console.error("Error updating dollar rate:", error);
      toast.error(error.message || "Erro ao atualizar cotação do dólar");
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const settingsData = {
        valor_dolar_atual: parseFloat(formData.valor_dolar_atual.toString()) || 5.0,
        usar_dolar_no_financeiro: formData.usar_dolar_no_financeiro,
        origem_cotacao_padrao: formData.origem_cotacao_padrao,
      };

      if (settings) {
        const { error } = await supabase
          .from("quote_settings")
          .update(settingsData)
          .eq("id", settings.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("quote_settings")
          .insert(settingsData);

        if (error) throw error;
      }

      toast.success("Configurações salvas com sucesso!");
      await loadSettings();
    } catch (error: any) {
      console.error("Error saving settings:", error);
      toast.error(error.message || "Erro ao salvar configurações");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="glass-strong p-6">
      <div className="flex items-center gap-3 mb-6">
        <DollarSign className="h-5 w-5" />
        <h2 className="text-xl font-semibold">Configurações de Cotações</h2>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="valor_dolar_atual">Valor Atual do Dólar (R$)</Label>
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdateDollarRate}
              disabled={updatingRate}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${updatingRate ? "animate-spin" : ""}`} />
              Atualizar do BCB
            </Button>
          </div>
          <div className="flex gap-2">
            <Input
              id="valor_dolar_atual"
              type="number"
              step="0.0001"
              value={formData.valor_dolar_atual}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  valor_dolar_atual: parseFloat(e.target.value) || 5.0,
                })
              }
              className="flex-1"
            />
            <a
              href="https://www.bcb.gov.br/estabilidadefinanceira/cotacoes"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1 px-3 py-2 border rounded-md hover:bg-muted transition-colors"
            >
              <ExternalLink className="h-4 w-4" />
              <span className="text-sm">BCB</span>
            </a>
          </div>
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Taxa de câmbio PTAX usada para converter valores de USD para BRL
            </p>
            {lastUpdate && (
              <p className="text-xs text-muted-foreground">
                Última atualização: {lastUpdate}
              </p>
            )}
          </div>
        </div>

        <Separator />

        <div className="space-y-2">
          <Label htmlFor="origem_cotacao_padrao">Origem Padrão de Cotações</Label>
          <select
            id="origem_cotacao_padrao"
            value={formData.origem_cotacao_padrao}
            onChange={(e) =>
              setFormData({ ...formData, origem_cotacao_padrao: e.target.value })
            }
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <option value="email">E-mail</option>
            <option value="pdf">PDF</option>
            <option value="excel">Excel/CSV</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={loadSettings}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </div>
    </Card>
  );
}

