import { z } from 'zod';

const base64Regex = /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/;

const usernameSchema = z
  .string()
  .trim()
  .min(3, 'username must be at least 3 characters')
  .max(64, 'username must be at most 64 characters')
  .regex(/^[A-Za-z0-9_.@-]+$/, 'username contains invalid characters');

const passwordSchema = z
  .string()
  .min(8, 'password must be at least 8 characters')
  .max(128, 'password must be at most 128 characters');

const base64Field = (name, maxLen) =>
  z
    .string()
    .trim()
    .min(8, `${name} is too short`)
    .max(maxLen, `${name} is too long`)
    .regex(base64Regex, `${name} must be base64`);

export const registerSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
  encryptionSalt: base64Field('encryptionSalt', 512),
});

export const loginSchema = z.object({
  username: usernameSchema,
  password: passwordSchema,
});

export const notePayloadSchema = z.object({
  content: base64Field('content', 32768),
  iv: base64Field('iv', 128),
});

export const noteIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

const toFieldErrors = (issues) =>
  issues.map((issue) => ({
    field: issue.path.join('.') || 'body',
    message: issue.message,
  }));

export function validateBody(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid request body',
        details: toFieldErrors(result.error.issues),
      });
    }

    req.validatedBody = result.data;
    return next();
  };
}

export function validateParams(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.params ?? {});
    if (!result.success) {
      return res.status(400).json({
        error: 'Invalid route parameters',
        details: toFieldErrors(result.error.issues),
      });
    }

    req.validatedParams = result.data;
    return next();
  };
}
