/**
 * Busca de produtos no Supabase usando MCP
 * Implementa busca manual com LIKE e fuzzy matching
 */

import { supabase } from "@/integrations/supabase/client";
import { devLog, devLogInicio, devLogSucesso, devLogErro } from "@/lib/devLogger";

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
  
  devLogInicio('busca de produtos no Supabase', { termo: term });
  
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
    
    // Se o termo é apenas números, fazer busca adicional em códigos
    // Isso garante que "48" encontre "CT48", "RT40", etc.
    if (/^\d+$/.test(termLower)) {
      // Busca adicional por número em códigos (para encontrar "CT48" quando buscar "48")
      queries.push(
        supabase
          .from("products")
          .select("id, nome, descricao, codigo, codigo_fabricante, ncm, categoria, brand_id")
          .ilike("codigo", `%${term}%`)
          .eq("status", "ativo")
          .limit(100)
      );
    }
    
    const results = await Promise.all(queries);
    
    // Combinar resultados e remover duplicatas
    const allProducts = new Map<string, ProductSearchResult>();
    let totalFound = 0;
    
    results.forEach(({ data, error }, index) => {
      if (error) {
        devLogErro(`Erro na busca Supabase (query ${index})`, error);
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
    
    devLogSucesso(
      `Busca concluída: ${totalFound} resultados brutos, ${finalResults.length} únicos para "${term}"`,
      finalResults.length > 0
        ? {
            primeirosResultados: finalResults.slice(0, 3).map(p => ({
              nome: p.nome,
              codigo: p.codigo,
              codigo_fabricante: p.codigo_fabricante,
            })),
          }
        : undefined
    );
    
    return finalResults;
  } catch (error) {
    devLogErro('Erro ao buscar produtos no Supabase', error);
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

