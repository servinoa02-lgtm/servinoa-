import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const token = process.env.WHATSAPP_TOKEN;
  const phoneId = process.env.WHATSAPP_PHONE_ID;

  if (!token || !phoneId) {
    return NextResponse.json({
      ok: false,
      error: "Variables no configuradas",
      token: token ? "presente" : "FALTA",
      phoneId: phoneId ? "presente" : "FALTA",
    });
  }

  try {
    const res = await fetch(`https://graph.facebook.com/v19.0/${phoneId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: "543872239277",
        type: "text",
        text: { body: "🔔 ServiNOA — Test desde producción" },
      }),
    });

    const data = await res.json();
    return NextResponse.json({ ok: res.ok, status: res.status, data });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message });
  }
}
