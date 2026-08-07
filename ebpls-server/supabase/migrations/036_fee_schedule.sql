-- ---------------------------------------------------------------
-- Migration: 036_fee_schedule.sql
-- Description: Creates the fee schedule tables and seeds data based on the Revenue Code
-- ---------------------------------------------------------------

-- ---------------------------------------------------------------
-- Table: fee_schedule_categories
-- Groups fee schedule items into Revenue Code sections
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_schedule_categories (
    id          SERIAL PRIMARY KEY,
    name        VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    sort_order  INTEGER NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------
-- Table: fee_schedule_items
-- Individual fee entries from the Revenue Code
-- Supports: Fixed fees, tiered fees (min/max range)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_schedule_items (
    id              SERIAL PRIMARY KEY,
    category_id     INTEGER NOT NULL REFERENCES public.fee_schedule_categories(id),
    
    -- Business type / line of business name
    business_type   VARCHAR(255) NOT NULL,
    
    -- For tiered fees (piggery, poultry, boarding houses):
    -- NULL = no tier (flat fixed fee)
    tier_label      VARCHAR(150),         -- e.g., "10 heads or more but less than 15 heads"
    tier_min        INTEGER,              -- e.g., 10
    tier_max        INTEGER,              -- e.g., 14 (NULL = unlimited upper)
    tier_unit       VARCHAR(50),          -- e.g., "heads", "boarders", "seating_capacity"
    
    -- The fee amount (PHP)
    amount          NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_exempt       BOOLEAN NOT NULL DEFAULT FALSE,  -- TRUE for "Exempt" entries
    
    -- Matching: used to link to business_activities
    activity_match  VARCHAR(255),         -- Maps to business_activities.name for auto-matching
    
    sort_order      INTEGER NOT NULL DEFAULT 0,
    is_active       BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- Table: fee_schedule_rules
-- Special rules from the Revenue Code (surcharge, duplicates, etc.)
-- ---------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.fee_schedule_rules (
    id          SERIAL PRIMARY KEY,
    rule_code   VARCHAR(50) NOT NULL UNIQUE,
    title       VARCHAR(255) NOT NULL,
    description TEXT NOT NULL,
    value       NUMERIC(10,4),   -- e.g., 0.25 for 25% surcharge, or 500.00 for flat fee
    is_active   BOOLEAN NOT NULL DEFAULT TRUE
);

-- ---------------------------------------------------------------
-- Enable Row Level Security (RLS)
-- ---------------------------------------------------------------
ALTER TABLE public.fee_schedule_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedule_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fee_schedule_rules ENABLE ROW LEVEL SECURITY;

-- ---------------------------------------------------------------
-- RLS Policies (Read-only for authenticated users)
-- ---------------------------------------------------------------

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'fee_schedule_categories' AND policyname = 'Allow authenticated read access on fee_schedule_categories'
    ) THEN
        CREATE POLICY "Allow authenticated read access on fee_schedule_categories" 
        ON public.fee_schedule_categories FOR SELECT 
        TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'fee_schedule_items' AND policyname = 'Allow authenticated read access on fee_schedule_items'
    ) THEN
        CREATE POLICY "Allow authenticated read access on fee_schedule_items" 
        ON public.fee_schedule_items FOR SELECT 
        TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT FROM pg_policies WHERE tablename = 'fee_schedule_rules' AND policyname = 'Allow authenticated read access on fee_schedule_rules'
    ) THEN
        CREATE POLICY "Allow authenticated read access on fee_schedule_rules" 
        ON public.fee_schedule_rules FOR SELECT 
        TO authenticated USING (true);
    END IF;
END $$;


-- ---------------------------------------------------------------
-- Seed Data: Special Rules
-- ---------------------------------------------------------------
INSERT INTO public.fee_schedule_rules (rule_code, title, description, value) 
VALUES
    ('SURCHARGE_LATE', 'Late Payment Surcharge', 'Section 3A.03: 25% surcharge on original fee for failure to pay/renew within prescribed period.', 0.25),
    ('DUPLICATE_FEE', 'Duplicate Permit Fee', 'Section 3A.01(3): ₱200.00 for each duplicate permit issued.', 200.00),
    ('DEFAULT_FEE', 'Default Business Fee', 'Section 3A.01(a): ₱500.00 for any business not specifically enumerated.', 500.00)
