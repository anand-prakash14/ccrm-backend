// 2. Third-party
import { NextFunction, Request, Response } from 'express';
import { z, ZodTypeAny } from 'zod';

export function validateBody<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.body = schema.parse(req.body) as z.infer<T>;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.query = schema.parse(req.query) as z.infer<T>;
      next();
    } catch (err) {
      next(err);
    }
  };
}

export function validateParams<T extends ZodTypeAny>(schema: T) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    try {
      req.params = schema.parse(req.params) as z.infer<T>;
      next();
    } catch (err) {
      next(err);
    }
  };
}
