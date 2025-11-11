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
    
    const lines = csvText.split('\n');
    const headers = lines[0].split(',');
    
    let successCount = 0;
    let errorCount = 0;
    const errors: string[] = [];

    // Processar cada linha (pular o cabeçalho)
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      try {
        // Parse CSV complexo (com vírgulas dentro de aspas)
        const values = parseCSVLine(line);
        
        if (values.length < headers.length) {
          console.warn(`Linha ${i + 1} incompleta, pulando...`);
          continue;
        }

        const rowData: any = {};
        headers.forEach((header, index) => {
          const cleanHeader = header.trim();
          const value = values[index]?.trim() || '';
          rowData[cleanHeader] = value;
        });

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

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  
  result.push(current);
  return result;
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

  // Processar galeria de imagens
  const galeria = rowData.galeria_imagens
    ? rowData.galeria_imagens.split('|').map(url => ({ url: url.trim() }))
    : [];

  // Processar vídeos
  const videos = rowData.videos_youtube
    ? rowData.videos_youtube.split('|').map(url => ({ url: url.trim(), type: 'youtube' }))
    : [];

  // Processar especificações
  const especificacoes = rowData.especificacoes
    ? rowData.especificacoes.split('|').map(spec => {
        const [nome, valor] = spec.split(':');
        return { nome: nome?.trim() || '', valor: valor?.trim() || '' };
      })
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
    imagem_principal: rowData.imagem_principal || null,
    galeria: galeria.length > 0 ? galeria : null,
    videos: videos.length > 0 ? videos : null,
    especificacoes: especificacoes.length > 0 ? especificacoes : null,
    status: rowData.status || 'ativo',
  };

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

  // Processar galeria de imagens
  const galeria = rowData.galeria_imagens
    ? rowData.galeria_imagens.split('|').map(url => ({ url: url.trim() }))
    : [];

  // Processar vídeos
  const videos = rowData.videos_youtube
    ? rowData.videos_youtube.split('|').map(url => ({ url: url.trim(), type: 'youtube' }))
    : [];

  // Processar especificações
  const especificacoes = rowData.especificacoes
    ? rowData.especificacoes.split('|').map(spec => {
        const [nome, valor] = spec.split(':');
        return { nome: nome?.trim() || '', valor: valor?.trim() || '' };
      })
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
    imagem_principal: rowData.imagem_principal || null,
    galeria: galeria.length > 0 ? galeria : null,
    videos: videos.length > 0 ? videos : null,
    especificacoes: especificacoes.length > 0 ? especificacoes : null,
    status: rowData.status || 'ativo',
  };

  const { error } = await supabase
    .from('products')
    .update(productData)
    .eq('id', productId);

  if (error) throw error;
}
