import jsPDF from "jspdf";
import html2canvas from "html2canvas";

/**
 * Gera PDF de uma proposta a partir de HTML renderizado
 * @param elementId ID do elemento HTML a ser convertido em PDF
 * @param filename Nome do arquivo PDF (sem extensão)
 * @returns Promise que resolve quando o PDF é gerado
 */
export async function generateProposalPDF(
  elementId: string,
  filename: string = "proposta"
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

  // Calcular dimensões do PDF (A4)
  const pdfWidth = 210; // mm (A4 width)
  const pdfHeight = 297; // mm (A4 height)
  const imgWidth = canvas.width;
  const imgHeight = canvas.height;
  const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
  const imgScaledWidth = imgWidth * ratio;
  const imgScaledHeight = imgHeight * ratio;

  // Criar PDF
  const pdf = new jsPDF({
    orientation: imgHeight > imgWidth ? "portrait" : "landscape",
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

/**
 * Gera PDF de uma proposta a partir de HTML string
 * @param htmlString String HTML da proposta
 * @param filename Nome do arquivo PDF (sem extensão)
 * @returns Promise que resolve quando o PDF é gerado
 */
export async function generateProposalPDFFromHTML(
  htmlString: string,
  filename: string = "proposta"
): Promise<void> {
  // Criar elemento temporário
  const tempDiv = document.createElement("div");
  tempDiv.id = "temp-proposal-pdf";
  tempDiv.innerHTML = htmlString;
  tempDiv.style.position = "absolute";
  tempDiv.style.left = "-9999px";
  tempDiv.style.width = "210mm"; // Largura A4
  document.body.appendChild(tempDiv);

  try {
    await generateProposalPDF("temp-proposal-pdf", filename);
  } finally {
    // Remover elemento temporário
    document.body.removeChild(tempDiv);
  }
}

/**
 * Gera HTML para impressão da proposta
 * @param proposalData Dados da proposta
 * @param templateData Dados do template
 * @returns String HTML formatada
 */
export function generateProposalHTML(
  proposalData: any,
  templateData: any
): string {
  // Esta função será expandida para usar o template engine
  // Por enquanto, retorna HTML básico
  return `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="UTF-8">
        <title>Proposta ${proposalData.codigo}</title>
        <style>
          ${templateData?.css_personalizado || ""}
        </style>
      </head>
      <body>
        <div id="proposal-content">
          ${proposalData.introducao || ""}
        </div>
      </body>
    </html>
  `;
}



