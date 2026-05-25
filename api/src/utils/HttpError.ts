export class HttpError extends Error {
  status: number;
  details?: unknown;

  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }

  static badRequest(msg = 'Solicitud inválida', details?: unknown) {
    return new HttpError(400, msg, details);
  }
  static unauthorized(msg = 'No autenticado') {
    return new HttpError(401, msg);
  }
  static forbidden(msg = 'Acción no permitida') {
    return new HttpError(403, msg);
  }
  static notFound(msg = 'Recurso no encontrado') {
    return new HttpError(404, msg);
  }
  static conflict(msg = 'Conflicto') {
    return new HttpError(409, msg);
  }
  static payment(msg = 'Se requiere un plan superior para esta acción') {
    return new HttpError(402, msg);
  }
}
