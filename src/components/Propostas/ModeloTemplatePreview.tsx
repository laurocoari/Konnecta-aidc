import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, Monitor, Smartphone } from "lucide-react";
import { useState } from "react";
import { processTemplateVariables, ProposalData } from "@/lib/proposalTemplateEngine";

interface ModeloTemplatePreviewProps {
  modelo: any;
  onClose: () => void;
}

export function ModeloTemplatePreview({ modelo, onClose }: ModeloTemplatePreviewProps) {
  const [viewMode, setViewMode] = useState<"desktop" | "mobile">("desktop");

  // Dados de exemplo para preview
  const exampleData: ProposalData = {
    empresa: {
      nome: modelo.empresa_nome || "Konnecta Consultoria",
      cnpj: modelo.empresa_cnpj || "05.601.700/0001-55",
      endereco: modelo.empresa_endereco || "Rua Rio Ebro, Nº7, QD12",
      telefone: modelo.empresa_telefone || "(92) 3242-1311",
      email: modelo.empresa_email || "contato@konnecta.com.br",
      logo_url: modelo.empresa_logo_url || "",
    },
    cliente: {
      nome: "Cliente Exemplo Ltda",
      cnpj: "12.345.678/0001-90",
      endereco: "Av. Exemplo, 123",
      cidade: "Manaus",
      estado: "AM",
      pessoa_contato: "João Silva",
      telefone: "(92) 99999-9999",
      email: "contato@exemplo.com.br",
    },
    proposta: {
      numero: "KPROP-2025-001",
      versao: 1,
      data_emissao: new Date().toISOString(),
      validade: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
    },
    responsavel: {
      nome: "Maria Santos",
      email: "maria@konnecta.com.br",
    },
    itens: [
      {
        descricao: "Produto Exemplo 1",
        codigo: "PROD-001",
        unidade: "un",
        quantidade: 2,
        preco_lista: 1000,
        desconto: 10,
        preco_unitario: 900,
        total: 1800,
      },
      {
        descricao: "Produto Exemplo 2",
        codigo: "PROD-002",
        unidade: "un",
        quantidade: 1,
        preco_lista: 2000,
        desconto: 5,
        preco_unitario: 1900,
        total: 1900,
      },
    ],
    totais: {
      total_itens: 2,
      soma_quantidades: 3,
      desconto_total: 200,
      subtotal: 3700,
      frete: 100,
      outras_despesas: 0,
      total_geral: 3800,
    },
    custom: {},
  };

  // Processar template
  let previewHtml = "";
  if (modelo.apresentacao_html) {
    previewHtml = processTemplateVariables(modelo.apresentacao_html, exampleData);
  }

  return (
    <Card className="p-4 mt-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-semibold">Preview do Modelo</h4>
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant={viewMode === "desktop" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("desktop")}
          >
            <Monitor className="h-4 w-4" />
          </Button>
          <Button
            type="button"
            variant={viewMode === "mobile" ? "default" : "outline"}
            size="sm"
            onClick={() => setViewMode("mobile")}
          >
            <Smartphone className="h-4 w-4" />
          </Button>
          <Button type="button" variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div
        className={`border rounded-lg bg-white p-6 ${
          viewMode === "mobile" ? "max-w-sm mx-auto" : "w-full"
        }`}
      >
        <div className="prose max-w-none">
          <div
            dangerouslySetInnerHTML={{ __html: previewHtml }}
            className="proposal-preview"
          />
        </div>
      </div>

      <style jsx global>{`
        .proposal-preview {
          font-family: Arial, sans-serif;
          font-size: 12pt;
          line-height: 1.6;
        }
        .proposal-preview h1,
        .proposal-preview h2,
        .proposal-preview h3 {
          color: #1e40af;
          margin-top: 1em;
          margin-bottom: 0.5em;
        }
        .proposal-preview p {
          margin-bottom: 1em;
        }
        .proposal-preview table {
          width: 100%;
          border-collapse: collapse;
          margin: 1em 0;
        }
        .proposal-preview table th,
        .proposal-preview table td {
          border: 1px solid #ddd;
          padding: 8px;
          text-align: left;
        }
        .proposal-preview table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        ${modelo.css_personalizado || ""}
      `}</style>
    </Card>
  );
}



