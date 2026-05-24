-- Seed data for parts (80+ entries recommended; aqui incluí 30 como exemplo)
INSERT INTO public.parts (slug, name, category, subcategory, brand, description, price_min, price_max, compatible_cars, image_url, notes) VALUES
('coilover-street-tein', 'Coilover Street', 'Suspensão', 'Coilover', 'Tein', 'Coilover ajustável para uso diário', 1500, 2500, ARRAY['honda-civic-g8','vw-golf-mk7'], 'https://example.com/coilover-tein.jpg', NULL),
('coilover-street-kw', 'Coilover Street', 'Suspensão', 'Coilover', 'KW', 'Coilover de alta performance', 2000, 3000, ARRAY['honda-civic-g9','subaru-impreza-wrx'], 'https://example.com/coilover-kw.jpg', NULL),
('coilover-street-bc', 'Coilover Street', 'Suspensão', 'Coilover', 'BC Racing', 'Coilover popular entre tuners', 1800, 2700, ARRAY['vw-golf-mk7','ford-fiesta-st'], 'https://example.com/coilover-bc.jpg', NULL),
('mola-esportiva-eibach', 'Mola Esportiva', 'Suspensão', NULL, 'Eibach', 'Mola para reduzir altura do carro', 300, 500, ARRAY['honda-civic-g8','honda-civic-g9'], 'https://example.com/mola-eibach.jpg', NULL),
('mola-esportiva-hr', 'Mola Esportiva', 'Suspensão', NULL, 'H&R', 'Mola de alta performance', 350, 560, ARRAY['vw-gol-g5','vw-golf-mk7'], 'https://example.com/mola-hr.jpg', NULL),
('amortecedor-esportivo-monroe', 'Amortecedor Esportivo', 'Suspensão', NULL, 'Monroe', 'Amortecedor para street use', 600, 900, ARRAY['honda-civic-g9','subaru-impreza-wrx'], 'https://example.com/amortecedor-monroe.jpg', NULL),
('barra-estabilizadora-reforcada', 'Barra Estabilizadora Reforçada', 'Suspensão', NULL, 'Whiteline', 'Barra reforçada para maior rigidez', 120, 200, ARRAY['vw-golf-mk7','fiat-palio-weekend'], 'https://example.com/barra-whiteline.jpg', NULL),
('bucha-poliuretano', 'Bucha de Poliuretano', 'Suspensão', NULL, 'SuperPro', 'Bucha durável para suspensão', 30, 60, ARRAY['honda-civic-g8','vw-gol-g5'], 'https://example.com/bucha-superpro.jpg', NULL),
('coxic-motor-reforcado', 'Coxim de Motor Reforçado', 'Suspensão', NULL, 'Whiteline', 'Coxim resistente para motor potente', 80, 130, ARRAY['subaru-impreza-wrx','honda-fit'], 'https://example.com/coxim-whiteline.jpg', NULL),
('kit-rebaixamento', 'Kit Rebaixamento', 'Suspensão', NULL, 'BC Racing', 'Kit completo para rebaixar o carro', 2000, 3000, ARRAY['honda-civic-g9','vw-golf-mk7'], 'https://example.com/kit-rebaixamento.jpg', NULL),

