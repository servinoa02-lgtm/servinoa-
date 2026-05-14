import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/requireAuth";

export async function GET() {
  const session = await requireAuth();
  if (session instanceof NextResponse) return session;

  const configurado = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  return NextResponse.json({ configurado });
}
