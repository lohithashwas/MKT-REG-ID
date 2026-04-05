import { useState, useEffect, useRef, useCallback } from "react";
import { ref, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Shield,
  ArrowLeft,
  Camera,
  CameraOff,
  ScanLine,
  User,
  Users,
  School,
  Tag,
  CheckCircle2,
  X,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from "@zxing/library";

interface Registration {
  id: string;
  name: string;
  teamName: string;
  collegeName: string;
  track: string;
  photo: string;
  registeredAt: string;
}

const ScannerPage = () => {
  const { scannerAuthenticated, scannerLogin } = useAdminAuth();
  const [pin, setPin] = useState("");
  const [scanning, setScanning] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [scannedData, setScannedData] = useState<Registration | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastScannedId, setLastScannedId] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const navigate = useNavigate();

  const stopScanner = useCallback(() => {
    if (readerRef.current) {
      readerRef.current.reset();
      readerRef.current = null;
    }
    setScanning(false);
    setCameraReady(false);
  }, []);

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, [stopScanner]);

  const fetchRegistration = useCallback(async (id: string) => {
    if (id === lastScannedId) return; // avoid rescanning same ID immediately
    setLastScannedId(id);
    setLoading(true);
    setError(null);
    try {
      const snap = await get(ref(database, `registrations/${id}`));
      if (snap.exists()) {
        const data = snap.val() as Omit<Registration, "id">;
        setScannedData({ id, ...data });
        toast.success(`Found: ${data.name}`);
      } else {
        setError("Registration not found for this barcode.");
        toast.error("Registration not found");
        setScannedData(null);
      }
    } catch {
      setError("Failed to fetch registration. Check your connection.");
      toast.error("Lookup failed");
      setScannedData(null);
    } finally {
      setLoading(false);
    }
  }, [lastScannedId]);

  const startScanner = useCallback(async () => {
    if (!videoRef.current) return;
    setScanning(true);
    setCameraReady(false);
    setError(null);
    setScannedData(null);
    setLastScannedId(null);

    try {
      const hints = new Map();
      hints.set(DecodeHintType.POSSIBLE_FORMATS, [BarcodeFormat.CODE_128]);
      const reader = new BrowserMultiFormatReader(hints);
      readerRef.current = reader;

      const devices = await reader.listVideoInputDevices();
      const backCamera = devices.find((d) =>
        d.label.toLowerCase().includes("back") ||
        d.label.toLowerCase().includes("rear") ||
        d.label.toLowerCase().includes("environment")
      );
      const deviceId = backCamera?.deviceId || devices[0]?.deviceId;

      if (devices.length === 0) {
        setError("No camera found on this device.");
        setScanning(false);
        return;
      }

      const constraints = {
        video: {
          deviceId: deviceId ? { exact: deviceId } : undefined,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        } as any
      };

      reader.decodeFromConstraints(constraints, videoRef.current!, (result, err) => {
        if (result) {
          const text = result.getText();
          fetchRegistration(text);
        }
        if (err && !(err instanceof NotFoundException)) {
          console.warn(err);
        }
      });

      setCameraReady(true);
    } catch (e) {
      console.error(e);
      setError("Could not launch scanner. Please allow camera permission.");
      setScanning(false);
    }
  }, [fetchRegistration]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerLogin(pin)) {
      toast.error("Invalid PIN");
    }
  };

  const clearScan = () => {
    setScannedData(null);
    setError(null);
    setLastScannedId(null);
  };

  if (!scannerAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-sm w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <ScanLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-1">Scanner Access</h2>
              <p className="text-muted-foreground text-sm">Enter PIN to access the barcode scanner</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Enter scanner PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                id="scanner-pin"
                autoFocus
              />
              <Button type="submit" className="w-full h-11 font-semibold">
                <Shield className="w-4 h-4 mr-2" />
                Unlock Scanner
              </Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/admin")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Admin
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { stopScanner(); navigate("/admin"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Button>
          <div className="flex items-center gap-2 text-sm font-medium">
            <ScanLine className="w-4 h-4 text-primary" />
            <span>ID Card Scanner</span>
          </div>
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <Button variant="outline" size="sm" onClick={stopScanner}>
              <CameraOff className="w-4 h-4 mr-1" /> Stop Camera
            </Button>
          ) : (
            <Button size="sm" onClick={startScanner}>
              <Camera className="w-4 h-4 mr-1" /> Start Camera
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-6">
        {/* Camera view */}
        <div className="space-y-3">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Camera Feed</h3>
          <div
            className="relative rounded-2xl overflow-hidden bg-black border border-border"
            style={{ aspectRatio: "4/3" }}
          >
            {/* Scan overlay */}
            {scanning && cameraReady && (
              <>
                <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                  <div
                    className="border-2 border-primary rounded-xl"
                    style={{ width: "60%", height: "40%", boxShadow: "0 0 0 9999px rgba(0,0,0,0.45)" }}
                  />
                </div>
                {/* Animated scan line */}
                <div className="absolute z-20 pointer-events-none" style={{ top: "30%", left: "20%", width: "60%" }}>
                  <div
                    className="h-0.5 bg-primary/80 shadow-lg"
                    style={{
                      animation: "scanline 2s ease-in-out infinite",
                      boxShadow: "0 0 8px 2px hsl(var(--primary))",
                    }}
                  />
                </div>
              </>
            )}

            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              style={{ display: scanning ? "block" : "none" }}
            />

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Camera className="w-12 h-12 opacity-30" />
                <p className="text-sm">Click "Start Camera" to begin scanning</p>
              </div>
            )}

            {scanning && !cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm">Initializing camera...</p>
              </div>
            )}
          </div>

          {scanning && cameraReady && (
            <p className="text-center text-xs text-muted-foreground">
              Point the camera at a barcode on an ID card
            </p>
          )}

          {error && (
            <div className="flex items-start gap-2 bg-destructive/10 text-destructive rounded-lg p-3 text-sm">
              <X className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}
        </div>

        {/* Scanned result */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Participant Details</h3>
            {scannedData && (
              <Button variant="ghost" size="sm" onClick={clearScan} className="h-7 text-xs">
                <RefreshCw className="w-3 h-3 mr-1" /> Clear
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-16 text-muted-foreground">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-sm">Looking up registration...</p>
            </div>
          ) : scannedData ? (
            <Card className="glass-card overflow-hidden border-primary/30">
              <CardContent className="p-0">
                {/* Header band */}
                <div className={`px-4 py-2 text-xs font-semibold tracking-wider uppercase ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-500/15 text-blue-400" : "bg-rose-500/15 text-rose-400"}`}>
                  <div className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    {scannedData.track}
                  </div>
                </div>

                <div className="p-4 flex gap-4">
                  {/* Photo */}
                  {scannedData.photo && (
                    <div className="w-24 h-28 rounded-xl overflow-hidden border-2 border-border flex-shrink-0">
                      <img
                        src={scannedData.photo}
                        alt={scannedData.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  {/* Details */}
                  <div className="flex-1 min-w-0 space-y-2">
                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                        <User className="w-3 h-3" /> Name
                      </div>
                      <p className="font-display font-bold text-lg leading-tight text-foreground">{scannedData.name}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                        <Users className="w-3 h-3" /> Team
                      </div>
                      <p className="font-semibold text-sm text-foreground">{scannedData.teamName}</p>
                    </div>

                    <div>
                      <div className="flex items-center gap-1.5 text-muted-foreground text-xs mb-0.5">
                        <School className="w-3 h-3" /> College
                      </div>
                      <p className="text-sm text-muted-foreground leading-tight">{scannedData.collegeName}</p>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border px-4 py-2 flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-muted-foreground text-xs">
                    <Tag className="w-3 h-3" />
                    <span className="font-mono">{scannedData.id.slice(0, 16)}…</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(scannedData.registeredAt).toLocaleDateString("en-IN", {
                      day: "2-digit", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-4 py-16 text-muted-foreground border-2 border-dashed border-border rounded-2xl">
              <ScanLine className="w-12 h-12 opacity-30" />
              <div className="text-center">
                <p className="text-sm font-medium">No scan yet</p>
                <p className="text-xs mt-1">Scan an ID card barcode to see participant details</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes scanline {
          0% { transform: translateY(0); opacity: 1; }
          50% { transform: translateY(calc(40vh * 0.4)); opacity: 0.6; }
          100% { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default ScannerPage;