ON CONFLICT (rule_code) DO NOTHING;

-- ---------------------------------------------------------------
-- Seed Data: Categories
-- ---------------------------------------------------------------
INSERT INTO public.fee_schedule_categories (id, name, description, sort_order) 
VALUES
    (1, 'Manufacturers, Producers & Importers', 'Businesses subject to graduated tax under Article A, Chapter II', 1),
    (2, 'Exporters', 'Export businesses subject to graduated tax', 2),
    (3, 'Distributors, Wholesalers & Retailers', 'Distribution and retail businesses subject to graduated tax', 3),
    (4, 'Sari-Sari Stores', 'Sari-sari stores classified by road location', 4),
    (5, 'Piggery Farms', 'Piggery farms classified by head count (tiered)', 5),
    (6, 'Poultry & Duck Farms (Broiler)', 'Broiler poultry farms classified by head count', 6),
    (7, 'Poultry & Duck Farms (Layer)', 'Layer poultry farms classified by head count', 7),
    (8, 'Service Establishments', 'Service-based businesses', 8),
    (9, 'Tobacco Dealers', 'Tobacco wholesale and retail dealers', 9),
    (10, 'Liquor, Spirits & Wine Dealers', 'Dealers in fermented liquors, distilled spirits and wines', 10),
    (11, 'Amusement Places & Devices', 'Entertainment venues and amusement devices', 11),
    (12, 'Financial Establishments', 'Banks, insurance, pawnshops, money changers', 12),
    (13, 'Other Businesses', 'Board/lodging, apartments, rice/corn mills, catch-all', 13)
ON CONFLICT (id) DO NOTHING;

-- Fix identity sequence
SELECT setval('fee_schedule_categories_id_seq', (SELECT MAX(id) FROM fee_schedule_categories));

-- ---------------------------------------------------------------
-- Seed Data: Items
-- ---------------------------------------------------------------
-- Delete existing seed data if we are rerunning, to avoid duplicates
DELETE FROM public.fee_schedule_items;

