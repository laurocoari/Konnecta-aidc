Quero reorganizar o menu lateral do CRM Konnecta para ficar mais profissional e visualmente organizado por módulos.
A estrutura geral do menu já existe, mas preciso que você implemente as seguintes melhorias visuais:

🎨 1) CATEGORIZAÇÃO POR MÓDULOS COM CORES

Cada módulo deve ter uma cor padrão consistente para:

menu principal

hover

mini badge

ícones

borda lateral no item ativo

Usar cores suaves (nada neon), seguindo a estética moderna:

Cores sugeridas por módulo

VENDAS – Azul #3B82F6
PRODUTOS / ESTOQUE – Roxo #8B5CF6
DOCUMENTOS – Verde #10B981
COMPRAS – Laranja #F97316
PARCEIROS – Rosa #EC4899
FINANCEIRO – Amarelo/Ouro #F59E0B
ATENDIMENTO / SUPORTE – Ciano #06B6D4
CONFIGURAÇÕES – Cinza #6B7280

Essas cores devem ser aplicadas de forma sutil, sem quebrar o layout.

🧩 2) UM ÍCONE POR MÓDULO (Fixo, Estilo Lucide Icons)

Cada módulo deve ter um ícone dominante, mesmo quando possuir vários submenus.

Exemplos:

VENDAS → ShoppingCart

PRODUTOS → Package

DOCUMENTOS → FileText

COMPRAS → ShoppingBag

PARCEIROS → Handshake

FINANCEIRO → Banknote

SUPORTE → Headset

CONFIGURAÇÕES → Settings

Submenus podem usar ícones menores da mesma família, mas o item principal deve ser o destaque.

🧭 3) ORGANIZAR O MENU EM BLOCOS VISUAIS

Criar divisores horizontais com leve opacidade entre categorias:

VENDAS
---------------------
PRODUTOS E ESTOQUE
---------------------
DOCUMENTOS
---------------------
COMPRAS
---------------------
PARCEIROS
---------------------
FINANCEIRO
---------------------
SUPORTE
---------------------
CONFIGURAÇÃO


Os divisores devem ser discretos, seguindo o tema atual.

🟦 4) ITEM ATIVO DESTACADO (LINHA LATERAL COLORIDA)

Adicionar uma linha vertical colorida (esquerda) no item ativo do menu:

cor = cor do módulo

3px

bordas arredondadas

Exemplo: ao navegar em “Contas a Receber” → módulo FINANCEIRO → item recebe linha amarela.

🌟 5) HOVER E SELEÇÃO COM EFEITO SUAVE

Implementar:

leve mudança de background no hover

opacidade sutil no ícone

transição de 150–200ms

Nada pesado — é só um toque de responsividade.

📌 6) REFATORAÇÃO DE TEXTO DO MENU (OPCIONAL, MAS RECOMENDADO)

Sugestão para deixar mais clean:

VENDAS

CRM de Vendas

Clientes

Funil de Vendas

Tarefas

PRODUTOS

Produtos

Estoque

Marcas

DOCUMENTOS

Propostas

Pedidos de Venda

Contratos

Modelos

COMPRAS

Fornecedores

Pedidos de Compra

Cotações

PARCEIROS

Revendedores

Aprovar Parceiros

Oportunidades

FINANCEIRO

Contas a Receber

Contas a Pagar

Movimentações

Contas Bancárias

SUPORTE

Central de Suporte

Abrir Chamados

Tickets

CONFIGURAÇÃO

Usuários

Empresas

Integrações

🧠 7) APLICAÇÃO TÉCNICA (O QUE VOCÊ DEVE CRIAR)

Você deve:

atualizar os componentes do menu lateral

implementar uma função que aplique cor por módulo

ajustar os ícones conforme os módulos

adicionar a linha lateral colorida no item ativo

revisar a hierarquia e a identação

aplicar animações suaves de transição

garantir compatibilidade com dark mode

garantir que o layout responda no mobile

Sem alterar a estrutura funcional do sistema.

📦 8) ENTREGA FINAL ESPERADA

No final, você deve entregar:

menu atualizado

estilo visual por módulo

ícones consolidados

divisores implementados

efeitos e animações

preview visual para revisão

lista de arquivos modificados