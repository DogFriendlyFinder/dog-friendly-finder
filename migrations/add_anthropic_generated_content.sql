-- Migration: Add anthropic_generated_content column to restaurants table
-- Purpose: Store raw Anthropic API output for retry capability and audit trail
-- Date: 2025-01-21

ALTER TABLE restaurants
ADD COLUMN IF NOT EXISTS anthropic_generated_content jsonb;

COMMENT ON COLUMN restaurants.anthropic_generated_content IS
'Raw JSON output from Anthropic API - stores generated content before mapping to enable retries without regenerating';
