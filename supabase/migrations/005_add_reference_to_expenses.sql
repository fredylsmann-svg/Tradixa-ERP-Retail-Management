-- Migration 005: Add reference column to expenses table for OPEX tracking
ALTER TABLE expenses ADD COLUMN IF NOT EXISTS reference TEXT DEFAULT '';
