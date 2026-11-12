// A request the API refused, with its own message, code and field details.
export class ApiError extends Error {
  constructor(message: string, public code?: string, public details?: any, public status?: number) { super(message); }
}
