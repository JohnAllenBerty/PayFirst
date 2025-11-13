import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Minimal helper types for error narrowing
type FailLike = { status: false; message?: string; error?: unknown };
// Success response shape
type SuccessLike = { status: true; message?: string; data?: unknown };
// RTK Query SerializedError
type SerializedErrLike = { message?: string; name?: string; stack?: string };
// FetchBaseQueryError
type FBQErrorLike = { status?: number | string; data?: unknown; error?: string };

function isFailLike(v: unknown): v is FailLike {
  return !!v && typeof v === "object" && "status" in v && (v as Record<string, unknown>).status === false;
}
function isSuccessLike(v: unknown): v is SuccessLike {
  return !!v && typeof v === "object" && "status" in v && (v as Record<string, unknown>).status === true;
}
function isSerializedErrLike(v: unknown): v is SerializedErrLike {
  return !!v && typeof v === "object" && "message" in v;
}
function isFBQErrorLike(v: unknown): v is FBQErrorLike {
  return !!v && typeof v === "object" && ("data" in v || "error" in v || "status" in v);
}

// Extract a human-friendly error message from various error shapes
export function extractErrorMessage(err: unknown): string {
  if (!err) return "Something went wrong";

  if (isFailLike(err)) {
    if (err.message && typeof err.message === "string") return err.message;
    if (typeof err.error !== "undefined") return extractErrorMessage(err.error);
  }

  if (isSerializedErrLike(err) && err.message) return err.message;

  if (isFBQErrorLike(err)) {
    const d = err.data;
    if (typeof d === "string") return d;
    if (d && typeof d === "object") {
      const obj = d as Record<string, unknown>;
      // Prefer nested error arrays like non_field_errors
      const nestedError = ((): string | undefined => {
        const e = obj.error as unknown;
        if (e && typeof e === 'object') {
          const eo = e as Record<string, unknown>;
          if (Array.isArray(eo.non_field_errors) && eo.non_field_errors.length && typeof eo.non_field_errors[0] === 'string') {
            return eo.non_field_errors[0] as string;
          }
          // Look for any array-of-strings inside error
          for (const [k, v] of Object.entries(eo)) {
            if (Array.isArray(v) && v.length && typeof v[0] === 'string') return `${k}: ${v[0]}`;
            if (typeof v === 'string') return `${k}: ${v}`;
          }
        }
        return undefined;
      })();
      if (nestedError) return nestedError;

      // Top-level non_field_errors
      if (Array.isArray(obj.non_field_errors) && obj.non_field_errors.length && typeof obj.non_field_errors[0] === 'string') {
        return obj.non_field_errors[0] as string;
      }
      if ("detail" in obj && typeof obj.detail === "string") return obj.detail;
      if ("message" in obj && typeof obj.message === "string" && obj.message !== 'fail') return obj.message;
      if ("error" in obj && typeof obj.error === "string") return obj.error;
      for (const [key, value] of Object.entries(obj)) {
        if (Array.isArray(value) && value.length && typeof value[0] === "string") return `${key}: ${value[0]}`;
        if (typeof value === "string") return `${key}: ${value}`;
      }
    }
    if (err.error && typeof err.error === "string") return err.error;
  }

  if (typeof err === "string") return err;
  try {
    return JSON.stringify(err);
  } catch {
    /* noop */
  }
  return "Something went wrong";
}

// Extract success message from ApiSuccess or similar; fallback provided
export function extractSuccessMessage(data: unknown, fallback: string): string {
  if (isSuccessLike(data) && typeof data.message === "string" && data.message) return data.message;
  // Some APIs return { message } directly
  if (data && typeof data === "object" && "message" in (data as Record<string, unknown>)) {
    const msg = (data as Record<string, unknown>).message;
    if (typeof msg === "string" && msg) return msg;
  }
  return fallback;
}
