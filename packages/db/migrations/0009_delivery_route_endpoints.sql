ALTER TABLE delivery_days ADD COLUMN route_start_address TEXT;
ALTER TABLE delivery_days ADD COLUMN route_start_lat REAL;
ALTER TABLE delivery_days ADD COLUMN route_start_lng REAL;
ALTER TABLE delivery_days ADD COLUMN route_finish_address TEXT;
ALTER TABLE delivery_days ADD COLUMN route_finish_lat REAL;
ALTER TABLE delivery_days ADD COLUMN route_finish_lng REAL;
