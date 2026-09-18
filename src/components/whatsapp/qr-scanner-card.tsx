"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { QrCode, RefreshCw, CheckCircle2, Power, ShieldAlert, Sparkles, Loader2, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QrStatusResponse {
  status: "disconnected" | "connecting" | "qr_ready" | "connected";
  qrCode?: string | null;
  phoneNumber?: string | null;
  userName?: string | null;
  connectedAt?: string | null;
}

export function QrScannerCard() {
  const [loading, setLoading] = useState<boolean>(false);
  const [session, setSession] = useState<QrStatusResponse>({
    status: "disconnected",
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Persist the active QR code image so it never disappears during status updates
  const activeQrCodeRef = useRef<string | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/whatsapp/qr");
      if (res.ok) {
        const data = (await res.json()) as QrStatusResponse;

        // Preserve QR code string if incoming poll omits it while status is qr_ready/connecting
        if (data.qrCode) {
          activeQrCodeRef.current = data.qrCode;
        }

        setSession({
          ...data,
          qrCode: data.qrCode || activeQrCodeRef.current,
        });

        // Clear cached QR code once fully connected
        if (data.status === "connected" || data.status === "disconnected") {
          if (data.status === "disconnected") {
            activeQrCodeRef.current = null;
          }
        }
      }
    } catch {
      // Ignore network polling errors
    }
  }, []);

  useEffect(() => {
    fetchStatus();
    const interval = setInterval(fetchStatus, 2000);
    return () => clearInterval(interval);
  }, [fetchStatus]);

  const handleConnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/whatsapp/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "connect" }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate QR code");
      }
      if (data.qrCode) {
        activeQrCodeRef.current = data.qrCode;
      }
      setSession(data);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error connecting");
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    setLoading(true);
    setErrorMsg(null);
    activeQrCodeRef.current = null;
    try {
      const res = await fetch("/api/whatsapp/qr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "disconnect" }),
      });
      if (res.ok) {
        setSession({ status: "disconnected" });
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Error disconnecting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="border-border bg-card text-card-foreground shadow-md transition-all">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-emerald-500/10 p-2.5 text-emerald-600 dark:text-emerald-400">
              <QrCode className="h-6 w-6" />
            </div>
            <div>
              <CardTitle className="text-xl font-bold tracking-tight text-foreground">
                WhatsApp Web QR Scanner
              </CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Scan with any WhatsApp number to send messages without Meta API approval
              </CardDescription>
            </div>
          </div>
          <Badge
            variant={
              session.status === "connected"
                ? "default"
                : session.status === "connecting"
                ? "secondary"
                : session.status === "qr_ready"
                ? "secondary"
                : "outline"
            }
            className={
              session.status === "connected"
                ? "bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                : session.status === "connecting"
                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30 animate-pulse"
                : session.status === "qr_ready"
                ? "bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30"
                : "border-border text-muted-foreground"
            }
          >
            {session.status === "connected" && <CheckCircle2 className="mr-1 h-3.5 w-3.5" />}
            {session.status === "connecting" && <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />}
            {session.status.toUpperCase()}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {errorMsg && (
          <div className="flex items-center gap-2 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <ShieldAlert className="h-4 w-4" />
            {errorMsg}
          </div>
        )}

        {session.status === "connected" ? (
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-6 text-center space-y-2">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
            <h3 className="text-lg font-semibold text-foreground">
              Connected as {session.userName || "WhatsApp User"}
            </h3>
            <p className="text-sm text-muted-foreground">
              Phone: +{session.phoneNumber || "Active Session"}
            </p>
            <div className="pt-2 flex items-center justify-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium">
              <Sparkles className="h-3.5 w-3.5" />
              <span>Ready for anti-ban CSV bulk broadcasts</span>
            </div>
          </div>
        ) : session.status === "connecting" ? (
          <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 p-8 text-center space-y-3">
            <div className="relative mx-auto h-12 w-12 flex items-center justify-center">
              <Smartphone className="h-8 w-8 text-blue-500 animate-bounce" />
              <Loader2 className="absolute -top-1 -right-1 h-5 w-5 text-blue-600 animate-spin" />
            </div>
            <h4 className="text-base font-semibold text-foreground">
              📱 Scan Detected! Linking Device...
            </h4>
            <p className="text-xs text-muted-foreground max-w-xs mx-auto">
              WhatsApp mobile app scan received. Synchronizing account keys and setting up session...
            </p>
          </div>
        ) : session.qrCode ? (
          <div className="flex flex-col items-center justify-center space-y-3 py-4">
            <div className="relative rounded-xl border border-border bg-white p-4 shadow-md">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={session.qrCode} alt="WhatsApp QR Code" className="h-64 w-64" />
            </div>
            <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span>Live Real-Time WhatsApp Web QR Code</span>
            </div>
            <p className="text-xs text-muted-foreground text-center max-w-xs leading-relaxed">
              Open WhatsApp on your phone → Settings → Linked Devices → <strong className="text-foreground">Link a Device</strong> and scan this QR code.
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border bg-muted/20 p-8 text-center space-y-3">
            <QrCode className="mx-auto h-10 w-10 text-muted-foreground/60" />
            <p className="text-sm text-muted-foreground">
              No WhatsApp device linked yet. Click below to generate a new QR code.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between border-t border-border bg-muted/30 px-6 py-4">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchStatus}
          disabled={loading}
          className="border-border text-foreground hover:bg-muted"
        >
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          Refresh Status
        </Button>

        {session.status === "connected" ? (
          <Button
            variant="destructive"
            size="sm"
            onClick={handleDisconnect}
            disabled={loading}
          >
            <Power className="mr-2 h-4 w-4" />
            Disconnect Number
          </Button>
        ) : (
          <Button
            size="sm"
            onClick={handleConnect}
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
          >
            <QrCode className="mr-2 h-4 w-4" />
            {loading ? "Generating..." : "Generate QR Code"}
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
