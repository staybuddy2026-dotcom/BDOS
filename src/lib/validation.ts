import { z } from 'zod';
import { ValidationError } from './errors';

export function validateSchema<T>(schema: z.Schema<T>, data: unknown): T {
  const result = schema.safeParse(data);
  if (!result.success) {
    const fieldErrors: Record<string, string[]> = {};
    result.error.issues.forEach((err) => {
      const path = err.path.join('.');
      if (!fieldErrors[path]) {
        fieldErrors[path] = [];
      }
      fieldErrors[path].push(err.message);
    });

    throw new ValidationError('Validation failed', fieldErrors);
  }
  return result.data;
}

// Global schema patterns
export const uuidSchema = z.string().uuid();
export const pageQuerySchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().default(10),
  search: z.string().optional(),
});
export type PageQuery = z.infer<typeof pageQuerySchema>;
