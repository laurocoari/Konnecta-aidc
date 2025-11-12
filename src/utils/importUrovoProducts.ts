import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ProductImportData {
  codigo: string;
  nome: string;
  descricao?: string;
  categoria: string;
  tipo: string;
  marca?: string;
  custo_medio?: number;
  margem_lucro?: number;
  valor_venda?: number;
  valor_locacao?: number;
  unidade?: string;
  estoque_atual?: number;
  estoque_minimo?: number;
  localizacao?: string;
  ncm?: string;
  ean?: string;
  cfop?: string;
  cst?: string;
  origem?: string;
  icms?: number;
  ipi?: number;
  pis?: number;
  cofins?: number;
  observacoes_fiscais?: string;
  imagem_principal?: string;
  galeria_imagens?: string;
  videos_youtube?: string;
  especificacoes?: string;
  status?: string;
}

export async function importUrovoProducts() {
  try {
    console.log("🚀 Iniciando importação de produtos Urovo...");

    // Carregar o arquivo CSV
    const response = await fetch('/urovo_products_import.csv');
    const csvText = await response.text();
    
    // Parse CSV com suporte a multilinha
    const rows = parseCSVWithMultiline(csvText);
    
    if (rows.length === 0) {
      throw new Error("Nenhuma linha encontrada no CSV");
    }

    const headers = rows[0];
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Processar cada linha (pular o cabeçalho)
    for (let i = 1; i < rows.length; i++) {
      const values = rows[i];
      
      if (values.length === 0 || !values[0]) continue;

      try {
        const rowData: any = {};
        headers.forEach((header, index) => {
          const cleanHeader = header.trim();
          const value = values[index]?.trim() || '';
          rowData[cleanHeader] = value;
        });

        if (!rowData.codigo || !rowData.nome) {
          console.warn(`Linha ${i + 1} sem código ou nome, pulando...`);
          continue;
        }

        // Verificar se o produto já existe
        const { data: existingProduct } = await supabase
          .from('products')
          .select('id')
          .eq('codigo', rowData.codigo)
          .single();

        if (existingProduct) {
          console.log(`Produto ${rowData.codigo} já existe, atualizando...`);
          await updateProduct(existingProduct.id, rowData);
        } else {
          console.log(`Criando produto ${rowData.codigo}...`);
          await createProduct(rowData);
        }

        successCount++;
        console.log(`✅ Produto ${rowData.codigo} - ${rowData.nome} processado`);
        
      } catch (error: any) {
        errorCount++;
        const errorMsg = `Erro na linha ${i + 1}: ${error.message}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`\n📊 Importação concluída:`);
    console.log(`   ✅ Sucesso: ${successCount}`);
    console.log(`   ❌ Erros: ${errorCount}`);
    
    if (errors.length > 0) {
      console.log(`\n⚠️ Erros encontrados:`);
      errors.forEach(err => console.log(`   - ${err}`));
    }

    toast.success(`Importação concluída! ${successCount} produtos processados, ${errorCount} erros.`);
    
    return { successCount, errorCount, errors };

  } catch (error: any) {
    console.error('❌ Erro fatal na importação:', error);
    toast.error(`Erro na importação: ${error.message}`);
    throw error;
  }
}

function parseCSVWithMultiline(csvText: string): string[][] {
  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentCell = '';
  let insideQuotes = false;
  
  for (let i = 0; i < csvText.length; i++) {
    const char = csvText[i];
    const nextChar = csvText[i + 1];
    
    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        // Escaped quote
        currentCell += '"';
        i++; // Skip next quote
      } else {
        // Toggle quote state
        insideQuotes = !insideQuotes;
      }
    } else if (char === ',' && !insideQuotes) {
      // End of cell
      currentRow.push(currentCell);
      currentCell = '';
    } else if ((char === '\n' || char === '\r') && !insideQuotes) {
      // End of row
      if (char === '\r' && nextChar === '\n') {
        i++; // Skip \n in \r\n
      }
      
      if (currentCell || currentRow.length > 0) {
        currentRow.push(currentCell);
        if (currentRow.some(cell => cell.trim())) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentCell = '';
      }
    } else {
      // Regular character
      currentCell += char;
    }
  }
  
  // Add last row if exists
  if (currentCell || currentRow.length > 0) {
    currentRow.push(currentCell);
    if (currentRow.some(cell => cell.trim())) {
      rows.push(currentRow);
    }
  }
  
  return rows;
}


async function createProduct(rowData: ProductImportData) {
  // Processar marca
  let brandId = null;
  if (rowData.marca) {
    const { data: existingBrand } = await supabase
      .from('brands')
      .select('id')
      .eq('nome', rowData.marca)
      .single();

    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      const { data: newBrand, error: brandError } = await supabase
        .from('brands')
        .insert({ nome: rowData.marca, status: 'ativa' })
        .select('id')
        .single();

      if (brandError) throw brandError;
      brandId = newBrand.id;
    }
  }

  // Processar imagem principal
  const imagemPrincipal = rowData.imagem_principal?.trim() || null;

  // Processar galeria de imagens
  const galeria = rowData.galeria_imagens
    ? rowData.galeria_imagens
        .split('|')
        .map(url => url.trim())
        .filter(url => url)
        .map(url => ({ url }))
    : [];

  // Processar vídeos
  const videos = rowData.videos_youtube
    ? rowData.videos_youtube
        .split('|')
        .map(url => url.trim())
        .filter(url => url)
        .map(url => ({ url, type: 'youtube' }))
    : [];

  // Processar especificações
  const especificacoes = rowData.especificacoes
    ? rowData.especificacoes
        .split('|')
        .map(spec => {
          const [nome, valor] = spec.split(':');
          return { 
            nome: nome?.trim() || '', 
            valor: valor?.trim() || '' 
          };
        })
        .filter(spec => spec.nome && spec.valor)
    : [];

  // Criar produto
  const productData = {
    codigo: rowData.codigo,
    nome: rowData.nome,
    descricao: rowData.descricao || null,
    categoria: rowData.categoria,
    tipo: rowData.tipo,
    brand_id: brandId,
    custo_medio: parseFloat(rowData.custo_medio as any) || null,
    valor_venda: parseFloat(rowData.valor_venda as any) || null,
    valor_locacao: parseFloat(rowData.valor_locacao as any) || null,
    unidade: rowData.unidade || 'un',
    estoque_atual: parseInt(rowData.estoque_atual as any) || 0,
    estoque_minimo: parseInt(rowData.estoque_minimo as any) || 0,
    localizacao: rowData.localizacao || null,
    ncm: rowData.ncm || null,
    ean: rowData.ean || null,
    cfop: rowData.cfop || null,
    cst: rowData.cst || null,
    origem: rowData.origem || null,
    icms: parseFloat(rowData.icms as any) || null,
    ipi: parseFloat(rowData.ipi as any) || null,
    pis: parseFloat(rowData.pis as any) || null,
    cofins: parseFloat(rowData.cofins as any) || null,
    observacoes_fiscais: rowData.observacoes_fiscais || null,
    imagem_principal: imagemPrincipal,
    galeria: galeria.length > 0 ? galeria : null,
    videos: videos.length > 0 ? videos : null,
    especificacoes: especificacoes.length > 0 ? especificacoes : null,
    status: rowData.status || 'ativo',
  };

  console.log(`📸 Imagem principal: ${imagemPrincipal || 'nenhuma'}`);
  console.log(`🖼️ Galeria: ${galeria.length} imagens`);

  const { error } = await supabase
    .from('products')
    .insert(productData);

  if (error) throw error;
}

async function updateProduct(productId: string, rowData: ProductImportData) {
  // Processar marca
  let brandId = null;
  if (rowData.marca) {
    const { data: existingBrand } = await supabase
      .from('brands')
      .select('id')
      .eq('nome', rowData.marca)
      .single();

    if (existingBrand) {
      brandId = existingBrand.id;
    } else {
      const { data: newBrand, error: brandError } = await supabase
        .from('brands')
        .insert({ nome: rowData.marca, status: 'ativa' })
        .select('id')
        .single();

      if (brandError) throw brandError;
      brandId = newBrand.id;
    }
  }

  // Processar imagem principal
  const imagemPrincipal = rowData.imagem_principal?.trim() || null;

  // Processar galeria de imagens
  const galeria = rowData.galeria_imagens
    ? rowData.galeria_imagens
        .split('|')
        .map(url => url.trim())
        .filter(url => url)
        .map(url => ({ url }))
    : [];

  // Processar vídeos
  const videos = rowData.videos_youtube
    ? rowData.videos_youtube
        .split('|')
        .map(url => url.trim())
        .filter(url => url)
        .map(url => ({ url, type: 'youtube' }))
    : [];

  // Processar especificações
  const especificacoes = rowData.especificacoes
    ? rowData.especificacoes
        .split('|')
        .map(spec => {
          const [nome, valor] = spec.split(':');
          return { 
            nome: nome?.trim() || '', 
            valor: valor?.trim() || '' 
          };
        })
        .filter(spec => spec.nome && spec.valor)
    : [];

  // Atualizar produto
  const productData = {
    nome: rowData.nome,
    descricao: rowData.descricao || null,
    categoria: rowData.categoria,
    tipo: rowData.tipo,
    brand_id: brandId,
    custo_medio: parseFloat(rowData.custo_medio as any) || null,
    valor_venda: parseFloat(rowData.valor_venda as any) || null,
    valor_locacao: parseFloat(rowData.valor_locacao as any) || null,
    unidade: rowData.unidade || 'un',
    estoque_atual: parseInt(rowData.estoque_atual as any) || 0,
    estoque_minimo: parseInt(rowData.estoque_minimo as any) || 0,
    localizacao: rowData.localizacao || null,
    ncm: rowData.ncm || null,
    ean: rowData.ean || null,
    cfop: rowData.cfop || null,
    cst: rowData.cst || null,
    origem: rowData.origem || null,
    icms: parseFloat(rowData.icms as any) || null,
    ipi: parseFloat(rowData.ipi as any) || null,
    pis: parseFloat(rowData.pis as any) || null,
    cofins: parseFloat(rowData.cofins as any) || null,
    observacoes_fiscais: rowData.observacoes_fiscais || null,
    imagem_principal: imagemPrincipal,
    galeria: galeria.length > 0 ? galeria : null,
    videos: videos.length > 0 ? videos : null,
    especificacoes: especificacoes.length > 0 ? especificacoes : null,
    status: rowData.status || 'ativo',
  };

  console.log(`📸 Imagem principal: ${imagemPrincipal || 'nenhuma'}`);
  console.log(`🖼️ Galeria: ${galeria.length} imagens`);

  const { error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', productId);

  if (error) throw error;
}
