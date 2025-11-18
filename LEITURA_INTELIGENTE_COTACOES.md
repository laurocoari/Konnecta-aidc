# 🤖 Leitura Inteligente de Cotações com IA

## 📋 Visão Geral

Sistema de importação automática de cotações usando OpenAI (ChatGPT) para extrair dados de produtos, quantidades, preços e unidades de e-mails ou arquivos de cotações.

## ✅ Funcionalidades Implementadas

### 1. Configuração da API OpenAI
- **Localização**: `/configuracoes` → Aba "IA e Automação"
- **Campos**:
  - API Key da OpenAI (armazenada criptografada)
  - Modelo (padrão: `gpt-4o-mini`)
  - Limite de tokens (padrão: 2000)
  - Ativar/Desativar automação
  - Botão de teste de conexão

### 2. Importação Inteligente
- **Localização**: `/cotacoes-compras` → Botão "Importar Cotação (IA)"
- **Funcionalidades**:
  - Colar texto do e-mail
  - Upload de arquivos TXT/HTML
  - Processamento com IA
  - Pré-visualização dos dados extraídos
  - Matching automático com produtos cadastrados

### 3. Edge Function
- **Endpoint**: `interpretar-cotacao`
- **Funções**:
  - Validação de configuração
  - Chamada à API OpenAI
  - Extração de dados estruturados
  - Logging de todas as operações

### 4. Matching de Produtos
- **Estratégias**:
  - Match exato por nome
  - Match por código/referência
  - Fuzzy match (similaridade de texto)
  - Score de confiança

## 🚀 Como Usar

### Passo 1: Configurar API OpenAI

1. Acesse `/configuracoes`
2. Vá para a aba "IA e Automação"
3. Preencha:
   - API Key da OpenAI (obtenha em https://platform.openai.com/api-keys)
   - Modelo (recomendado: `gpt-4o-mini`)
   - Limite de tokens
4. Ative a funcionalidade
5. Clique em "Testar Conexão" para validar
6. Salve as configurações

### Passo 2: Importar Cotação

1. Acesse `/cotacoes-compras`
2. Clique em "Importar Cotação (IA)"
3. Escolha uma opção:
   - **Colar texto**: Cole o conteúdo do e-mail da cotação
   - **Enviar arquivo**: Faça upload de arquivo TXT ou HTML
4. Clique em "Enviar para IA"
5. Aguarde o processamento (alguns segundos)
6. Revise os itens extraídos na pré-visualização
7. Clique em "Usar Itens Extraídos"

### Passo 3: Revisar e Salvar

- Os itens serão automaticamente associados a produtos cadastrados quando possível
- Itens com baixa confiança (< 80%) precisarão de revisão manual
- Use "Nova Cotação" para criar cotações individuais

## 📊 Estrutura de Dados Extraídos

A IA extrai os seguintes campos de cada item:

```json
{
  "nome_produto": "Nome do produto",
  "quantidade": 10,
  "unidade": "un",
  "preco_unitario": 150.00,
  "preco_total": 1500.00,
  "referencia": "REF-123",
  "observacoes": "Observações adicionais"
}
```

## 🔒 Segurança

- ✅ API Key armazenada criptografada no banco
- ✅ Nunca exposta no frontend
- ✅ Todas as requisições passam pelo backend (Edge Function)
- ✅ Logs não armazenam dados sensíveis
- ✅ Autenticação obrigatória

## 📝 Logs

Todas as operações são registradas em `ai_interpretation_logs`:
- Texto original enviado
- JSON extraído
- Usuário que processou
- Data/hora
- Modelo usado
- Tokens consumidos
- Status (sucesso/erro)

## ⚠️ Limitações Atuais

- PDF ainda não suportado (OCR em desenvolvimento)
- Preenchimento automático no formulário em desenvolvimento
- Criptografia da API Key simplificada (melhorar para produção)

## 🔮 Melhorias Futuras

- [ ] Suporte a PDF com OCR
- [ ] Preenchimento automático no formulário de cotações
- [ ] Criptografia robusta da API Key
- [ ] Histórico de importações
- [ ] Correção automática de erros comuns
- [ ] Suporte a múltiplos fornecedores na mesma cotação

## 🐛 Troubleshooting

### "Configuração da OpenAI não encontrada"
- Verifique se a configuração está salva e ativada em `/configuracoes`

### "Erro ao processar cotação"
- Verifique se a API Key está correta
- Confirme se há créditos na conta OpenAI
- Revise os logs em `ai_interpretation_logs`

### "Nenhum item reconhecido"
- O texto pode estar muito formatado ou incompleto
- Tente remover formatação HTML excessiva
- Verifique se o texto contém informações de produtos

## 📞 Suporte

Para problemas ou dúvidas, consulte os logs em `ai_interpretation_logs` ou entre em contato com o administrador do sistema.

