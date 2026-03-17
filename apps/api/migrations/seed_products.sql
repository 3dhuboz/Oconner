-- Seed new products from bulk cut menu
-- Prices stored in cents. Timestamps: Mar 17 2026 UTC.
INSERT OR IGNORE INTO products
  (id, name, description, category, is_meat_pack, price_per_kg, fixed_price,
   image_url, stock_on_hand, min_threshold, active, display_order,
   gst_applicable, created_at, updated_at)
VALUES
  ('prod-quarter-share',
   '1/4 Share Beef',
   'An economical way to buy local grass fed beef without the frills. Packed in freezer bags and boxed. Approximately 54-56 kg including bones (1/4 of 215-225 kg dressed weight). Price is per kg dressed weight and will vary slightly between animals.',
   'beef', 0, 1630, NULL, '', 0, 0, 1, 10, 1, 1742169600000, 1742169600000),

  ('prod-half-share',
   '1/2 Share Beef',
   'Our best value bulk buy. Packed in freezer bags and boxed. Approximately 107-112 kg including bones (1/2 of 215-225 kg dressed weight). Price is per kg dressed weight and will vary slightly between animals.',
   'beef', 0, 1530, NULL, '', 0, 0, 1, 11, 1, 1742169600000, 1742169600000),

  ('prod-sausages-mince',
   'Grass Fed Sausages & Mince',
   'Simply the best grass fed sausages and mince you''ve ever eaten! Minimum 5 kg order. Available in convenient 1 kg vacuum-sealed packs.',
   'beef', 0, 2499, NULL, '', 0, 0, 1, 12, 1, 1742169600000, 1742169600000),

  ('prod-dog-bones',
   'Grass Fed Dog Bones Box',
   '4 kg box of grass fed beef bones. Perfect for your dogs or for making a rich, flavourful bone broth at home.',
   'beef', 1, NULL, 2000, '', 0, 0, 1, 13, 1, 1742169600000, 1742169600000);
