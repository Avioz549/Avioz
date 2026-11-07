import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json(
    {
      application: "SAVIO",
      version: "4.0.0",
      build: process.env.NEXT_PUBLIC_SAVIO_BUILD ?? "local",
      status: "ok",
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
