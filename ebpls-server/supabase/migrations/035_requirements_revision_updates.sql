-- Phase 1 - Updates based on revised requirements plan

-- 1. Remove incorrect Valid Government ID mappings (only applies to Sole Proprietorship)
DELETE FROM requirement_conditions 
WHERE requirement_id = (SELECT id FROM requirement_types WHERE name = 'Valid Government ID')
AND match_value IN ('Corporation', 'Partnership', 'Cooperative');

-- 2. Add missing SEC Registration mappings
INSERT INTO requirement_conditions (requirement_id, match_value) VALUES 
((SELECT id FROM requirement_types WHERE name = 'SEC Registration'), 'Non-Governmental Organization'),
((SELECT id FROM requirement_types WHERE name = 'SEC Registration'), 'Government-Owned or Controlled Corporation')
ON CONFLICT (requirement_id, match_value) DO NOTHING;
