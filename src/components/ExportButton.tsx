import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";
import { exportToExcel, ExcelColumn } from "@/lib/excelExport";
import { toast } from "sonner";

interface ExportButtonProps {
  filename: string;
  columns: ExcelColumn[];
  data: any[];
  title?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
}

export function ExportButton({
  filename,
  columns,
  data,
  title,
  disabled = false,
  variant = "outline",
  size = "sm",
}: ExportButtonProps) {
  const handleExport = async () => {
    try {
      if (data.length === 0) {
        toast.warning("Nenhum dado para exportar");
        return;
      }

      await exportToExcel({
        filename,
        columns,
        data,
        title,
      });

      toast.success(`Arquivo ${filename}.xlsx exportado com sucesso!`);
    } catch (error: any) {
      console.error("Error exporting to Excel:", error);
      toast.error("Erro ao exportar para Excel: " + (error.message || "Erro desconhecido"));
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleExport}
      disabled={disabled || data.length === 0}
      className="gap-2"
    >
      <Download className="h-4 w-4" />
      Exportar Excel
    </Button>
  );
}


