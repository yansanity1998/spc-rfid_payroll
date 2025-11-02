-- create_clearances_table.sql
-- Migration: create a dedicated table to store clearance records per user

-- Run this in your Postgres/Supabase SQL editor or via migration

CREATE TABLE IF NOT EXISTS public.clearances (
  id BIGSERIAL PRIMARY KEY,
  -- user_id must match the type of public.users.id in your database
  -- your DB reported users.id is bigint, so use bigint here
  user_id bigint NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- term identifiers so a user can have multiple clearance records (one per term)
  term text,
  school_year text,
  clearance_status text,
  clearance_remarks text,
  date_cleared date,
  time_cleared time,
  complete_clearance boolean DEFAULT false,
  date_submitted date,
  time_submitted time,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- ensure one clearance record per user per term+school_year (optional)
CREATE UNIQUE INDEX IF NOT EXISTS idx_clearances_user_term ON public.clearances(user_id, term, school_year);

-- Trigger to update updated_at automatically (optional)
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_update_clearances_updated_at ON public.clearances;
CREATE TRIGGER trg_update_clearances_updated_at
BEFORE UPDATE ON public.clearances
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
