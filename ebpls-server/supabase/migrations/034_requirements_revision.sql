-- Phase 1 - Step 1.1: Add new columns to requirement_types
ALTER TABLE requirement_types ADD COLUMN applies_to_new BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE requirement_types ADD COLUMN applies_to_renewal BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE requirement_types ADD COLUMN is_conditional BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE requirement_types ADD COLUMN condition_type VARCHAR(50) DEFAULT 'none'
    CHECK (condition_type IN ('none', 'org_type', 'business_activity', 'rental_status'));
ALTER TABLE requirement_types ADD COLUMN condition_description TEXT;
ALTER TABLE requirement_types ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0;
ALTER TABLE requirement_types ADD COLUMN max_files INTEGER NOT NULL DEFAULT 1;

-- Phase 1 - Step 1.2: Create requirement_conditions table
CREATE TABLE requirement_conditions (
    id SERIAL PRIMARY KEY,
    requirement_id INTEGER NOT NULL REFERENCES requirement_types(id) ON DELETE CASCADE,
    match_value VARCHAR(255) NOT NULL,
    UNIQUE(requirement_id, match_value)
);

-- Phase 1 - Step 1.3: Add is_renting to businesses
ALTER TABLE businesses ADD COLUMN is_renting BOOLEAN NOT NULL DEFAULT FALSE;

-- Phase 1 - Step 1.4: Insert new business_activities entries
INSERT INTO business_activities (name, description, is_active) VALUES 
('Hotel / Hostel / Hometel', 'Accommodation', true),
('Apartment', 'Accommodation', true),
('Resort', 'Accommodation', true),
('Event''s Place', 'Accommodation', true),
('Storage', 'Accommodation', true),
('Piggery', 'Livestock', true),
('Poultry', 'Livestock', true),
('Hatchery', 'Livestock', true),
('Gasoline Refilling Station', 'Fuel & Services', true),
('Cemetery', 'Fuel & Services', true),
('Parking', 'Fuel & Services', true),
('Space Rental', 'Fuel & Services', true),
('Banks / Banking', 'Finance', true),
('Mini Mart', 'Finance', true),
('Groceries', 'Finance', true),
('Water Refilling Station', 'Utilities', true),
('LPG Dealer / Retailer', 'Utilities', true),
('Lumber Industry', 'Industry', true),
('Lambanog Industry', 'Industry', true),
('Remittance Center', 'Financial Services', true),
('Microfinance', 'Financial Services', true),
('Commercial Establishment', 'Financial Services', true)
ON CONFLICT (name) DO NOTHING;

-- Phase 1 - Step 1.5: Retire obsolete requirement types
UPDATE requirement_types SET is_active = false WHERE name IN (
    'DTI / SEC / CDA Registration',
    'Zoning Clearance',
    'Community Tax Certificate (CTC)',
    'Lease Contract / TCT',
    'Owner''s Valid ID (Front)',
    'Owner''s Valid ID (Back)',
    'Previous Year Business Permit'
);

-- Phase 1 - Step 1.6: Update existing active requirements
UPDATE requirement_types SET applies_to_new=true, applies_to_renewal=true, sort_order=1 WHERE name = 'Barangay Business Clearance';
UPDATE requirement_types SET applies_to_new=true, applies_to_renewal=false, sort_order=6 WHERE name = 'Fire Safety Inspection Certificate';
UPDATE requirement_types SET applies_to_new=true, applies_to_renewal=false, sort_order=7 WHERE name = 'Sanitary Permit';

