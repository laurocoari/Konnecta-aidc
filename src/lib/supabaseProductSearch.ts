/**
 * Busca de produtos no Supabase usando MCP
 * Implementa busca manual com LIKE e fuzzy matching
 */

import { supabase } from "@/integrations/supabase/client";

export interface ProductSearchResult {
  id: string;
  nome: string;
  descricao: string | null;
  codigo: string;
  codigo_fabricante: string | null;
  ncm: string | null;
  categoria: string;
  brand_id: string | null;
}

/**
 * Busca produtos no Supabase usando múltiplos critérios
 */
export async function searchProductsInSupabase(
  searchTerm: string
): Promise<ProductSearchResult[]> {
  if (!searchTerm || searchTerm.trim().length === 0) {
    return [];
  }

  const term = searchTerm.trim();
  const termLower = term.toLowerCase();
  
  // Log para debug
  if (import.meta.env.DEV) {
    console.log("🔍 Buscando produtos no Supabase:", term);
  }
  
  try {
    // Busca usando OR com múltiplas condições via RPC ou múltiplas queries
    // Como Supabase não suporta OR direto, fazemos múltiplas queries e combinamos
    const queries: Promise<any>[] = [];
    
    // Busca por nome (case-insensitive)
    queries.push(
      supabase
        .from("products")
        .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
        .ilike("nome", `%${term}%`)
        .eq("status", "ativo")
        .limit(100)
    );
    
    // Busca por descrição (case-insensitive)
    queries.push(
      supabase
        .from("products")
        .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
        .ilike("descricao", `%${term}%`)
        .eq("status", "ativo")
        .limit(100)
    );
    
    // Busca por código (case-insensitive)
    queries.push(
      supabase
        .from("products")
        .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
        .ilike("codigo", `%${term}%`)
        .eq("status", "ativo")
        .limit(100)
    );
    
    // Busca por código fabricante (case-insensitive)
    queries.push(
      supabase
        .from("products")
        .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
        .ilike("codigo_fabricante", `%${term}%`)
        .eq("status", "ativo")
        .limit(100)
    );
    
    // Se o termo contém apenas números, também buscar em sku_interno se existir
    // Nota: sku_interno pode não estar na query inicial, mas vamos tentar buscar por código que pode conter o número
    
    const results = await Promise.all(queries);
    
    // Combinar resultados e remover duplicatas
    const allProducts = new Map<string, ProductSearchResult>();
    let totalFound = 0;
    
    results.forEach(({ data, error }, index) => {
      if (error) {
        console.error(`Erro na busca Supabase (query ${index}):`, error);
        return;
      }
      
      if (data && Array.isArray(data)) {
        totalFound += data.length;
        data.forEach((product: any) => {
          if (product && product.id) {
            if (!allProducts.has(product.id)) {
              allProducts.set(product.id, {
                id: product.id,
                nome: product.nome,
                descricao: product.descricao,
                codigo: product.codigo,
                codigo_fabricante: product.codigo_fabricante,
                ncm: product.ncm,
                categoria: product.categoria,
                brand_id: product.brand_id,
              });
            }
          }
        });
      }
    });
    
    const finalResults = Array.from(allProducts.values());
    
    // Log para debug
    if (import.meta.env.DEV) {
      console.log(`✅ Busca concluída: ${totalFound} resultados brutos, ${finalResults.length} únicos para "${term}"`);
    }
    
    return finalResults;
  } catch (error) {
    console.error("Erro ao buscar produtos no Supabase:", error);
    return [];
  }
}

/**
 * Busca produtos relacionados a um código específico
 * Útil para acessórios (ex: bateria para CT48)
 */
export async function searchProductsByCode(
  code: string
): Promise<ProductSearchResult[]> {
  if (!code) return [];
  
  const normalizedCode = code.toLowerCase().trim();
  const variations = [
    normalizedCode,
    normalizedCode.replace(/-/g, ''),
    normalizedCode.replace(/-/g, ' '),
    normalizedCode.toUpperCase(),
  ];
  
  const allProducts = new Map<string, ProductSearchResult>();
  
  for (const variation of variations) {
    const results = await searchProductsInSupabase(variation);
    results.forEach(product => {
      if (!allProducts.has(product.id)) {
        allProducts.set(product.id, product);
      }
    });
  }
  
  return Array.from(allProducts.values());
}

