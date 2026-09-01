import { ZodError, type ZodType } from 'zod';
import type { FastifyInstance, FastifyPluginAsync, FastifySchema } from 'fastify';
import fp from 'fastify-plugin';

export const HTTP = {
  OK: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

export class HttpError extends Error {
  readonly statusCode: number;
  readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Recurs no trobat') {
    super(HTTP.NOT_FOUND, message);
  }
}

export class ValidationError extends HttpError {
  constructor(message: string, details?: unknown) {
    super(HTTP.BAD_REQUEST, message, details);
  }
}

const errorHandlerPlugin: FastifyPluginAsync = async (fastify: FastifyInstance) => {
  fastify.setErrorHandler((error, request, reply) => {
    if (error instanceof ZodError) {
      return reply.status(HTTP.BAD_REQUEST).send({
        error: 'ValidationError',
        message: "Dades d'entrada invàlides",
        details: error.issues,
      });
    }

    if (error instanceof HttpError) {
      return reply.status(error.statusCode).send({
        error: error.constructor.name,
        message: error.message,
        details: error.details,
      });
    }

    if ((error as { validation?: unknown }).validation) {
      const validationError = error as Error & { validation: unknown; message: string };
      return reply.status(HTTP.BAD_REQUEST).send({
        error: 'ValidationError',
        message: validationError.message,
        details: validationError.validation,
      });
    }

    request.log.error({ err: error }, 'Error no controlat');
    return reply.status(HTTP.INTERNAL_SERVER_ERROR).send({
      error: 'InternalServerError',
      message: 'Error intern del servidor',
    });
  });

  fastify.setNotFoundHandler((request, reply) => {
    reply.status(HTTP.NOT_FOUND).send({
      error: 'NotFound',
      message: `Ruta no trobada: ${request.method} ${request.url}`,
    });
  });
};

export default fp(errorHandlerPlugin, { name: 'error-handler' });

export function jsonBody<T extends ZodType>(schema: T): FastifySchema {
  return {
    body: schema,
  };
}
