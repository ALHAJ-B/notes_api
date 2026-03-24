import { randomUUID } from 'node:crypto';

export function requestContext(req, res, next) {
  const incomingId = req.get('x-request-id');
  const requestId = incomingId && incomingId.trim() ? incomingId.trim() : randomUUID();

  req.requestId = requestId;
  res.set('x-request-id', requestId);
  next();
}
