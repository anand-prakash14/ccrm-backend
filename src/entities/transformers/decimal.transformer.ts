// 2. Third-party
import { ValueTransformer } from 'typeorm';

/**
 * TypeORM returns `numeric`/`decimal` columns as strings by default (to avoid
 * silent float precision loss at the driver level). This transformer converts
 * to/from `number` at the entity boundary so callers get a JS number while the
 * column itself stays DECIMAL(19,4) in Postgres, never FLOAT.
 */
export const decimalTransformer: ValueTransformer = {
  to: (value?: number | null): number | null | undefined => value,
  from: (value?: string | null): number | null =>
    value === null || value === undefined ? null : Number(value),
};
