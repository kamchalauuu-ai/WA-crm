import { describe, it, expect, vi, beforeEach } from "vitest";
import { getActiveBaileysSocket, disconnectBaileysSession } from "./baileys-service";

vi.mock("@whiskeysockets/baileys", async () => {
  return {
    default: vi.fn(() => ({
      ev: {
        on: vi.fn(),
        removeAllListeners: vi.fn(),
      },
      user: { id: "1234567890:1@s.whatsapp.net", name: "Test User" },
      end: vi.fn(),
      logout: vi.fn(),
    })),
    DisconnectReason: {
      loggedOut: 401,
      restartRequired: 515,
    },
    Browsers: {
      ubuntu: vi.fn(() => ["Ubuntu", "Chrome", "22.04.4"]),
      macOS: vi.fn(() => ["Mac OS", "Chrome", "14.4.1"]),
    },
    useMultiFileAuthState: vi.fn().mockResolvedValue({
      state: {},
      saveCreds: vi.fn(),
    }),
  };
});

vi.mock("qrcode", () => ({
  default: {
    toDataURL: vi.fn().mockResolvedValue("data:image/png;base64,mockqr"),
  },
}));

vi.mock("pino", () => ({
  default: vi.fn(() => ({})),
}));

vi.mock("@/lib/automations/admin-client", () => ({
  supabaseAdmin: vi.fn(() => ({
    from: vi.fn(() => ({
      upsert: vi.fn().mockResolvedValue({ error: null }),
      update: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      delete: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({ error: null }),
      })),
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          order: vi.fn(() => ({
            limit: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        })),
      })),
    })),
  })),
}));

describe("baileys-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns undefined for inactive socket", () => {
    const socket = getActiveBaileysSocket("non-existent-user");
    expect(socket).toBeUndefined();
  });

  it("handles disconnectBaileysSession without errors", async () => {
    await expect(disconnectBaileysSession("test-user-id")).resolves.not.toThrow();
  });
});
