import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/automations/admin-client";
import {
  generateBaileysQr,
  disconnectBaileysSession,
  getBaileysSessionState,
} from "@/lib/whatsapp/baileys-service";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 1. Check active in-memory session state first for immediate live updates
    const memSession = getBaileysSessionState(user.id);
    if (memSession) {
      return NextResponse.json({
        status: memSession.status,
        qrCode: memSession.qrCode,
        phoneNumber: memSession.phoneNumber ?? null,
        userName: memSession.userName ?? null,
        connectedAt: memSession.connectedAt ?? null,
      });
    }

    // 2. Fallback to Supabase database table if present
    try {
      const adminDb = supabaseAdmin();
      const { data: sessions } = await adminDb
        .from("baileys_sessions")
        .select("*")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1);

      const session = sessions?.[0] ?? null;

      if (session) {
        return NextResponse.json({
          status: session.status,
          qrCode: session.qr_code,
          phoneNumber: session.phone_number,
          userName: session.user_name,
          connectedAt: session.connected_at,
        });
      }
    } catch {
      // Fallback gracefully if database table is missing
    }

    return NextResponse.json({
      status: "disconnected",
      qrCode: null,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("account_id")
      .eq("user_id", user.id)
      .maybeSingle();

    const accountId = profile?.account_id ?? null;
    const body = await request.json().catch(() => ({}));
    const action = body.action || "connect";

    if (action === "disconnect") {
      await disconnectBaileysSession(user.id);
      return NextResponse.json({ status: "disconnected" });
    }

    // Generate authentic Baileys WhatsApp Noise Protocol QR Data URL
    const qrDataUrl = await generateBaileysQr(user.id, accountId);

    return NextResponse.json({
      status: "qr_ready",
      qrCode: qrDataUrl,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}
