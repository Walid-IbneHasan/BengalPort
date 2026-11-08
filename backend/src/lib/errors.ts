// What a client is told when a request fails. Anything the code did not raise
// on purpose is reported as a plain server error: the details go to the log,
// never to the visitor.
export type PublicError = { status: number; code: string; message: string };

const SERVER_ERROR: PublicError = { status: 500, code: "SERVER_ERROR", message: "Unexpected server error" };

export function publicError(error: any): PublicError {
  if (typeof error?.code === "string" && /^P\d{4}$/.test(error.code)) {
    if (error.code === "P2025") return { status: 404, code: "NOT_FOUND", message: "That record no longer exists" };
    if (error.code === "P2002") return { status: 409, code: "ALREADY_EXISTS", message: "That value is already in use" };
    if (error.code === "P2003") return { status: 409, code: "IN_USE", message: "Other records still depend on this one" };
    if (error.code === "P2000" || error.code === "P2020") return { status: 400, code: "BAD_REQUEST", message: "A value in this request is too large" };
    return SERVER_ERROR;
  }
  if (error?.name === "PrismaClientValidationError") return { status: 400, code: "BAD_REQUEST", message: "Part of this request is not valid" };
  if (/^(Multipart: |Boundary not found|Malformed part|Unexpected end of )/i.test(String(error?.message))) return { status: 400, code: "BAD_REQUEST", message: "This upload could not be read" };
  const status = Number(error?.statusCode);
  if (!status || status === 500) return SERVER_ERROR;
  return { status, code: typeof error.code === "string" ? error.code : "REQUEST_ERROR", message: error.message };
}

// How a request appears in the log. Receipt keys, backup keys and payment
// references travel in the query, so it is left out.
export const requestForLog = (req: { method: string; url: string; ip?: string }) => ({
  method: req.method,
  url: req.url.split("?")[0],
  remoteAddress: req.ip,
});

// PostgreSQL cannot store a NUL character and fails the whole query on one.
export function hasNul(value: unknown, depth = 0): boolean {
  if (typeof value === "string") return value.includes("\u0000");
  if (!value || typeof value !== "object" || depth > 12) return false;
  return Object.entries(value).some(([key, item]) => key.includes("\u0000") || hasNul(item, depth + 1));
}
