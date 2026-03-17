-- ─────────────────────────────────────────────────────────────
-- O'Connor Agriculture — D1 seed data
-- Run: npx wrangler d1 execute oconner-db --remote --file=scripts/seed.sql
-- ─────────────────────────────────────────────────────────────

-- ── Products ──────────────────────────────────────────────────

INSERT OR IGNORE INTO products (id, name, description, category, is_meat_pack, price_per_kg, fixed_price, weight_options, pack_contents, image_url, stock_on_hand, min_threshold, active, display_order, gst_applicable, created_at, updated_at) VALUES

-- Beef boxes
('prod-bbq-box',    'BBQ Box',    'Rib Fillet, Eye Fillet, Sirloin, Topside, Brisket, Mince and Thick Sausages. Perfect for the BBQ enthusiast. 7–9kg per box.',    'packs', 1, NULL, 29000, NULL, 'Rib Fillet, Eye Fillet, Sirloin, Topside, Brisket, Mince, Thick Sausages', '', 10, 2, 1, 1, 1, 1742515200000, 1742515200000),
('prod-family-box', 'Family Box', 'Rump, Y-Bone, Rib Roast, Silverside, Diced Beef, Stir Fry Strips, Mince and Thick Sausages. Great all-round family box. 10–12kg per box.', 'packs', 1, NULL, 29000, NULL, 'Rump, Y-Bone, Rib Roast, Silverside, Diced Beef, Stir Fry Strips, Mince, Thick Sausages', '', 10, 2, 1, 2, 1, 1742515200000, 1742515200000),
('prod-double-box', 'Double Box', 'BBQ Box + Family Box combined. Best value per kg — approximately 17–21kg of premium grass fed beef.', 'packs', 1, NULL, 55000, NULL, 'BBQ Box + Family Box combined (~17–21kg)', '', 5,  1, 1, 3, 1, 1742515200000, 1742515200000),
('prod-value-box',  'Value Box',  '50% Mince & Sausages, 25% Roasts, 25% Secondary Cuts. Excellent value for everyday cooking. 10kg per box.', 'packs', 1, NULL, 22000, NULL, '50% Mince/Sausages, 25% Roasts, 25% Secondary Cuts', '', 10, 2, 1, 4, 1, 1742515200000, 1742515200000),

-- Individual cuts
('prod-eye-fillet',    'Eye Fillet',    'The most tender cut on the animal. Lean, fine-grained and full of flavour. Best pan-seared or on the BBQ.',    'beef', 0, 6500, NULL, '[200,400,600]',     NULL, '', 5, 1, 1, 5, 1, 1742515200000, 1742515200000),
('prod-rib-fillet',    'Rib Fillet',    'Richly marbled scotch fillet. Exceptional flavour and tenderness, ideal for the grill or cast iron pan.',       'beef', 0, 5000, NULL, '[250,500,750,1000]', NULL, '', 5, 1, 1, 6, 1, 1742515200000, 1742515200000),
('prod-sirloin',       'Sirloin',       'Classic sirloin steak with a firm texture and bold beefy flavour. Excellent grilled or pan-fried.',             'beef', 0, 3800, NULL, '[250,500,750,1000]', NULL, '', 8, 1, 1, 7, 1, 1742515200000, 1742515200000),
('prod-rump',          'Rump',          'Great value steak with a robust, deep beef flavour. Perfect for the BBQ or slow cooking as a roast.',           'beef', 0, 2800, NULL, '[500,1000,1500,2000]', NULL, '', 10, 2, 1, 8, 1, 1742515200000, 1742515200000),
('prod-brisket',       'Brisket',       'Perfect for slow cooking, smoking, or braising. Becomes incredibly tender with long, low heat.',                'beef', 0, 2200, NULL, '[1000,2000]',       NULL, '', 8, 1, 1, 9, 1, 1742515200000, 1742515200000),
('prod-diced-beef',    'Diced Beef',    'Versatile secondary cut ideal for casseroles, curries and slow-cooked stews. Great value for families.',        'beef', 0, 2000, NULL, '[500,1000,2000]',   NULL, '', 10, 2, 1, 10, 1, 1742515200000, 1742515200000),
('prod-mince',         'Beef Mince',    '100% grass fed beef mince. Perfect for bolognese, burgers, meatballs and everyday family meals.',               'beef', 0, 1800, NULL, '[500,1000,2000]',   NULL, '', 15, 3, 1, 11, 1, 1742515200000, 1742515200000),
('prod-sausages',      'Thick Sausages','Coarsely ground, naturally seasoned thick beef sausages. No fillers, no preservatives — just great beef.',      'beef', 0, 1600, NULL, '[500,1000,2000]',   NULL, '', 15, 3, 1, 12, 1, 1742515200000, 1742515200000);

-- ── Delivery Days (upcoming Saturdays) ────────────────────────

INSERT OR IGNORE INTO delivery_days (id, date, day_of_week, active, frozen, cutoff_time, max_orders, order_count, created_at) VALUES
('dd-2026-03-21', 1742515200000, 6, 1, 0, 1742342400000, 40, 0, 1742515200000),
('dd-2026-03-28', 1743120000000, 6, 1, 0, 1742947200000, 40, 0, 1742515200000),
('dd-2026-04-04', 1743724800000, 6, 1, 0, 1743552000000, 40, 0, 1742515200000),
('dd-2026-04-11', 1744329600000, 6, 1, 0, 1744156800000, 40, 0, 1742515200000),
('dd-2026-04-18', 1744934400000, 6, 1, 0, 1744761600000, 40, 0, 1742515200000),
('dd-2026-04-25', 1745539200000, 6, 1, 0, 1745366400000, 40, 0, 1742515200000);
