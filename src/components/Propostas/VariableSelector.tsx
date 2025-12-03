import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Code, Search } from "lucide-react";

interface VariableSelectorProps {
  onSelect: (variable: string) => void;
}

const AVAILABLE_VARIABLES = [
  {
    category: "Empresa",
    variables: [
      { name: "empresa.nome", description: "Nome da empresa" },
      { name: "empresa.cnpj", description: "CNPJ da empresa" },
      { name: "empresa.endereco", description: "Endereço completo" },
      { name: "empresa.telefone", description: "Telefone de contato" },
      { name: "empresa.email", description: "E-mail de contato" },
      { name: "empresa.logo_url", description: "URL do logotipo" },
    ],
  },
  {
    category: "Cliente",
    variables: [
      { name: "cliente.nome", description: "Nome do cliente" },
      { name: "cliente.cnpj", description: "CNPJ do cliente" },
      { name: "cliente.endereco", description: "Endereço do cliente" },
      { name: "cliente.cidade", description: "Cidade do cliente" },
      { name: "cliente.estado", description: "Estado (UF)" },
      { name: "cliente.pessoa_contato", description: "Pessoa de contato" },
      { name: "cliente.telefone", description: "Telefone do cliente" },
      { name: "cliente.email", description: "E-mail do cliente" },
    ],
  },
  {
    category: "Proposta",
    variables: [
      { name: "proposta.numero", description: "Número da proposta" },
      { name: "proposta.versao", description: "Versão da proposta" },
      { name: "proposta.data_emissao", description: "Data de emissão" },
      { name: "proposta.validade", description: "Data de validade" },
    ],
  },
  {
    category: "Responsável",
    variables: [
      { name: "responsavel.nome", description: "Nome do responsável" },
      { name: "responsavel.email", description: "E-mail do responsável" },
    ],
  },
  {
    category: "Itens",
    variables: [
      { name: "itens.tabela", description: "Tabela completa de itens" },
    ],
  },
  {
    category: "Totais",
    variables: [
      { name: "totais.total_itens", description: "Total de itens" },
      { name: "totais.soma_quantidades", description: "Soma das quantidades" },
      { name: "totais.desconto_total", description: "Desconto total" },
      { name: "totais.subtotal", description: "Subtotal" },
      { name: "totais.frete", description: "Valor do frete" },
      { name: "totais.outras_despesas", description: "Outras despesas" },
      { name: "totais.total_geral", description: "Total geral" },
    ],
  },
  {
    category: "Customizadas",
    variables: [
      { name: "custom.*", description: "Variáveis personalizadas do modelo" },
    ],
  },
];

export function VariableSelector({ onSelect }: VariableSelectorProps) {
  const [open, setOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const filteredVariables = AVAILABLE_VARIABLES.map((category) => ({
    ...category,
    variables: category.variables.filter(
      (v) =>
        v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        v.description.toLowerCase().includes(searchTerm.toLowerCase())
    ),
  })).filter((category) => category.variables.length > 0);

  const handleSelect = (variable: string) => {
    // Remover .* de variáveis customizadas
    const cleanVariable = variable.replace(/\.\*$/, "");
    onSelect(cleanVariable);
    setOpen(false);
    setSearchTerm("");
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-2"
        >
          <Code className="h-4 w-4" />
          Inserir Variável
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="start">
        <div className="p-4 border-b">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar variável..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-8"
            />
          </div>
        </div>
        <ScrollArea className="h-[400px]">
          <div className="p-2">
            {filteredVariables.map((category) => (
              <div key={category.category} className="mb-4">
                <h4 className="text-sm font-semibold mb-2 px-2">
                  {category.category}
                </h4>
                <div className="space-y-1">
                  {category.variables.map((variable) => (
                    <button
                      key={variable.name}
                      type="button"
                      onClick={() => handleSelect(variable.name)}
                      className="w-full text-left px-3 py-2 rounded-md hover:bg-accent hover:text-accent-foreground transition-colors text-sm"
                    >
                      <div className="font-mono text-xs text-primary mb-1">
                        {`{{${variable.name}}}`}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {variable.description}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </PopoverContent>
    </Popover>
  );
}



