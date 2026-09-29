import { NextResponse } from "next/server";

export function jsonError(status: number, code: string, message: string, extra?: Record<string, unknown>) {
  return NextResponse.json({ error: { code, message, ...extra } }, { status });
}

export const unauthorized = () => jsonError(401, "UNAUTHORIZED", "Please sign in again to continue.");
