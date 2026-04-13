import { NextResponse } from "next/server";
import { ZodError } from "zod";
import {
  API_ERROR_CODES,
  apiError,
  type ApiErrorCode,
} from "@boundaryline/shared";

export function errorResponse(
  code: ApiErrorCode,
  message: string,
  status: number,
): NextResponse {
  return NextResponse.json(apiError(code, message), { status });
}

export function unauthorized(message = "Not authenticated"): NextResponse {
  return errorResponse(API_ERROR_CODES.UNAUTHORIZED, message, 401);
}

export function badRequest(code: ApiErrorCode, message: string): NextResponse {
  return errorResponse(code, message, 400);
}

export function zodToResponse(err: ZodError): NextResponse {
  const message = err.issues
    .map((i) => `${i.path.join(".") || "body"}: ${i.message}`)
    .join("; ");
  return errorResponse(API_ERROR_CODES.VALIDATION_ERROR, message, 400);
}

export function internalError(message = "Internal error"): NextResponse {
  return errorResponse(API_ERROR_CODES.INTERNAL_ERROR, message, 500);
}
