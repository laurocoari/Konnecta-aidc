import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextEditor } from "./RichTextEditor";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Trash2, GripVertical } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";

export interface CondicaoComercial {
  id: string;
  tipo: string;
  titulo: string;
  conteudo: string;
  ativo: boolean;
  ordem: number;
}

interface CondicoesComerciaisEditorProps {
  blocos: CondicaoComercial[];
  onChange: (blocos: CondicaoComercial[]) => void;
}

const TIPOS_BLOCOS = [
  { value: "condicoes_pagamento", label: "Condições de Pagamento" },
  { value: "observacoes_gerais", label: "Observações Gerais" },
  { value: "obrigacoes_cliente", label: "Obrigações do Cliente" },
  { value: "obrigacoes_konnecta", label: "Obrigações da Konnecta" },
  { value: "requisitos_tecnicos", label: "Requisitos Técnicos" },
  { value: "informacoes_instalacao", label: "Informações de Instalação" },
  { value: "sla_prazos", label: "SLA / Prazos" },
  { value: "politica_devolucao", label: "Política de Devolução / Desistência" },
  { value: "garantia", label: "Garantia" },
  { value: "equipamentos_incluidos", label: "Equipamentos Incluídos" },
  { value: "equipamentos_nao_incluidos", label: "Equipamentos Não Incluídos" },
  { value: "classificacao_fiscal", label: "Classificação Fiscal" },
  { value: "custom", label: "Personalizado" },
];

export function CondicoesComerciaisEditor({
  blocos,
  onChange,
}: CondicoesComerciaisEditorProps) {
  const [expandedBlock, setExpandedBlock] = useState<string | null>(null);

  const addBlock = () => {
    const newBlock: CondicaoComercial = {
      id: `block-${Date.now()}`,
      tipo: "custom",
      titulo: "",
      conteudo: "",
      ativo: true,
      ordem: blocos.length,
    };
    onChange([...blocos, newBlock]);
    setExpandedBlock(newBlock.id);
  };

  const removeBlock = (id: string) => {
    onChange(blocos.filter((b) => b.id !== id));
    if (expandedBlock === id) {
      setExpandedBlock(null);
    }
  };

  const updateBlock = (id: string, updates: Partial<CondicaoComercial>) => {
    onChange(
      blocos.map((b) => (b.id === id ? { ...b, ...updates } : b))
    );
  };

  const toggleBlock = (id: string) => {
    setExpandedBlock(expandedBlock === id ? null : id);
  };

  const moveBlock = (id: string, direction: "up" | "down") => {
    const index = blocos.findIndex((b) => b.id === id);
    if (index === -1) return;

    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= blocos.length) return;

    const newBlocos = [...blocos];
    [newBlocos[index], newBlocos[newIndex]] = [
      newBlocos[newIndex],
      newBlocos[index],
    ];

    // Atualizar ordens
    newBlocos.forEach((b, i) => {
      b.ordem = i;
    });

    onChange(newBlocos);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label>Blocos de Condições Comerciais</Label>
        <Button type="button" onClick={addBlock} size="sm" variant="outline">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Bloco
        </Button>
      </div>

      {blocos.length === 0 ? (
        <Card className="p-8 text-center text-muted-foreground">
          <p>Nenhum bloco adicionado. Clique em "Adicionar Bloco" para começar.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {blocos.map((bloco, index) => (
            <Card key={bloco.id} className="p-4">
              <div className="flex items-start gap-3">
                <div className="flex flex-col gap-1 pt-2">
                  <button
                    type="button"
                    onClick={() => moveBlock(bloco.id, "up")}
                    disabled={index === 0}
                    className="p-1 hover:bg-accent rounded disabled:opacity-50"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => moveBlock(bloco.id, "down")}
                    disabled={index === blocos.length - 1}
                    className="p-1 hover:bg-accent rounded disabled:opacity-50"
                  >
                    <GripVertical className="h-4 w-4" />
                  </button>
                </div>

                <div className="flex-1 space-y-3">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={bloco.ativo}
                      onCheckedChange={(checked) =>
                        updateBlock(bloco.id, { ativo: checked as boolean })
                      }
                    />
                    <Select
                      value={bloco.tipo}
                      onValueChange={(value) =>
                        updateBlock(bloco.id, {
                          tipo: value,
                          titulo:
                            TIPOS_BLOCOS.find((t) => t.value === value)?.label ||
                            "",
                        })
                      }
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {TIPOS_BLOCOS.map((tipo) => (
                          <SelectItem key={tipo.value} value={tipo.value}>
                            {tipo.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeBlock(bloco.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {bloco.tipo === "custom" && (
                    <div>
                      <Label>Título do Bloco</Label>
                      <Input
                        value={bloco.titulo}
                        onChange={(e) =>
                          updateBlock(bloco.id, { titulo: e.target.value })
                        }
                        placeholder="Ex: Condições Especiais"
                      />
                    </div>
                  )}

                  <div>
                    <Label>Conteúdo</Label>
                    <RichTextEditor
                      value={bloco.conteudo}
                      onChange={(value) =>
                        updateBlock(bloco.id, { conteudo: value })
                      }
                      placeholder="Digite o conteúdo deste bloco..."
                    />
                  </div>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}



