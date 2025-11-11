import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileStack } from "lucide-react";
import ModelosPropostas from "./ModelosPropostas";
import ModelosContratos from "./ModelosContratos";

export default function Modelos() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <FileStack className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Modelos</h1>
          <p className="text-muted-foreground">
            Gerencie modelos de propostas e contratos
          </p>
        </div>
      </div>

      <Tabs defaultValue="propostas" className="space-y-4">
        <TabsList>
          <TabsTrigger value="propostas">Modelos de Propostas</TabsTrigger>
          <TabsTrigger value="contratos">Modelos de Contratos</TabsTrigger>
        </TabsList>
        
        <TabsContent value="propostas" className="space-y-4">
          <ModelosPropostas />
        </TabsContent>
        
        <TabsContent value="contratos" className="space-y-4">
          <ModelosContratos />
        </TabsContent>
      </Tabs>
    </div>
  );
}