INSERT INTO public.fee_schedule_items (category_id, business_type, amount, activity_match, sort_order) VALUES
    (1, 'Air gun', 200.00, 'Air gun', 1),
    (1, 'Bakery Products', 500.00, 'Bakery Products', 2),
    (1, 'Candies and Caramels', 300.00, 'Candies and Caramels', 3),
    (1, 'Ceramics and Clay Products', 500.00, 'Ceramics', 4),
    (1, 'Cigars and Cigarettes', 1000.00, 'Tobacco Manufacturing', 5),
    (1, 'Coffee', 300.00, 'Coffee Manufacturing', 6),
    (1, 'Concrete and Cement Products', 800.00, 'Concrete Products', 7),
    (1, 'Cordage and Twine', 300.00, 'Cordage', 8),
    (1, 'Food Products (General)', 500.00, 'Food Products', 9),
    (1, 'Furniture and other products', 800.00, 'Furniture', 10),
    (1, 'Garments', 500.00, 'Garments', 11),
    (1, 'Glassware', 500.00, 'Glassware', 12),
    (1, 'Lumber and Lumber Products', 800.00, 'Lumber Industry', 13),
    (1, 'Metal Products', 800.00, 'Metal Products', 14),
    (1, 'Plastic Products', 800.00, 'Plastic Products', 15),

    (2, 'Export of Goods', 1000.00, 'Export of Goods', 1),
    (2, 'Export of Services', 1000.00, 'Export of Services', 2),
    (2, 'Other Exports', 1000.00, 'Other Exports', 3),

    (3, 'Auto Parts and Supplies', 800.00, 'Auto Parts', 1),
    (3, 'Books and School Supplies', 400.00, 'Books and School Supplies', 2),
    (3, 'Boutiques / RTW', 500.00, 'Boutiques', 3),
    (3, 'Computer and Electronics', 800.00, 'Electronics', 4),
    (3, 'Construction Materials', 1000.00, 'Construction Materials', 5),
    (3, 'Cosmetics and Toiletries', 500.00, 'Cosmetics', 6),
    (3, 'Department Store', 2500.00, 'Department Store', 7),
    (3, 'Drug Store / Pharmacy', 800.00, 'Drug Store', 8),
    (3, 'Electrical Supplies', 600.00, 'Electrical Supplies', 9),
    (3, 'Feeds and Poultry Supplies', 500.00, 'Feeds', 10),
    (3, 'Fertilizers and Agrochemicals', 500.00, 'Fertilizers', 11),
    (3, 'Fish and Seafoods', 300.00, 'Fish and Seafoods', 12),
    (3, 'Flower Shop', 300.00, 'Flower Shop', 13),
    (3, 'Fruit Stand', 300.00, 'Fruit Stand', 14),
    (3, 'Furniture Store', 800.00, 'Furniture Store', 15),
    (3, 'Gift Shop', 400.00, 'Gift Shop', 16),
    (3, 'Grocery / Supermarket', 1500.00, 'Grocery', 17),
    (3, 'Hardware Store', 1000.00, 'Hardware', 18),
    (3, 'Jewelry Store', 1500.00, 'Jewelry Store', 19),
    (3, 'Meat Shop', 400.00, 'Meat Shop', 20),
    (3, 'Motorcycle Parts', 600.00, 'Motorcycle Parts', 21),
    (3, 'Office Supplies', 400.00, 'Office Supplies', 22),
    (3, 'Optical Goods', 500.00, 'Optical Goods', 23),
    (3, 'Paint Store', 600.00, 'Paint Store', 24),
    (3, 'Photo Supplies', 400.00, 'Photo Supplies', 25),
    (3, 'Rice and Corn Dealer', 500.00, 'Rice Dealer', 26),
    (3, 'Sporting Goods', 500.00, 'Sporting Goods', 27),
    (3, 'Vegetable Stand', 300.00, 'Vegetable Stand', 28),

    (4, 'Sari-Sari Store (National Highway)', 500.00, 'Sari-Sari Store (National)', 1),
    (4, 'Sari-Sari Store (Provincial/Municipal)', 300.00, 'Sari-Sari Store', 2),
    (4, 'Sari-Sari Store (Barangay)', 150.00, 'Sari-Sari Store (Barangay)', 3);

-- Tiered example (Piggery):
INSERT INTO public.fee_schedule_items (category_id, business_type, tier_label, tier_min, tier_max, tier_unit, amount, is_exempt, sort_order) VALUES
    (5, 'Piggery Farm', 'Less than 10 heads', NULL, 9, 'heads', 0.00, TRUE, 1),
    (5, 'Piggery Farm', '10-14 heads', 10, 14, 'heads', 500.00, FALSE, 2),
    (5, 'Piggery Farm', '15-29 heads', 15, 29, 'heads', 600.00, FALSE, 3),
    (5, 'Piggery Farm', '30-49 heads', 30, 49, 'heads', 700.00, FALSE, 4),
    (5, 'Piggery Farm', '50-99 heads', 50, 99, 'heads', 800.00, FALSE, 5),
    (5, 'Piggery Farm', '100-299 heads', 100, 299, 'heads', 1500.00, FALSE, 6),
    (5, 'Piggery Farm', '300-999 heads', 300, 999, 'heads', 2000.00, FALSE, 7),
    (5, 'Piggery Farm', '1000 heads or more', 1000, NULL, 'heads', 3000.00, FALSE, 8),

    (6, 'Poultry Farm (Broiler)', 'Less than 300 heads', NULL, 299, 'heads', 0.00, TRUE, 1),
    (6, 'Poultry Farm (Broiler)', '300-999 heads', 300, 999, 'heads', 500.00, FALSE, 2),
    (6, 'Poultry Farm (Broiler)', '1000-2999 heads', 1000, 2999, 'heads', 600.00, FALSE, 3),
    (6, 'Poultry Farm (Broiler)', '3000-4999 heads', 3000, 4999, 'heads', 700.00, FALSE, 4),
    (6, 'Poultry Farm (Broiler)', '5000-9999 heads', 5000, 9999, 'heads', 800.00, FALSE, 5),
    (6, 'Poultry Farm (Broiler)', '10000-49999 heads', 10000, 49999, 'heads', 1500.00, FALSE, 6),
    (6, 'Poultry Farm (Broiler)', '50000-99999 heads', 50000, 99999, 'heads', 2000.00, FALSE, 7),
    (6, 'Poultry Farm (Broiler)', '100000 heads or more', 100000, NULL, 'heads', 3000.00, FALSE, 8),

    (7, 'Poultry Farm (Layer)', 'Less than 100 heads', NULL, 99, 'heads', 0.00, TRUE, 1),
    (7, 'Poultry Farm (Layer)', '100-299 heads', 100, 299, 'heads', 500.00, FALSE, 2),
    (7, 'Poultry Farm (Layer)', '300-999 heads', 300, 999, 'heads', 600.00, FALSE, 3),
    (7, 'Poultry Farm (Layer)', '1000-2999 heads', 1000, 2999, 'heads', 700.00, FALSE, 4),
    (7, 'Poultry Farm (Layer)', '3000-4999 heads', 3000, 4999, 'heads', 800.00, FALSE, 5),
    (7, 'Poultry Farm (Layer)', '5000-9999 heads', 5000, 9999, 'heads', 1500.00, FALSE, 6),
    (7, 'Poultry Farm (Layer)', '10000-19999 heads', 10000, 19999, 'heads', 2000.00, FALSE, 7),
    (7, 'Poultry Farm (Layer)', '20000 heads or more', 20000, NULL, 'heads', 3000.00, FALSE, 8);

