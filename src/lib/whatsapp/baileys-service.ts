import makeWASocket, {
  DisconnectReason,
  useMultiFileAuthState,
  Browsers,
  type WASocket,
} from "@whiskeysockets/baileys";
import QRCode from "qrcode";
import pino from "pino";
import path from "path";
import fs from "fs";
import { supabaseAdmin } from "@/lib/automations/admin-client";

export interface BaileysSessionState {
  userId: string;
  accountId: string | null;
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCode: string | null;
  phoneNumber?: string | null;
  userName?: string | null;
  connectedAt?: string | null;
  updatedAt: string;
}

declare global {
  /* eslint-disable no-var */
  var __baileysActiveSockets: Map<string, WASocket> | undefined;
  var __baileysReconnectTimers: Map<string, NodeJS.Timeout> | undefined;
  var __baileysSessionsStore: Map<string, BaileysSessionState> | undefined;
}

// Global persistent caches for Next.js dev server hot-reloading
const activeSockets = globalThis.__baileysActiveSockets ?? new Map<string, WASocket>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__baileysActiveSockets = activeSockets;
}

const reconnectTimers = globalThis.__baileysReconnectTimers ?? new Map<string, NodeJS.Timeout>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__baileysReconnectTimers = reconnectTimers;
}

const sessionsStore = globalThis.__baileysSessionsStore ?? new Map<string, BaileysSessionState>();
if (process.env.NODE_ENV !== "production") {
  globalThis.__baileysSessionsStore = sessionsStore;
}

export function getBaileysSessionState(userId: string): BaileysSessionState | undefined {
  return sessionsStore.get(userId);
}

export async function initBaileysSocket(
  userId: string,
  accountId: string | null,
  onQrEmitted?: (qrDataUrl: string) => void
): Promise<WASocket> {
  const sessionId = userId;

  // Clear any existing reconnect timer for this user
  const timer = reconnectTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(sessionId);
  }

  const supabase = supabaseAdmin();
  const sessionsDir = path.join(process.cwd(), ".baileys_auth", sessionId);

  if (!fs.existsSync(sessionsDir)) {
    fs.mkdirSync(sessionsDir, { recursive: true });
  }

  const { state, saveCreds } = await useMultiFileAuthState(sessionsDir);
  const logger = pino({ level: "silent" });

  const sock = makeWASocket({
    logger,
    printQRInTerminal: false,
    auth: state,
    browser: Browsers.ubuntu("Chrome"),
    syncFullHistory: false,
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
  });

  activeSockets.set(sessionId, sock);

  sock.ev.on("creds.update", saveCreds);

  sock.ev.on("connection.update", async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      try {
        const qrDataUrl = await QRCode.toDataURL(qr, {
          margin: 2,
          scale: 8,
          color: {
            dark: "#047857",
            light: "#FFFFFF",
          },
        });

        const newState: BaileysSessionState = {
          userId,
          accountId,
          status: "qr_ready",
          qrCode: qrDataUrl,
          updatedAt: new Date().toISOString(),
        };
        sessionsStore.set(userId, newState);

        try {
          await supabase.from("baileys_sessions").upsert(
            {
              user_id: userId,
              account_id: accountId,
              session_id: "default",
              status: "qr_ready",
              qr_code: qrDataUrl,
              updated_at: newState.updatedAt,
            },
            { onConflict: "user_id" }
          );
        } catch {
          // Fallback gracefully if database table is missing
        }

        if (onQrEmitted) {
          onQrEmitted(qrDataUrl);
        }
      } catch (err) {
        console.error("Error generating QR data URL:", err);
      }
    }

    if (connection === "connecting") {
      const existing = sessionsStore.get(userId);
      const newState: BaileysSessionState = {
        userId,
        accountId,
        status: "connecting",
        qrCode: existing?.qrCode || null,
        updatedAt: new Date().toISOString(),
      };
      sessionsStore.set(userId, newState);

      try {
        await supabase
          .from("baileys_sessions")
          .update({
            status: "connecting",
            updated_at: newState.updatedAt,
          })
          .eq("user_id", userId);
      } catch {
        // Fallback gracefully
      }
    }

    if (connection === "open") {
      const userJid = sock.user?.id || "";
      const rawPhone = userJid.split(":")[0]?.split("@")[0] || "";
      const userName = sock.user?.name || sock.user?.notify || "WhatsApp User";

      const newState: BaileysSessionState = {
        userId,
        accountId,
        status: "connected",
        qrCode: null,
        phoneNumber: rawPhone,
        userName: userName,
        connectedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      sessionsStore.set(userId, newState);

      try {
        await supabase.from("baileys_sessions").upsert(
          {
            user_id: userId,
            account_id: accountId,
            session_id: "default",
            status: "connected",
            qr_code: null,
            phone_number: rawPhone,
            user_name: userName,
            connected_at: newState.connectedAt,
            updated_at: newState.updatedAt,
          },
          { onConflict: "user_id" }
        );
      } catch {
        // Fallback gracefully
      }
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as { output?: { statusCode?: number } })?.output?.statusCode;
      const isLoggedOut = statusCode === DisconnectReason.loggedOut;

      activeSockets.delete(sessionId);

      if (isLoggedOut) {
        sessionsStore.set(userId, {
          userId,
          accountId,
          status: "disconnected",
          qrCode: null,
          updatedAt: new Date().toISOString(),
        });

        if (fs.existsSync(sessionsDir)) {
          fs.rmSync(sessionsDir, { recursive: true, force: true });
        }

        try {
          await supabase
            .from("baileys_sessions")
            .update({
              status: "disconnected",
              qr_code: null,
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } catch {
          // Fallback gracefully
        }
      } else {
        const existing = sessionsStore.get(userId);
        sessionsStore.set(userId, {
          userId,
          accountId,
          status: "connecting",
          qrCode: existing?.qrCode || null,
          updatedAt: new Date().toISOString(),
        });

        try {
          await supabase
            .from("baileys_sessions")
            .update({
              status: "connecting",
              updated_at: new Date().toISOString(),
            })
            .eq("user_id", userId);
        } catch {
          // Fallback gracefully
        }

        const reconnectTimer = setTimeout(() => {
          reconnectTimers.delete(sessionId);
          initBaileysSocket(userId, accountId).catch((err) => {
            console.error("Failed to auto-reconnect Baileys socket:", err);
          });
        }, 1500);

        reconnectTimers.set(sessionId, reconnectTimer);
      }
    }
  });

  return sock;
}

