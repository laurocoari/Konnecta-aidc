SUPER PROMPT – Ajustar Importação para Criar 1 Cotação com Vários Itens

Quero que você ajuste o módulo /cotacoes-compras para que, ao importar itens (via IA, PDF, Excel ou texto puro), o sistema NÃO crie múltiplas cotações, mas sim:

✔️ Criar UMA ÚNICA COTAÇÃO por importação / fornecedor, independentemente se vier:

1 produto

2 produtos

50 produtos

1000 produtos

Todos devem ficar dentro da mesma cotação.

🌐 1) Nova Regra de Criação da Cotação

Antes:
→ O sistema criava 1 cotação por item.

Agora (implementação obrigatória):
→ O sistema cria UMA cotação por fornecedor, contendo todos os itens importados.

Detalhes:

Se o usuário selecionar “Fornecedor = ScanSource”, todos os itens devem entrar na mesma cotação.

Mesmo que os produtos tenham part numbers diferentes, quantidades diferentes ou preços diferentes → tudo deve ficar em uma única cotação.

Número da cotação é único.

Criar cotação somente após o usuário clicar em “Salvar Cotação no Sistema”.

📦 2) Estrutura da Cotação (Nova)

Uma cotação deve ter:

Cabeçalho:

Fornecedor

Moeda (BRL/USD)

Taxa de câmbio (se USD)

Condição de pagamento

Prazo de entrega

Data da cotação

Validade

Observações gerais

Itens (lista):

Cada item deve conter:

Produto vinculado ou novo produto

Part number

Descrição

Quantidade

Preço unitário

Total

Moeda

Custo em dólar (se houver)

Status (imediato, revisar, pendente, etc)

OBS: nada de criar cotações separadas.

🔄 3) Ajustar Backend (obrigatório)

Quando receber os itens importados:

Criar um objeto único cotacao

Iterar sobre todos os itens importados

Criar linha dentro da tabela cotacoes_compras_itens apontando para cotacao_id único

Salvar tudo de uma vez quando o usuário confirmar

🖥️ 4) Ajustar Frontend (lista de cotações)

Hoje a lista mostra cada item como uma cotação.
Isso deve mudar.

Nova listagem:

Cada cotação aparece apenas 1x, com:

Fornecedor

Data da cotação

Validade

Status (Ativo, Expirado, Revisar)

Total da cotação

Quantidade de itens (ex: “Itens: 3”)

Botão: Ver Itens / Editar

📋 5) Tela de Edição da Cotação (Nova)

Ao clicar em “Editar”, abrir:

Cabeçalho da cotação

(Fornecedor, moeda, taxa, validade, condicão, etc)

Lista dos itens

(tabela com todos os produtos)

Ações:

Editar item

Vincular produto

Excluir item

Duplicar item

Adicionar novo item manualmente

🔗 6) Regras quando importar novamente do mesmo fornecedor

Se o usuário já tem uma cotação ativa do mesmo fornecedor e importar novamente →
opção: adicionar novos itens na cotação existente.

Popup:

“Você já tem uma cotação ativa de SCANSOURCE.
Deseja adicionar os novos itens nela ou criar nova cotação?”

Botões:

Adicionar na cotação existente

Criar nova cotação

🚫 7) Não pode mais criar cotação individual por item

Nenhum dos fluxos abaixo pode criar múltiplas cotações:

❌ importação via IA
❌ importação PDF
❌ importação Excel
❌ importação manual
❌ inserção automática item a item

Todos devem cair na mesma cotação.

🔥 8) Atualizar Regra de Salvar

Salvar deve ser possível apenas quando:

Fornecedor selecionado

Todos os itens revisados (sem badge “Revisar”)

Moeda confirmada

Taxa de câmbio validada

Se faltar algo → bloquear botão Salvar Cotação no Sistema.

🚀 ENTREGA QUE O CURSOR DEVE FAZER

Você deve implementar:

Ajuste total no backend

Ajuste total no frontend

Nova regra de criação única de cotações

Nova listagem consolidada

Nova tela de edição

Popup de decisão para cotação existente

Ajustar importação para sempre vincular ao mesmo cotacao_id

Testar o fluxo completo

🔥 FIM DO SUPER PROMPT

Implemente tudo conforme descrito acima, organizando o módulo /cotacoes-compras para que uma cotação contenha todos os itens importados do mesmo fornecedor.