-- Back to fixed entries
INSERT INTO public.fee_schedule_items (category_id, business_type, amount, activity_match, sort_order) VALUES
    (8, 'Accounting / Business Management', 500.00, 'Accounting', 1),
    (8, 'Advertising Agency', 500.00, 'Advertising', 2),
    (8, 'Agricultural Consultant', 500.00, 'Agricultural Consultant', 3),
    (8, 'Air Conditioning Repair', 400.00, 'Air Conditioning Repair', 4),
    (8, 'Architecture / Engineering', 500.00, 'Architecture', 5),
    (8, 'Auto Repair Shop', 500.00, 'Auto Repair', 6),
    (8, 'Barber Shop', 400.00, 'Barber Shop', 7),
    (8, 'Battery Charging Shop', 300.00, 'Battery Charging', 8),
    (8, 'Beauty Parlor', 400.00, 'Beauty Parlor', 9),
    (8, 'Bicycle Repair Shop', 200.00, 'Bicycle Repair', 10),
    (8, 'Booking Office', 500.00, 'Booking Office', 11),
    (8, 'Cable TV Provider', 1000.00, 'Cable TV', 12),
    (8, 'Car Wash', 400.00, 'Car Wash', 13),
    (8, 'Catering Service', 500.00, 'Catering', 14),
    (8, 'Clinic (Medical / Dental)', 500.00, 'Clinic', 15),
    (8, 'Cold Storage', 800.00, 'Cold Storage', 16),
    (8, 'Computer Repair Shop', 400.00, 'Computer Repair', 17),
    (8, 'Computer Shop / Internet Cafe', 500.00, 'Internet Cafe', 18),
    (8, 'Consultancy Service', 500.00, 'Consultancy', 19),
    (8, 'Courier Service', 800.00, 'Courier', 20),
    (8, 'Customs Broker', 500.00, 'Customs Broker', 21),
    (8, 'Dressmaking / Tailoring Shop', 300.00, 'Tailoring', 22),
    (8, 'Driving School', 500.00, 'Driving School', 23),
    (8, 'Electrical Repair Shop', 400.00, 'Electrical Repair', 24),
    (8, 'Employment Agency', 500.00, 'Employment Agency', 25),
    (8, 'Event Planner', 500.00, 'Event Planner', 26),
    (8, 'Forwarding Agency', 800.00, 'Forwarding', 27),
    (8, 'Funeral Parlor', 1000.00, 'Funeral Parlor', 28),
    (8, 'Hospital', 3000.00, 'Hospital', 29),
    (8, 'Hotel / Motel', 2000.00, 'Hotel', 30),
    (8, 'Insurance Agency', 800.00, 'Insurance', 31),
    (8, 'Janitorial Service', 500.00, 'Janitorial', 32),
    (8, 'Landscaping Service', 400.00, 'Landscaping', 33),
    (8, 'Laundry / Dry Cleaning', 400.00, 'Laundry', 34),
    (8, 'Law Office', 500.00, 'Law Office', 35),
    (8, 'Machine Shop', 600.00, 'Machine Shop', 36),
    (8, 'Massage Clinic', 500.00, 'Massage Clinic', 37),
    (8, 'Painting Service', 300.00, 'Painting', 38),
    (8, 'Pest Control Service', 500.00, 'Pest Control', 39),
    (8, 'Photo Studio', 400.00, 'Photo Studio', 40),
    (8, 'Plumbing Service', 300.00, 'Plumbing', 41),
    (8, 'Printing Press', 600.00, 'Printing', 42),
    (8, 'Private Detective Agency', 500.00, 'Detective Agency', 43),
    (8, 'Private School', 1500.00, 'School', 44),
    (8, 'Real Estate Agency', 800.00, 'Real Estate', 45),
    (8, 'Recruitment Agency', 800.00, 'Recruitment', 46),
    (8, 'Rent-A-Car Service', 800.00, 'Rent-A-Car', 47),
    (8, 'Repair Shop (General)', 400.00, 'Repair Shop', 48),
    (8, 'Resort', 1500.00, 'Resort', 49),
    (8, 'Restaurant / Eatery', 600.00, 'Restaurant', 50),
    (8, 'Security Agency', 800.00, 'Security Agency', 51),
    (8, 'Shoe Repair Shop', 200.00, 'Shoe Repair', 52),
    (8, 'Sign Shop', 300.00, 'Sign Shop', 53),
    (8, 'Spa', 600.00, 'Spa', 54),
    (8, 'Surveying Office', 500.00, 'Surveying', 55),
    (8, 'Tour Agency', 600.00, 'Tour Agency', 56),
    (8, 'Towing Service', 500.00, 'Towing', 57),
    (8, 'Travel Agency', 600.00, 'Travel Agency', 58),
    (8, 'Trucking Service', 800.00, 'Trucking', 59),
    (8, 'Upholstery Shop', 300.00, 'Upholstery', 60),
    (8, 'Veterinary Clinic', 500.00, 'Veterinary Clinic', 61),
    (8, 'Video Rental / Sales', 300.00, 'Video Rental', 62),
    (8, 'Vulcanizing Shop', 200.00, 'Vulcanizing', 63),
    (8, 'Watch Repair Shop', 200.00, 'Watch Repair', 64),
    (8, 'Welding Shop', 400.00, 'Welding', 65),

    (9, 'Tobacco Wholesale Dealer', 1000.00, 'Tobacco Wholesale', 1),
    (9, 'Tobacco Retail Dealer', 500.00, 'Tobacco Retail', 2),
    (9, 'Tobacco Leaf Dealer', 800.00, 'Tobacco Leaf', 3),

    (10, 'Liquor Wholesale Dealer', 1500.00, 'Liquor Wholesale', 1),
    (10, 'Liquor Retail Dealer', 800.00, 'Liquor Retail', 2),
    (10, 'Wine Wholesale Dealer', 1200.00, 'Wine Wholesale', 3),
    (10, 'Wine Retail Dealer', 600.00, 'Wine Retail', 4),
    (10, 'Beer Wholesale Dealer', 1000.00, 'Beer Wholesale', 5),
    (10, 'Beer Retail Dealer', 500.00, 'Beer Retail', 6),
    (10, 'Tuba / Native Liquor Retailer', 200.00, 'Native Liquor', 7),

    (11, 'Amusement Park', 3000.00, 'Amusement Park', 1),
    (11, 'Billiard Hall', 500.00, 'Billiard Hall', 2),
    (11, 'Bowling Alley', 1000.00, 'Bowling Alley', 3),
    (11, 'Boxing Arena', 1500.00, 'Boxing Arena', 4),
    (11, 'Carnival / Fair', 2000.00, 'Carnival', 5),
    (11, 'Casino', 5000.00, 'Casino', 6),
    (11, 'Cinema / Movie House', 2000.00, 'Cinema', 7),
    (11, 'Cockpit', 3000.00, 'Cockpit', 8),
    (11, 'Computer Game Arcade', 800.00, 'Game Arcade', 9),
    (11, 'Dance Hall / Disco', 1500.00, 'Disco', 10),
    (11, 'Golf Course', 3000.00, 'Golf Course', 11),
    (11, 'Gymnasium', 800.00, 'Gymnasium', 12),
    (11, 'Karaoke Bar', 1000.00, 'Karaoke Bar', 13),
    (11, 'Night Club', 2000.00, 'Night Club', 14),
    (11, 'Skating Rink', 800.00, 'Skating Rink', 15),
    (11, 'Sports Complex', 2000.00, 'Sports Complex', 16),
    (11, 'Swimming Pool (Commercial)', 1000.00, 'Swimming Pool', 17),
    (11, 'Tennis Court (Commercial)', 500.00, 'Tennis Court', 18),
    (11, 'Theater (Live)', 1500.00, 'Theater', 19),
    (11, 'Video Arcade', 800.00, 'Video Arcade', 20),

    (12, 'Commercial Bank', 5000.00, 'Commercial Bank', 1),
    (12, 'Credit Cooperative', 1000.00, 'Credit Cooperative', 2),
    (12, 'Finance Company', 2000.00, 'Finance Company', 3),
    (12, 'Foreign Exchange Dealer', 1500.00, 'Foreign Exchange', 4),
    (12, 'Insurance Company', 3000.00, 'Insurance Company', 5),
    (12, 'Lending Investor', 1500.00, 'Lending', 6),
    (12, 'Microfinance Institution', 1000.00, 'Microfinance', 7),
    (12, 'Money Remittance Center', 1000.00, 'Money Remittance', 8),
    (12, 'Pawnshop', 2000.00, 'Pawnshop', 9),
    (12, 'Rural Bank', 2000.00, 'Rural Bank', 10),
    (12, 'Savings Bank', 3000.00, 'Savings Bank', 11),
    (12, 'Stock Brokerage', 3000.00, 'Stock Brokerage', 12),

    (13, 'Agri-Business (General)', 800.00, 'Agri-Business', 1),
    (13, 'Apartment / Boarding House', 500.00, 'Apartment', 2),
    (13, 'Bakery (Small)', 300.00, 'Small Bakery', 3),
    (13, 'Carinderia', 200.00, 'Carinderia', 4),
    (13, 'Cemetery / Memorial Park', 2000.00, 'Cemetery', 5),
    (13, 'Cocktail Lounge', 1000.00, 'Cocktail Lounge', 6),
    (13, 'Communication Tower / Cell Site', 3000.00, 'Cell Site', 7),
    (13, 'Contractor (General)', 1500.00, 'Contractor', 8),
    (13, 'Gasoline Station', 2000.00, 'Gasoline Station', 9),
    (13, 'LPG Dealer', 800.00, 'LPG Dealer', 10),
    (13, 'Lumber Yard', 1000.00, 'Lumber Yard', 11),
    (13, 'Market Stall', 300.00, 'Market Stall', 12),
    (13, 'Parking Lot (Commercial)', 500.00, 'Parking Lot', 13),
    (13, 'Real Estate Developer', 5000.00, 'Real Estate Developer', 14),
    (13, 'Rice / Corn Mill', 1000.00, 'Rice Mill', 15),
    (13, 'Slaughterhouse (Private)', 1500.00, 'Slaughterhouse', 16),
    (13, 'Subdivision Operator', 3000.00, 'Subdivision', 17),
    (13, 'Warehouse', 1500.00, 'Warehouse', 18),
    (13, 'Water Refilling Station', 500.00, 'Water Refilling', 19),
    (13, 'Other Unclassified Business', 500.00, 'Unclassified', 20);