('roda-17-oz', 'Roda 17" Liga Leve', 'Rodas e Pneus', NULL, 'OZ Racing', 'Roda de liga leve 17 polegadas', 2500, 3500, ARRAY['honda-civic-g8','vw-golf-mk7'], 'https://example.com/roda-oz-17.jpg', NULL),
('roda-18-bbs', 'Roda 18" Liga Leve', 'Rodas e Pneus', NULL, 'BBS', 'Roda de alta performance 18"', 4000, 5500, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/roda-bbs-18.jpg', NULL),
('pneu-low-205-40-17', 'Pneu Perfil Baixo 205/40R17', 'Rodas e Pneus', NULL, 'Michelin', 'Pneu de alta aderência', 600, 900, ARRAY['honda-civic-g8','vw-golf-mk7'], 'https://example.com/pneu-205-40-17.jpg', NULL),
('pneu-225-45-18', 'Pneu 225/45R18', 'Rodas e Pneus', NULL, 'Pirelli', 'Pneu versátil para desempenho', 800, 1200, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/pneu-225-45-18.jpg', NULL),
('espacador-15mm', 'Espacador de Roda 15mm', 'Rodas e Pneus', NULL, 'OEM', 'Espacador padrão 15mm', 40, 70, ARRAY['honda-civic-g8','vw-golf-mk7'], 'https://example.com/espacador-15mm.jpg', NULL),

('intake-cold-air-kn', 'Intake Cold Air', 'Motor e Performance', NULL, 'K&N', 'Filtro de ar de alta vazão', 300, 450, ARRAY['honda-civic-g9','subaru-impreza-wrx'], 'https://example.com/intake-kn.jpg', NULL),
('escape-catback-borla', 'Escape Catback Inox', 'Motor e Performance', NULL, 'Borla', 'Escape de performance em aço inox', 1200, 1800, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/escape-borla.jpg', NULL),
('downpipe-3inch', 'Downpipe 3"', 'Motor e Performance', NULL, 'Custom', 'Downpipe de 3 polegadas para turbo', 800, 1100, ARRAY['subaru-impreza-wrx'], 'https://example.com/downpipe-3.jpg', NULL),
('turbina-t4', 'Turbina T4', 'Motor e Performance', NULL, 'Garrett', 'Turbina de alta pressão', 2500, 3500, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/turbina-t4.jpg', NULL),
('bov-hks', 'BOV (Blow‑Off Valve)', 'Motor e Performance', NULL, 'HKS', 'Válvula para liberar pressão do turbo', 200, 350, ARRAY['subaru-impreza-wrx'], 'https://example.com/bov-hks.jpg', NULL),

('brembo-disc-ventilado', 'Disco de Freio Ventilado', 'Freios', NULL, 'Brembo', 'Disco ventilado para alta dissipação de calor', 500, 800, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/disco-brembo.jpg', NULL),
('pastilha-ecb', 'Pastilha de Freio Esportiva', 'Freios', NULL, 'EBC', 'Pastilha de alto desempenho', 150, 250, ARRAY['honda-civic-g9','vw-golf-mk7'], 'https://example.com/pastilha-ecb.jpg', NULL),
('fluidos-dt-5-1', 'Fluido de Freio DOT 5.1', 'Freios', NULL, 'Brembo', 'Fluido de alta performance', 30, 50, ARRAY['honda-civic-g9','subaru-impreza-wrx'], 'https://example.com/fluido-dt5-1.jpg', NULL),

('lip-dianteiro-universal', 'Lip Dianteiro Universal', 'Estética e Bodykit', NULL, 'OEM', 'Lip frontal para visual esportivo', 80, 120, ARRAY['honda-civic-g8','vw-golf-mk7'], 'https://example.com/lip-dianteiro.jpg', NULL),
('spoiler-teto', 'Spoiler de Teto', 'Estética e Bodykit', NULL, 'OEM', 'Spoiler traseiro de teto', 100, 150, ARRAY['honda-civic-g9','subaru-impreza-wrx'], 'https://example.com/spoiler-teto.jpg', NULL),
('capo-fibra-carbono', 'Capô Fibra de Carbono', 'Estética e Bodykit', NULL, 'OEM', 'Capô leve em fibra de carbono', 1200, 1800, ARRAY['subaru-impreza-wrx'], 'https://example.com/capo-carbono.jpg', NULL),

('volante-sparco', 'Volante Esportivo', 'Interno', NULL, 'Sparco', 'Volante de 400mm para melhor controle', 600, 950, ARRAY['honda-civic-g9','subaru-impreza-wrx'], 'https://example.com/volante-sparco.jpg', NULL),
('banco-recaro', 'Banco Esportivo', 'Interno', NULL, 'Recaro', 'Assento com suporte lateral', 1500, 2300, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/banco-recaro.jpg', NULL),
('cinto-4pontos', 'Cinto de 4 Pontos', 'Interno', NULL, 'Sabelt', 'Cinto de segurança de competição', 350, 550, ARRAY['subaru-impreza-wrx'], 'https://example.com/cinto-4pontos.jpg', NULL),

('subwoofer-12-jbl', 'Subwoofer 12"', 'Som Automotivo', NULL, 'JBL', 'Subwoofer para graves profundos', 400, 650, ARRAY['honda-civic-g8','vw-golf-mk7'], 'https://example.com/subwoofer-12-jbl.jpg', NULL),
('amplificador-1000w', 'Amplificador Mono 1000W', 'Som Automotivo', NULL, 'Taramps', 'Amplificador potente para subwoofer', 800, 1200, ARRAY['subaru-impreza-wrx','ford-fiesta-st'], 'https://example.com/ampli-1000w.jpg', NULL);
