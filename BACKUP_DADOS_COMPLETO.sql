-- =====================================================
-- BACKUP COMPLETO DE DADOS - KONNECTA AIDC
-- Gerado em: 2026-03-01
-- =====================================================
-- IMPORTANTE: Este backup contém apenas os dados (INSERT).
-- Para restaurar, execute primeiro o DDL (estrutura das tabelas).
-- =====================================================

-- =====================================================
-- 1. PROFILES (Perfis de Usuários)
-- =====================================================
INSERT INTO public.profiles (id, full_name, role, phone, created_at, updated_at) VALUES
  ('b4ef29bf-34de-4692-a152-ab4146a19743', 'francy lauro pacheco pereira', 'revendedor', NULL, '2025-11-11 04:30:27.037911+00', '2025-11-11 04:30:27.037911+00'),
  ('041993bc-c6e3-4e3c-b021-691f202b9225', 'LAURO PACHECO', 'admin', NULL, '2025-11-11 04:42:01.16938+00', '2025-11-11 04:43:04.387116+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 2. USER_ROLES (Papéis dos Usuários)
-- =====================================================
INSERT INTO public.user_roles (id, user_id, role, created_at) VALUES
  ('27c38664-c670-425f-99aa-eef8dca4a554', 'b4ef29bf-34de-4692-a152-ab4146a19743', 'revendedor', '2025-11-11 04:35:04.214268+00'),
  ('7dd5646d-6800-4cb0-9f64-87f5fc5dd1ab', '041993bc-c6e3-4e3c-b021-691f202b9225', 'admin', '2025-11-11 04:43:04.387116+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 3. BRANDS (Marcas)
-- =====================================================
INSERT INTO public.brands (id, nome, descricao, logo_url, status, observacoes, created_at, updated_at) VALUES
  ('ca1c9b60-01cc-4442-9176-0ba99c2e0bc9', 'Zebra', 'A Zebra projeta hardware, software, soluções de automação e serviços para a linha de frente, do varejo à saúde, da manufatura à logística e além. Somos líderes de mercado em computação móvel robusta, leitura de códigos de barras, leitores RFID, impressão térmica e software de gerenciamento de tarefas de varejo.', 'https://d1p6nzzdute2g.cloudfront.net/lojas/loja-1303/9f6ebe4c-b7b8-49f9-b8e7-18c4c88d57fd', 'ativa', NULL, '2025-11-11 23:25:06.349771+00', '2025-11-11 23:25:06.349771+00'),
  ('044defb4-33a4-476b-a85a-6a7816edbbb9', 'Urovo', 'Descubra os nossos computadores móveis robustos e as nossas soluções de pagamento para retalho, armazenamento, controlo de inventário, hotelaria e muito mais. A experiência da Urovo como fabricante líder de AIDC ajudará a transformar o seu negócio e a otimizar a sua eficiência', 'https://urovo-emea.com/wp-content/uploads/2023/11/cropped-urovo_standard_small.png', 'ativa', NULL, '2025-11-11 23:57:11.17877+00', '2025-11-12 00:04:59.880588+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 4. SUPPLIERS (Fornecedores)
-- =====================================================
INSERT INTO public.suppliers (id, nome, cnpj, contato_principal, email, telefone, endereco, cidade, estado, cep, categoria, status, observacoes, created_at, updated_at) VALUES
  ('339b139f-df08-4a3c-bcd8-82c3c4329358', 'KNC', '05601700000155', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'Hardware', 'ativo', NULL, '2025-11-11 23:14:35.549898+00', '2025-11-11 23:36:22.598423+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 5. PARTNERS (Parceiros/Revendedores)
-- =====================================================
INSERT INTO public.partners (id, user_id, nome_fantasia, razao_social, cnpj, email, telefone, cidade, estado, comissao_percentual, status, created_at, updated_at) VALUES
  ('f0ec55bb-c373-450f-a7aa-b820119e6b86', '041993bc-c6e3-4e3c-b021-691f202b9225', 'Lauro Pacheco - Teste', 'Lauro Pacheco Teste LTDA', '00000000000100', 'lauro@konnecta.com.br', '(92) 99999-9999', 'Coari', 'AM', 10.00, 'ativo', '2025-11-11 04:48:36.075016+00', '2025-11-11 04:48:36.075016+00'),
  ('0f8e28d5-6ac3-42dc-8684-35510cb0a033', 'b4ef29bf-34de-4692-a152-ab4146a19743', 'Lauro Pereira', 'Lauro Pereira ME', '00000000000199', 'laurocoari@gmail.com', '(92) 99999-9999', 'Coari', 'AM', 10.00, 'ativo', '2025-11-11 04:49:48.732657+00', '2025-11-11 04:49:48.732657+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 6. CLIENTS (Clientes)
-- =====================================================
INSERT INTO public.clients (id, nome, cnpj, ie, contato_principal, email, telefone, endereco, cidade, estado, cep, tipo, observacoes, origin_partner_id, exclusive_partner_id, exclusivity_expires_at, exclusivity_status, created_at, updated_at) VALUES
  ('0721f8ab-ec87-44eb-89c7-abe3bab38f49', 'ARENA D B LTDA', '05601700000155', '', 'LAURO PERERIA', 'ltmodas@gmail.com', '92999985043', 'Avenida Penetração, 11', 'Manaus', 'AM', '69090-661', 'cliente', NULL, '0f8e28d5-6ac3-42dc-8684-35510cb0a033', '0f8e28d5-6ac3-42dc-8684-35510cb0a033', '2025-12-26 04:50:49.725+00', 'ativa', '2025-11-11 04:50:49.720738+00', '2025-11-11 04:50:50.104393+00'),
  ('ac64117c-ff17-4c66-ac92-a9b16390e27f', 'Francy Lauro Pacheco Pereira', '05.601.700/0001-55', '', 'LAURO PERERIA', 'laurocoari@gmail.com', '92999985043', 'Rua Rio Ebro 7', 'Coari', 'AM', '69090643', 'cliente', NULL, '0f8e28d5-6ac3-42dc-8684-35510cb0a033', '0f8e28d5-6ac3-42dc-8684-35510cb0a033', '2025-12-26 05:03:21.063+00', 'ativa', '2025-11-11 05:03:21.042658+00', '2025-11-11 05:03:21.433608+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 7. PRODUCTS (Produtos)
-- =====================================================
INSERT INTO public.products (id, codigo, nome, descricao, categoria, tipo, tipo_disponibilidade, status, valor_venda, valor_locacao, estoque_atual, estoque_minimo, imagem_principal, unidade, vida_util_meses, margem_lucro_venda, comissao_agenciamento_padrao, permite_agenciamento, brand_id, created_at, updated_at) VALUES
  ('48f91eb4-5974-4ac3-9c70-9e781b729cce', 'PROD-001', 'Computador Dell Optiplex', 'Computador desktop empresarial Dell Optiplex com processador Intel Core i5, 8GB RAM, 256GB SSD', 'Hardware', 'ambos', 'ambos', 'ativo', 2500.00, 150.00, 50, 0, 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400', 'un', 36, 0.00, 0.00, false, NULL, '2025-11-11 05:00:28.392032+00', '2025-11-12 00:26:52.9621+00'),
  ('694a6e46-a3d9-47d2-8a42-cd84863f4266', 'PROD-002', 'Monitor LG 24"', 'Monitor LED Full HD 24 polegadas LG com entrada HDMI e VGA', 'Hardware', 'ambos', 'ambos', 'ativo', 800.00, 50.00, 100, 0, 'https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400', 'un', 36, 0.00, 0.00, false, NULL, '2025-11-11 05:00:28.392032+00', '2025-11-12 00:26:52.9621+00'),
  ('ef87e433-a6b3-4f72-a921-69820b7d63df', 'PROD-003', 'Impressora HP LaserJet', 'Impressora multifuncional HP LaserJet Pro com scanner e copiadora', 'Hardware', 'ambos', 'ambos', 'ativo', 1200.00, 80.00, 30, 0, 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', 'un', 36, 0.00, 0.00, false, NULL, '2025-11-11 05:00:28.392032+00', '2025-11-12 00:26:52.9621+00'),
  ('0d95030f-348c-40ba-a8f3-7245a511d2eb', 'PROD-004', 'Notebook Lenovo ThinkPad', 'Notebook empresarial Lenovo ThinkPad Intel Core i7, 16GB RAM, 512GB SSD', 'Hardware', 'ambos', 'ambos', 'ativo', 4500.00, 250.00, 25, 0, 'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400', 'un', 36, 0.00, 0.00, false, NULL, '2025-11-11 05:00:28.392032+00', '2025-11-12 00:26:52.9621+00'),
  ('410e479b-ccec-4ec5-915c-9f697dd7aeef', 'PROD-005', 'Sistema ERP Konnecta', 'Sistema de gestão empresarial integrado com módulos financeiro, estoque e vendas', 'Software', 'venda', 'venda', 'ativo', 15000.00, NULL, 999, 0, 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400', 'un', 36, 0.00, 0.00, false, NULL, '2025-11-11 05:00:28.392032+00', '2025-11-12 00:26:52.9621+00'),
  ('7113b1ac-08c1-4965-8c0c-6c9340769022', 'UROVO-FR2000', 'Leitor de secretária Urovo FR2000 UHF', 'Leitor RFID de secretária com desempenho excecional. Equipado com o chip Impinj E710 de última geração e algoritmos proprietários.', 'RFID', 'venda', 'venda', 'ativo', NULL, NULL, 0, 0, 'https://urovo-emea.com/wp-content/uploads/2023/08/FR2000_front_1080x1080.jpg.webp', 'un', 36, 0.00, 0.00, false, '044defb4-33a4-476b-a85a-6a7816edbbb9', '2025-11-11 23:57:17.798188+00', '2025-11-12 00:26:52.9621+00'),
  ('befbd8be-fc89-4075-8b2d-2b1906c2b321', 'UROVO-U2S', 'U2S Mobile Wearable Device', 'Built for the Fast-Paced Mobile Workforce. Lightweight, wearable computer designed to keep your hands free.', 'Wearable Devices', 'venda', 'venda', 'ativo', NULL, NULL, 0, 0, 'https://urovo-emea.com/wp-content/uploads/2024/05/U2S_front_1080x1080.webp', 'un', 36, 0.00, 0.00, false, '044defb4-33a4-476b-a85a-6a7816edbbb9', '2025-11-11 23:57:13.858415+00', '2025-11-12 00:26:52.9621+00'),
  ('8f705c53-f62d-418f-ac9c-2af0a8079cc2', 'UROVO-FR1000', 'Scanner FR1000 UHF da Urovo', 'Design robusto e durável para ambientes difíceis. CPU Octa-core de 1,6 GHz com chip Impinj E710.', 'RFID', 'venda', 'venda', 'ativo', NULL, NULL, 0, 0, 'https://urovo-emea.com/wp-content/uploads/2023/05/FR1000_side_2.jpg.webp', 'un', 36, 0.00, 0.00, false, '044defb4-33a4-476b-a85a-6a7816edbbb9', '2025-11-11 23:57:32.74821+00', '2025-11-12 00:26:52.9621+00'),
  ('795ef823-7193-4d34-a175-0405d737fee8', 'UROVO-DT66', 'DT66', 'Computador móvel empresarial robusto com ecrã de 6,5 polegadas, Wi-Fi 6E e 5G, bateria de 5.000 mAh de troca a quente.', 'Dispositivos robustos', 'venda', 'venda', 'ativo', NULL, NULL, 0, 0, 'https://urovo-emea.com/wp-content/uploads/2024/06/DT66_AER_700x700.webp', 'un', 36, 0.00, 0.00, false, '044defb4-33a4-476b-a85a-6a7816edbbb9', '2025-11-11 23:57:21.477945+00', '2025-11-12 00:26:52.9621+00')
ON CONFLICT (id) DO NOTHING;

-- Nota: Produtos Urovo adicionais (R70, DT51, RT40, S50, etc.) existem no banco
-- mas foram resumidos aqui. Consulte a tabela products para lista completa.

-- =====================================================
-- 8. OPPORTUNITIES (Oportunidades de Parceiros)
-- =====================================================
INSERT INTO public.opportunities (id, partner_id, client_id, product_name, tipo_oportunidade, valor_estimado, status, is_exclusive, data_validade_exclusividade, observacoes, approved_by, approved_at, data_registro, created_at, updated_at) VALUES
  ('eada30a7-d1cc-4328-8495-4ac67597afbd', '0f8e28d5-6ac3-42dc-8684-35510cb0a033', '0721f8ab-ec87-44eb-89c7-abe3bab38f49', 'silva sasaok', 'venda', 50000.00, 'aprovada', true, '2025-12-26 04:50:49.725+00', NULL, '041993bc-c6e3-4e3c-b021-691f202b9225', '2025-11-11 04:51:26.643+00', '2025-11-11 04:50:50.104393+00', '2025-11-11 04:50:50.104393+00', '2025-11-11 04:51:27.011218+00'),
  ('2d3c1fcc-b793-4488-b731-2acdf27b2b2d', '0f8e28d5-6ac3-42dc-8684-35510cb0a033', 'ac64117c-ff17-4c66-ac92-a9b16390e27f', 'Computador Dell Optiplex, Notebook Lenovo ThinkPad, Sistema ERP Konnecta', 'locacao', NULL, 'em_analise', true, '2025-12-26 05:03:21.063+00', NULL, NULL, NULL, '2025-11-11 05:03:21.433608+00', '2025-11-11 05:03:21.433608+00', '2025-11-11 05:03:21.433608+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 9. PROPOSALS (Propostas Comerciais)
-- =====================================================
INSERT INTO public.proposals (id, codigo, cliente_id, vendedor_id, data_proposta, validade, status, tipo_operacao, total_itens, total_geral, custo_total, lucro_total, margem_percentual_total, desconto_total, despesas_adicionais, versao, introducao, modelo_id, link_publico, created_at, updated_at) VALUES
  ('0ac7b2fc-36e2-4594-aec5-7838ed218205', 'KPROP-2025-001', '0721f8ab-ec87-44eb-89c7-abe3bab38f49', '041993bc-c6e3-4e3c-b021-691f202b9225', '2025-11-11', '2025-12-11', 'substituida', 'venda_direta', 1200.00, 1200.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1, 'Prezados, segue proposta comercial conforme especificações abaixo.', NULL, 'https://sirbywubugzbphxgjoob.lovableproject.com/proposta/KPROP-2025-001-v1?token=null', '2025-11-11 12:43:22.052983+00', '2025-11-11 13:09:57.09707+00'),
  ('a44b1bab-66f7-46c4-a34e-e7231f62673c', 'KPROP-2025-002', 'ac64117c-ff17-4c66-ac92-a9b16390e27f', '041993bc-c6e3-4e3c-b021-691f202b9225', '2025-11-11', '2025-12-11', 'rascunho', 'venda_direta', 9700.00, 9700.00, 0.00, 0.00, 0.00, 0.00, 0.00, 1, 'Prezados,

Segue nossa proposta comercial conforme especificações abaixo.', '5bc14d01-4828-4fff-bceb-9e34640c30a2', 'https://sirbywubugzbphxgjoob.lovableproject.com/proposta/KPROP-2025-002-v1?token=null', '2025-11-11 20:41:58.700033+00', '2025-11-11 23:36:59.528872+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 10. PROPOSAL_ITEMS (Itens das Propostas)
-- =====================================================
INSERT INTO public.proposal_items (id, proposal_id, product_id, descricao, codigo, quantidade, preco_unitario, valor_unitario, custo_unitario, desconto, total, margem, lucro_subtotal, unidade, imagem_url, created_at) VALUES
  ('98e2c9fb-3094-4c3a-938e-325a28e74877', '0ac7b2fc-36e2-4594-aec5-7838ed218205', 'ef87e433-a6b3-4f72-a921-69820b7d63df', 'Impressora HP LaserJet', 'PROD-003', 1, 1200.00, 1200.00, 0.00, 0.00, 1200.00, 0.00, 0.00, 'un', 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', '2025-11-11 12:43:22.76196+00'),
  ('c636a45a-c722-48f8-9c25-c422dad58d38', 'a44b1bab-66f7-46c4-a34e-e7231f62673c', 'ef87e433-a6b3-4f72-a921-69820b7d63df', 'Impressora HP LaserJet', 'PROD-003', 6, 1200.00, 1200.00, 0.00, 0.00, 7200.00, 0.00, 0.00, 'un', 'https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400', '2025-11-11 20:41:59.192056+00'),
  ('2cd768ef-dad8-4253-9850-0ccc2dd21e04', 'a44b1bab-66f7-46c4-a34e-e7231f62673c', '48f91eb4-5974-4ac3-9c70-9e781b729cce', 'Computador Dell Optiplex', 'PROD-001', 1, 2500.00, 2500.00, 0.00, 0.00, 2500.00, 0.00, 0.00, 'un', 'https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400', '2025-11-11 20:41:59.192056+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 11. PROPOSAL_TEMPLATES (Modelos de Propostas)
-- =====================================================
INSERT INTO public.proposal_templates (id, nome, tipo, cabecalho_html, rodape_html, status, created_by, created_at, updated_at) VALUES
  ('5bc14d01-4828-4fff-bceb-9e34640c30a2', 'Proposta Locação', 'locacao', 'Prezados,

Segue nossa proposta comercial conforme especificações abaixo.', 'Validade da proposta: 30 dias.
Agradecemos a preferência.', 'ativo', '041993bc-c6e3-4e3c-b021-691f202b9225', '2025-11-11 12:52:26.890986+00', '2025-11-11 12:52:26.890986+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- 12. PARTNER_PROPOSALS (Propostas de Parceiros)
-- =====================================================
INSERT INTO public.partner_proposals (id, partner_id, opportunity_id, client_id, products, status, observacoes, created_at, updated_at) VALUES
  ('f236e173-bc31-4e37-ba5b-73e182032314', '0f8e28d5-6ac3-42dc-8684-35510cb0a033', '2d3c1fcc-b793-4488-b731-2acdf27b2b2d', 'ac64117c-ff17-4c66-ac92-a9b16390e27f', '[{"id":"48f91eb4-5974-4ac3-9c70-9e781b729cce","nome":"Computador Dell Optiplex","descricao":"Computador desktop empresarial Dell Optiplex com processador Intel Core i5, 8GB RAM, 256GB SSD","imagem_url":"https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400","quantidade":1},{"id":"0d95030f-348c-40ba-a8f3-7245a511d2eb","nome":"Notebook Lenovo ThinkPad","descricao":"Notebook empresarial Lenovo ThinkPad Intel Core i7, 16GB RAM, 512GB SSD","imagem_url":"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400","quantidade":3},{"id":"410e479b-ccec-4ec5-915c-9f697dd7aeef","nome":"Sistema ERP Konnecta","descricao":"Sistema de gestão empresarial integrado com módulos financeiro, estoque e vendas","imagem_url":"https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=400","quantidade":3}]', 'aguardando', NULL, '2025-11-11 05:03:21.84619+00', '2025-11-11 05:03:21.84619+00')
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- TABELAS VAZIAS (sem dados inseridos ainda)
-- =====================================================
-- As seguintes tabelas existem mas não possuem dados:
-- - categories
-- - contracts
-- - contract_items
-- - contract_signers
-- - contract_attachments
-- - contract_templates (de contratos)
-- - cotacoes_compras
-- - cotacoes_compras_itens
-- - sales_orders
-- - sales_order_logs
-- - purchase_orders
-- - purchase_order_items
-- - accounts_payable
-- - accounts_payable_payments
-- - accounts_receivable
-- - accounts_receivable_payments
-- - bank_accounts
-- - bank_transactions
-- - contacts
-- - opportunities_crm
-- - commissions
-- - commission_rules
-- - tasks
-- - tickets
-- - warehouses
-- - product_movements
-- - product_supplier_codes
-- - supplier_brands
-- - rental_receipts
-- - rental_receipt_items
-- - roi_simulations
-- - quote_settings
-- - openai_config

-- =====================================================
-- FIM DO BACKUP
-- =====================================================