-- Phase 1 - Step 1.7: Insert new requirement types
INSERT INTO requirement_types (name, applies_to_new, applies_to_renewal, is_conditional, condition_type, max_files, sort_order) VALUES
('Laboratories (Photocopy of X-ray Result)', true, true, false, 'none', 1, 2),
('Realty Tax (OR-Amilyar)', true, true, false, 'none', 1, 3),
('Lessor''s Permit', true, true, true, 'rental_status', 1, 4),
('Latest Water Analysis Result', true, true, true, 'business_activity', 1, 5),
('DTI Registration', true, false, true, 'org_type', 1, 8),
('SEC Registration', true, false, true, 'org_type', 1, 9),
('CDA Registration', true, false, true, 'org_type', 1, 10),
('Valid Government ID', true, false, true, 'org_type', 2, 11),
('PCAB License', true, false, true, 'business_activity', 1, 12),
('Lease Contract', true, false, true, 'rental_status', 1, 13),
('Building Permit / Locational Clearance', true, false, true, 'business_activity', 1, 14),
('ECC or CNC, LLDA Clearance', true, false, true, 'business_activity', 1, 15),
('BSP Certificate / Authority to Operate', true, false, true, 'business_activity', 1, 16),
('Chainsaw Registration', true, false, true, 'business_activity', 1, 17),
('FDA Registration', true, false, true, 'business_activity', 1, 18),
('Previous Business Permit and Receipt', false, true, false, 'none', 1, 19),
('Audited Financial Statement / VAT Returns / Gross Sales', false, true, false, 'none', 3, 20),
('Previous FSIC Issued (BFP)', false, true, false, 'none', 1, 21),
('Real Property Tax Receipt', false, true, true, 'business_activity', 1, 22),
('DOE Certificate (LPG Dealer/Retailer)', false, true, true, 'business_activity', 1, 23);

-- Phase 1 - Step 1.8: Insert requirement_conditions seed data
INSERT INTO requirement_conditions (requirement_id, match_value) VALUES 
((SELECT id FROM requirement_types WHERE name = 'DTI Registration'), 'Sole Proprietorship'),
((SELECT id FROM requirement_types WHERE name = 'SEC Registration'), 'Corporation'),
((SELECT id FROM requirement_types WHERE name = 'SEC Registration'), 'Partnership'),
((SELECT id FROM requirement_types WHERE name = 'CDA Registration'), 'Cooperative'),

-- Assuming Valid Government ID applies to all org types for New
((SELECT id FROM requirement_types WHERE name = 'Valid Government ID'), 'Sole Proprietorship'),
((SELECT id FROM requirement_types WHERE name = 'Valid Government ID'), 'Corporation'),
((SELECT id FROM requirement_types WHERE name = 'Valid Government ID'), 'Partnership'),
((SELECT id FROM requirement_types WHERE name = 'Valid Government ID'), 'Cooperative'),

-- rental_status
((SELECT id FROM requirement_types WHERE name = 'Lessor''s Permit'), 'true'),
((SELECT id FROM requirement_types WHERE name = 'Lease Contract'), 'true'),

-- business_activity
((SELECT id FROM requirement_types WHERE name = 'Latest Water Analysis Result'), 'Water Refilling Station'),
((SELECT id FROM requirement_types WHERE name = 'PCAB License'), 'Construction'),

((SELECT id FROM requirement_types WHERE name = 'BSP Certificate / Authority to Operate'), 'Banks / Banking'),
((SELECT id FROM requirement_types WHERE name = 'BSP Certificate / Authority to Operate'), 'Remittance Center'),
((SELECT id FROM requirement_types WHERE name = 'BSP Certificate / Authority to Operate'), 'Microfinance'),

((SELECT id FROM requirement_types WHERE name = 'Chainsaw Registration'), 'Lumber Industry'),
((SELECT id FROM requirement_types WHERE name = 'FDA Registration'), 'Lambanog Industry'),

-- Real Property Tax Receipt
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Hotel / Hostel / Hometel'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Apartment'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Resort'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Event''s Place'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Storage'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Piggery'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Poultry'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Hatchery'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Gasoline Refilling Station'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Cemetery'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Parking'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Space Rental'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Lumber Industry'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Lambanog Industry'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Banks / Banking'),
((SELECT id FROM requirement_types WHERE name = 'Real Property Tax Receipt'), 'Commercial Establishment'),

-- DOE
((SELECT id FROM requirement_types WHERE name = 'DOE Certificate (LPG Dealer/Retailer)'), 'LPG Dealer / Retailer');

-- Adding ECC or CNC for Piggery, Poultry, Hatchery as well as others based on plan.
INSERT INTO requirement_conditions (requirement_id, match_value) VALUES
((SELECT id FROM requirement_types WHERE name = 'ECC or CNC, LLDA Clearance'), 'Piggery'),
((SELECT id FROM requirement_types WHERE name = 'ECC or CNC, LLDA Clearance'), 'Poultry'),
((SELECT id FROM requirement_types WHERE name = 'ECC or CNC, LLDA Clearance'), 'Hatchery');

-- Phase 1 - Step 1.9: Add RLS policy for requirement_conditions
ALTER TABLE requirement_conditions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated users can read requirement_conditions" ON requirement_conditions FOR SELECT TO authenticated USING (true);
