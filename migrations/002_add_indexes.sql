-- Migration 002: Add property address index for duplicate detection queries
-- Run via: wrangler d1 execute wirez-r-us-db --file=migrations/002_add_indexes.sql

CREATE INDEX IF NOT EXISTS idx_jobs_property ON jobs(property_address);
