import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const configurado = !!(process.env.WHATSAPP_TOKEN && process.env.WHATSAPP_PHONE_ID);
  return NextResponse.json({ configurado });
}
