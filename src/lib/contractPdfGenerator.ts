import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Gera PDF de um contrato a partir de HTML renderizado
 * @param elementId ID do elemento HTML a ser convertido em PDF
 * @param filename Nome do arquivo PDF (sem extensão)
 * @returns Promise que resolve quando o PDF é gerado
 */
export async function generateContractPDF(
  elementId: string,
  filename: string = "contrato"
): Promise<void> {
  const element = document.getElementById(elementId);
  if (!element) {
    throw new Error(`Elemento com ID "${elementId}" não encontrado`);
  }

  // Configurar opções do html2canvas
  const canvas = await html2canvas(element, {
    scale: 2, // Maior qualidade
    useCORS: true,
    logging: false,
    backgroundColor: "#ffffff",
    width: element.scrollWidth,
    height: element.scrollHeight,
  });

  // Calcular dimensões do PDF (A4 Retrato)
  const pdfWidth = 210; // mm (A4 width em retrato)
  const pdfHeight = 297; // mm (A4 height em retrato)
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  
  // Calcular ratio mantendo proporção e garantindo que caiba na página A4 retrato
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgScaledWidth = imgWidth * ratio;
  const imgScaledHeight = imgHeight * ratio;

  // Criar PDF em formato A4 Retrato (forçar portrait)
  const pdf = new jsPDF({
    orientation: "portrait", // Forçar retrato
    unit: "mm",
    format: "a4",
  });

  // Adicionar imagem ao PDF
  const imgData = canvas.toDataURL("image/png");
  pdf.addImage(imgData, "PNG", 0, 0, imgScaledWidth, imgScaledHeight);

  // Se o conteúdo for maior que uma página, adicionar páginas adicionais
  let heightLeft = imgScaledHeight;
  let position = 0;

  while (heightLeft > 0) {
    position = heightLeft - pdfHeight;
    pdf.addPage();
    pdf.addImage(imgData, "PNG", 0, position, imgScaledWidth, imgScaledHeight);
    heightLeft -= pdfHeight;
  }

  // Salvar PDF
  pdf.save(`${filename}.pdf`);
}

