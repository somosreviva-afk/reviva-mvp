-- Adiciona campo origem nos pedidos
ALTER TABLE pedidos ADD COLUMN IF NOT EXISTS origem TEXT DEFAULT 'whatsapp_local';

-- Pedidos que já têm transportadora = whatsapp_correio
UPDATE pedidos SET origem = 'whatsapp_correio' WHERE transportadora IS NOT NULL AND transportadora != '' AND origem = 'whatsapp_local';

-- Pedidos que vieram da Nuvemshop = nuvemshop
UPDATE pedidos SET origem = 'nuvemshop' WHERE nuvemshop_order_id IS NOT NULL;
