-- Migration: Add Payment Gateway & Bank Account fields to stores
-- Date: 2026-05-02
-- Description: Adds mayar_api_key, bank_name, and bank_account_number to the stores table for BYOK SaaS support.

ALTER TABLE stores
ADD COLUMN IF NOT EXISTS mayar_api_key TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bank_name TEXT DEFAULT '',
ADD COLUMN IF NOT EXISTS bank_account_number TEXT DEFAULT '';
