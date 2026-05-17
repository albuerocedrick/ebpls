-- =================================================================
-- Migration: 030_barangays_lookup.sql
-- Purpose:   Create the barangays lookup table and seed it with Liliw's
--            official DILG list.
-- =================================================================

CREATE TABLE IF NOT EXISTS public.barangays (
    id        SERIAL       PRIMARY KEY,
    name      VARCHAR(100) NOT NULL UNIQUE,
    is_active BOOLEAN      NOT NULL DEFAULT TRUE
);

COMMENT ON TABLE public.barangays IS 'Lookup table for barangays in Liliw, Laguna.';

-- Seed official DILG List of Barangays, Liliw, Laguna
INSERT INTO public.barangays (name) VALUES
    ('Bagong Anyo (Poblacion)'),
    ('Bayate'),
    ('Bongkol'),
    ('Bubukal'),
    ('Cabuyao'),
    ('Calumpang'),
    ('Culoy'),
    ('Dagatan'),
    ('Daniw'),
    ('Dita'),
    ('Ibabang Palina'),
    ('Ibabang San Roque'),
    ('Ibabang Sungi'),
    ('Ibabang Taykin'),
    ('Ilayang Palina'),
    ('Ilayang San Roque'),
    ('Ilayang Sungi'),
    ('Ilayang Taykin'),
    ('Kanlurang Bukal'),
    ('Laguan'),
    ('Luquin'),
    ('Malabo-Kalantukan'),
    ('Masikap (Poblacion)'),
    ('Maslun (Poblacion)'),
    ('Mojon'),
    ('Novaliches'),
    ('Oples'),
    ('Pag-asa (Poblacion)'),
    ('Palayan'),
    ('Rizal (Poblacion)'),
    ('San Isidro'),
    ('Silangang Bukal'),
    ('Tuy-Baanan')
ON CONFLICT (name) DO NOTHING;
