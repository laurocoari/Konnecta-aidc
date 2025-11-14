import ExcelJS from "exceljs";

export interface ExcelColumn {
  header: string;
  key: string;
  width?: number;
  style?: Partial<ExcelJS.Style>;
}

export interface ExportOptions {
  filename: string;
  sheetName?: string;
  columns: ExcelColumn[];
  data: any[];
  title?: string;
}

/**
 * Exporta dados para Excel
 */
export async function exportToExcel({
  filename,
  sheetName = "Dados",
  columns,
  data,
  title,
}: ExportOptions) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Konnecta CRM";
  workbook.created = new Date();
  workbook.title = title || filename;

  const worksheet = workbook.addWorksheet(sheetName);

  // Adicionar título se fornecido
  if (title) {
    worksheet.mergeCells("A1", `${String.fromCharCode(64 + columns.length)}1`);
    const titleRow = worksheet.getRow(1);
    titleRow.getCell(1).value = title;
    titleRow.getCell(1).font = { size: 16, bold: true };
    titleRow.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    titleRow.height = 25;
    worksheet.addRow([]); // Linha em branco
  }

  // Adicionar cabeçalhos
  worksheet.columns = columns.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width || 15,
  }));

  // Estilizar cabeçalhos
  const headerRow = worksheet.getRow(title ? 3 : 1);
  headerRow.font = { bold: true, color: { argb: "FFFFFFFF" } };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF217B3C" }, // Verde escuro
  };
  headerRow.alignment = { horizontal: "center", vertical: "middle" };
  headerRow.height = 20;

  // Adicionar dados
  data.forEach((row) => {
    const rowData: any = {};
    columns.forEach((col) => {
      const value = row[col.key];
      
      // Formatar valores especiais
      if (value === null || value === undefined) {
        rowData[col.key] = "";
      } else if (value instanceof Date) {
        rowData[col.key] = value;
      } else if (typeof value === "object" && value !== null) {
        // Se for um objeto relacionado, pegar propriedade específica
        rowData[col.key] = JSON.stringify(value);
      } else {
        rowData[col.key] = value;
      }
    });
    worksheet.addRow(rowData);
  });

  // Aplicar estilos às colunas se especificados
  columns.forEach((col, index) => {
    if (col.style) {
      const column = worksheet.getColumn(index + 1);
      column.eachCell({ includeEmpty: false }, (cell) => {
        Object.assign(cell, col.style);
      });
    }
  });

  // Aplicar bordas a todas as células com dados
  const startRow = title ? 3 : 1;
  worksheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber >= startRow) {
      row.eachCell({ includeEmpty: false }, (cell) => {
        cell.border = {
          top: { style: "thin" },
          left: { style: "thin" },
          bottom: { style: "thin" },
          right: { style: "thin" },
        };
      });
    }
  });

  // Gerar buffer e fazer download
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}.xlsx`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/**
 * Formata valor monetário para Excel
 */
export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "R$ 0,00";
  const numValue = typeof value === "string" ? parseFloat(value) : value;
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(numValue || 0);
}

/**
 * Formata data para Excel
 */
export function formatDate(date: string | Date | null | undefined): Date | string {
  if (!date) return "";
  if (date instanceof Date) return date;
  return new Date(date);
}