export async function generateBaileysQr(userId: string, accountId: string | null): Promise<string> {
  const sessionId = userId;

  // Clear any existing reconnect timer for this user
  const timer = reconnectTimers.get(sessionId);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(sessionId);
  }

  // Clean up existing socket without triggering old close events
  const existingSock = activeSockets.get(sessionId);
  if (existingSock) {
    try {
      existingSock.ev.removeAllListeners("connection.update");
      existingSock.ev.removeAllListeners("creds.update");
      existingSock.end(undefined);
    } catch {
      // Ignore socket end errors
    }
    activeSockets.delete(sessionId);
  }

  // Clear stale auth directory so Baileys starts a clean fresh pairing session
  const sessionsDir = path.join(process.cwd(), ".baileys_auth", sessionId);
  if (fs.existsSync(sessionsDir)) {
    fs.rmSync(sessionsDir, { recursive: true, force: true });
  }

  return new Promise<string>((resolve, reject) => {
    let resolved = false;

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        reject(new Error("Timeout waiting for WhatsApp Web QR code protocol emission."));
      }
    }, 20000);

    initBaileysSocket(userId, accountId, (qrDataUrl) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        resolve(qrDataUrl);
      }
    }).catch((err) => {
      if (!resolved) {
        resolved = true;
        clearTimeout(timeout);
        reject(err);
      }
    });
  });
}

export function getActiveBaileysSocket(userId: string): WASocket | undefined {
  return activeSockets.get(userId);
}

export async function disconnectBaileysSession(userId: string) {
  const timer = reconnectTimers.get(userId);
  if (timer) {
    clearTimeout(timer);
    reconnectTimers.delete(userId);
  }

  sessionsStore.set(userId, {
    userId,
    accountId: null,
    status: "disconnected",
    qrCode: null,
    updatedAt: new Date().toISOString(),
  });

  const sock = activeSockets.get(userId);
  if (sock) {
    try {
      sock.ev.removeAllListeners("connection.update");
      sock.ev.removeAllListeners("creds.update");
      sock.logout();
      sock.end(new Error("User disconnected"));
    } catch {
      // Ignore socket end errors
    }
    activeSockets.delete(userId);
  }

  const sessionsDir = path.join(process.cwd(), ".baileys_auth", userId);
  if (fs.existsSync(sessionsDir)) {
    fs.rmSync(sessionsDir, { recursive: true, force: true });
  }

  try {
    const supabase = supabaseAdmin();
    await supabase.from("baileys_sessions").delete().eq("user_id", userId);
  } catch {
    // Fallback gracefully
  }
}
