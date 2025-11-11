# 📋 Instruções para Importação de Produtos - Manus IA

## 🎯 Objetivo
Extrair dados de produtos de sites e converter para o formato CSV compatível com o sistema CRM Konnecta.

---

## 📊 Estrutura do Banco de Dados

### Tabela: `products`

| Campo | Tipo | Obrigatório | Descrição | Exemplo |
|-------|------|-------------|-----------|---------|
| **codigo** | Texto | ✅ Sim | Código único do produto | PROD-001 |
| **nome** | Texto | ✅ Sim | Nome do produto | Notebook Dell Inspiron 15 |
| **descricao** | Texto | Não | Descrição detalhada | Notebook Dell Inspiron 15 com... |
| **categoria** | Texto | ✅ Sim | Categoria do produto | Informática, Periféricos, etc |
| **tipo** | Texto | ✅ Sim | Tipo: venda, locacao, ambos | venda |
| **marca** | Texto | Não | Nome da marca | Dell, Logitech, Epson |
| **custo_medio** | Decimal | Não | Custo médio de aquisição | 3500.00 |
| **margem_lucro** | Decimal | Não | Margem de lucro (%) | 30 |
| **valor_venda** | Decimal | Não | Preço de venda | 4550.00 |
| **valor_locacao** | Decimal | Não | Valor mensal de locação | 350.00 |
| **unidade** | Texto | Não | Unidade de medida (un, cx, kg, pç, m) | un |
| **estoque_atual** | Inteiro | Não | Quantidade em estoque | 10 |
| **estoque_minimo** | Inteiro | Não | Estoque mínimo (alerta) | 3 |
| **localizacao** | Texto | Não | Localização física | Prateleira A1 |
| **ncm** | Texto | Não | Código NCM fiscal | 8471.30.12 |
| **ean** | Texto | Não | Código de barras EAN | 7891234567890 |
| **cfop** | Texto | Não | CFOP fiscal | 5102 |
| **cst** | Texto | Não | CST/CSOSN | 00 |
| **origem** | Texto | Não | Origem fiscal (0, 1, 2) | 0 |
| **icms** | Decimal | Não | Alíquota ICMS (%) | 18 |
| **ipi** | Decimal | Não | Alíquota IPI (%) | 0 |
| **pis** | Decimal | Não | Alíquota PIS (%) | 1.65 |
| **cofins** | Decimal | Não | Alíquota COFINS (%) | 7.6 |
| **observacoes_fiscais** | Texto | Não | Observações fiscais | - |
| **imagem_principal** | URL | Não | URL da imagem principal | https://example.com/produto.jpg |
| **galeria_imagens** | URLs | Não | URLs separadas por pipe (&#124;) | https://img1.jpg&#124;https://img2.jpg |
| **videos_youtube** | URLs | Não | URLs do YouTube separadas por pipe (&#124;) | https://youtube.com/watch?v=xxx |
| **especificacoes** | Texto | Não | Formato: Nome:Valor&#124;Nome2:Valor2 | Processador:Intel i7&#124;RAM:16GB |
| **status** | Texto | ✅ Sim | Status: ativo ou inativo | ativo |

---

## 🔧 Formato de Campos Especiais

### 1. **Galeria de Imagens** (galeria_imagens)
- **Formato**: URLs separadas por pipe `|`
- **Exemplo**: `https://img1.jpg|https://img2.jpg|https://img3.jpg`
- ⚠️ **Importante**: Não incluir espaços entre as URLs

### 2. **Vídeos do YouTube** (videos_youtube)
- **Formato**: URLs completas do YouTube separadas por pipe `|`
- **Exemplo**: `https://www.youtube.com/watch?v=abc123|https://www.youtube.com/watch?v=def456`

### 3. **Especificações Técnicas** (especificacoes)
- **Formato**: `Nome:Valor|Nome2:Valor2|Nome3:Valor3`
- **Exemplo**: `Processador:Intel Core i7|Memória RAM:16GB DDR4|Armazenamento:512GB SSD|Tela:15.6 Full HD`
- ⚠️ **Importante**: 
  - Usar dois pontos `:` para separar nome e valor
  - Usar pipe `|` para separar especificações
  - Não incluir espaços extras

---

## 🤖 Prompt Sugerido para Manus IA

```
TAREFA: Extrair dados de produtos do site [URL_DO_SITE] e gerar arquivo CSV

INSTRUÇÕES:
1. Acesse o site: [URL_DO_SITE]
2. Extraia as seguintes informações de cada produto:
   - Código/SKU do produto (se não houver, gere no formato PROD-XXX)
   - Nome completo do produto
   - Descrição detalhada
   - Categoria
   - Marca
   - Preço
   - Imagens (todas disponíveis)
   - Especificações técnicas
   - Links de vídeos (se houver)

3. FORMATO DE SAÍDA - CSV com estas colunas:
   codigo,nome,descricao,categoria,tipo,marca,custo_medio,margem_lucro,valor_venda,valor_locacao,unidade,estoque_atual,estoque_minimo,localizacao,ncm,ean,cfop,cst,origem,icms,ipi,pis,cofins,observacoes_fiscais,imagem_principal,galeria_imagens,videos_youtube,especificacoes,status

4. REGRAS IMPORTANTES:
   - tipo: sempre "venda" (a menos que seja explicitamente para locação)
   - unidade: sempre "un" (unidade)
   - status: sempre "ativo"
   - galeria_imagens: URLs separadas por | (pipe)
   - especificacoes: formato Nome:Valor|Nome2:Valor2
   - videos_youtube: URLs completas do YouTube separadas por |
   - Valores numéricos: usar ponto como separador decimal (exemplo: 1299.90)
   - Se um dado não estiver disponível, deixar vazio

5. EXEMPLO DE LINHA:
   PROD-001,Notebook Dell Inspiron 15,"Notebook Dell com Intel Core i7...",Informática,venda,Dell,3500.00,30,4550.00,,un,10,3,,8471.30.12,7891234567890,5102,00,0,18,0,1.65,7.6,,https://example.com/img1.jpg,https://example.com/img2.jpg|https://example.com/img3.jpg,https://youtube.com/watch?v=abc,Processador:Intel Core i7|RAM:16GB DDR4|SSD:512GB|Tela:15.6 FHD,ativo

IMPORTANTE: 
- Não incluir espaços extras nos campos
- Manter formatação exata do CSV
- Todas as URLs devem ser válidas e completas
```

---

## 📥 Fluxo de Importação

1. **Baixar Modelo CSV**
   - No sistema, clique em "Importar CSV"
   - Baixe o modelo disponível

2. **Processar com Manus IA**
   - Use o prompt acima
   - Forneça a URL do site fonte
   - Aguarde o CSV gerado

3. **Validar Dados**
   - Abra o CSV gerado
   - Verifique formatação de campos especiais
   - Confirme URLs de imagens válidas

4. **Importar no Sistema**
   - Clique em "Importar CSV"
   - Selecione o arquivo gerado
   - Aguarde processamento
   - Sistema criará marcas automaticamente se não existirem

---

## ⚠️ Troubleshooting

### Erro: "Nenhum produto válido encontrado"
- **Causa**: Faltam campos obrigatórios (codigo, nome, categoria, tipo, status)
- **Solução**: Verificar se todas as colunas obrigatórias estão preenchidas

### Erro ao importar produto específico
- **Causa**: Formato incorreto em campos especiais (galeria, especificacoes)
- **Solução**: Verificar separadores (pipe `|` e dois pontos `:`)

### Imagens não aparecem
- **Causa**: URLs inválidas ou inacessíveis
- **Solução**: Testar URLs manualmente no navegador

### Marca não criada
- **Causa**: Nome da marca vazio ou inválido
- **Solução**: Preencher campo "marca" corretamente

---

## 📚 Recursos Adicionais

### Exemplos de Categorias Sugeridas:
- Informática
- Periféricos
- Equipamentos
- Hardware
- Software
- Acessórios
- Telecomunicações

### Exemplos de Tipos:
- `venda` - Produto para venda
- `locacao` - Produto para locação
- `ambos` - Pode ser vendido ou locado

### Códigos de Origem Fiscal:
- `0` - Nacional
- `1` - Estrangeira (Importação direta)
- `2` - Estrangeira (Adquirida no mercado interno)

---

## 🎉 Pronto!

Após seguir estas instruções, você terá todos os produtos importados automaticamente no sistema com:
- ✅ Fotos organizadas em galeria
- ✅ Vídeos do YouTube vinculados
- ✅ Especificações técnicas estruturadas
- ✅ Marcas criadas automaticamente
- ✅ Dados fiscais completos
