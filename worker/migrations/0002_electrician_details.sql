-- Add detailed fields to electricians table
ALTER TABLE electricians ADD COLUMN licence_number TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN licence_expiry TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN car_make TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN car_model TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN car_rego TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN drivers_licence TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN emergency_contact_name TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN emergency_contact_phone TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN notes TEXT DEFAULT '';
ALTER TABLE electricians ADD COLUMN is_active INTEGER DEFAULT 1;
