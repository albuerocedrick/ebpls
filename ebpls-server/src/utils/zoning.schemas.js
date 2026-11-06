const { z } = require('zod');

const locationZoneSchema = z.object({
  name: z.string().trim().min(1).max(100),
  foot_traffic_level: z.enum(['High', 'Medium', 'Low']),
  min_capital_floor: z.number().finite().min(0).max(9999999999.99),
  fee_multiplier: z.number().finite().min(0.0001).max(999.9999),
  is_active: z.boolean().default(true),
}).strict();

const barangaySchema = z.object({
  name: z.string().trim().min(1).max(100),
  zone_id: z.number().int().positive(),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  is_active: z.boolean().default(true),
}).strict();

function parseZoningMasterData(table, body, partial = false) {
  const schema = { location_zones: locationZoneSchema, barangays: barangaySchema }[table];
  if (!schema) return body;
  if (!partial) return schema.parse(body);
  // Do not let create defaults reactivate a record during an unrelated update.
  const parsed = schema.partial().parse(body);
  if (body.is_active === undefined) delete parsed.is_active;
  return parsed;
}

module.exports = { parseZoningMasterData };
