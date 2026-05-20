-- Migration: Add Static QRIS URL column to stores table
-- Date: 2026-05-21
-- Description: Adds qris_static_url to stores table for offline / manual QRIS GPN payments.

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS qris_static_url TEXT DEFAULT '';
