import { useState, useEffect, useRef, useCallback } from "react";
import { ref, get, update } from "firebase/database";
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
  CalendarCheck2,
  Utensils,
  ChevronRight,
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
  actions?: {
    [key: string]: boolean;
  };
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

  const toggleAction = async (actionKey: string) => {
    if (!scannedData) return;
    
    const currentStatus = scannedData.actions?.[actionKey] || false;
    const newStatus = !currentStatus;
    
    try {
      await update(ref(database, `registrations/${scannedData.id}/actions`), {
        [actionKey]: newStatus
      });
      
      setScannedData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          actions: {
            ...(prev.actions || {}),
            [actionKey]: newStatus
          }
        };
      });
      
      toast.success(`${actionKey.replace(/_/g, ' ').toUpperCase()} marked as ${newStatus ? 'SUCCESS' : 'REVERSED'}`);
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      toast.error("Failed to update status");
    }
  };

  const fetchRegistration = useCallback(async (id: string) => {
    if (id === lastScannedId) return;
    setLastScannedId(id);
    setLoading(true);
    setError(null);
    try {
      const snap = await get(ref(database, `registrations/${id}`));
      if (snap.exists()) {
        const data = snap.val() as Omit<Registration, "id">;
        setScannedData({ id, ...data });
        toast.success(`Found: ${data.name}`);
        if (navigator.vibrate) navigator.vibrate(100);
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

  useEffect(() => {
    return () => {
      if (readerRef.current) {
        readerRef.current.reset();
      }
    };
  }, []);

  useEffect(() => {
    if (scanning && videoRef.current && !readerRef.current) {
      let nativeInterval: any = null;

      const initScanner = async () => {
        try {
          const hints = new Map();
          hints.set(DecodeHintType.POSSIBLE_FORMATS, [
            BarcodeFormat.QR_CODE,
            BarcodeFormat.CODE_128,
          ]);
          hints.set(DecodeHintType.TRY_HARDER, true);
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

          // Native scan bridge for "Instant" hardware-accelerated scanning where supported
          if ("BarcodeDetector" in window) {
            try {
              // @ts-ignore
              const detector = new BarcodeDetector({ formats: ["qr_code", "code_128"] });
              const checkNative = async () => {
                if (!videoRef.current || !scanning) return;
                try {
                  const barcodes = await detector.detect(videoRef.current);
                  if (barcodes.length > 0) {
                    fetchRegistration(barcodes[0].rawValue);
                  }
                } catch (e) {}
                if (scanning) nativeInterval = requestAnimationFrame(checkNative);
              };
              checkNative();
            } catch (e) {
              console.warn("Native scanner init failed:", e);
            }
          }

          reader.decodeFromVideoDevice(deviceId || undefined, videoRef.current!, (result, err) => {
            if (result) {
              fetchRegistration(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              console.warn(err);
            }
          });

          setCameraReady(true);
        } catch (e) {
          console.error("Scanner Error:", e);
          setError("Could not access camera. Please allow camera permission.");
          setScanning(false);
        }
      };
      initScanner();

      return () => {
        if (nativeInterval) cancelAnimationFrame(nativeInterval);
      };
    }
  }, [scanning, fetchRegistration, stopScanner]);

  const startScanner = () => {
    setScanning(true);
    setCameraReady(false);
    setError(null);
    setScannedData(null);
    setLastScannedId(null);
  };

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
    <div className="min-h-screen bg-background text-foreground">
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

      <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-6 pb-20">
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest px-1">Live Camera Feed</h3>
          <div className="relative rounded-3xl overflow-hidden bg-black aspect-[4/3] border border-border shadow-2xl group">
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              muted
              playsInline
              style={{ display: scanning ? "block" : "none" }}
            />
            
            {scanning && !scannedData && (
              <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
                <div className="w-64 h-64 border-2 border-primary/40 rounded-3xl relative overflow-hidden backdrop-blur-[1px]">
                  <div className="absolute -top-1 -left-1 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-xl" />
                  <div className="absolute -top-1 -right-1 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-xl" />
                  <div className="absolute -bottom-1 -left-1 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-xl" />
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-xl" />
                  <div className="absolute inset-x-4 top-0 h-[2px] bg-primary animate-scan-line shadow-[0_0_15px_hsl(var(--primary))]" />
                </div>
              </div>
            )}

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4 bg-muted/20">
                <div className="w-16 h-16 rounded-full bg-background flex items-center justify-center shadow-lg">
                  <Camera className="w-8 h-8 opacity-40 text-primary" />
                </div>
                <p className="text-sm font-medium">Ready to start scanning</p>
              </div>
            )}

            {scanning && !cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-primary" />
                <p className="text-sm font-medium tracking-tight">Accessing camera hardware...</p>
              </div>
            )}
          </div>

          {scanning && cameraReady && (
            <div className="bg-primary/5 border border-primary/10 rounded-2xl p-4 text-center">
              <p className="text-[13px] text-muted-foreground">
                Position the <span className="text-primary font-bold">QR Code</span> or <span className="text-primary font-bold">Barcode</span> inside the frame for instant detection.
              </p>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-3 bg-destructive/10 text-destructive border border-destructive/20 rounded-2xl p-4 text-sm animate-in fade-in zoom-in duration-300">
              <X className="w-5 h-5 shrink-0" />
              <p className="font-medium">{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Scanning Result</h3>
            {scannedData && (
              <Button variant="ghost" size="sm" onClick={clearScan} className="h-8 text-xs font-bold hover:bg-primary/10 hover:text-primary">
                <RefreshCw className="w-3.5 h-3.5 mr-1.5" /> RE-SCAN
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 bg-muted/20 border-2 border-dashed border-border rounded-[2rem]">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-sm font-semibold text-muted-foreground">Syncing with database...</p>
            </div>
          ) : scannedData ? (
            <Card className="glass-card overflow-hidden border-primary/20 shadow-2xl animate-in slide-in-from-right duration-500">
              <CardContent className="p-0">
                <div className={`px-6 py-3 text-[11px] font-black tracking-[0.2em] uppercase flex items-center gap-2 ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-500 text-white" : "bg-rose-500 text-white"}`}>
                  <CheckCircle2 className="w-4 h-4 ml-[-2px]" />
                  Verified Participant
                </div>

                <div className="p-6">
                  <div className="flex gap-6 items-start">
                    <div className="w-32 h-40 rounded-2xl overflow-hidden shadow-xl border-2 border-border shadow-black/5 flex-shrink-0">
                      <img
                        src={scannedData.photo}
                        alt={scannedData.name}
                        className="w-full h-full object-cover grayscale-[20%] contrast-[110%]"
                        crossOrigin="anonymous"
                      />
                    </div>

                    <div className="flex-1 space-y-4 pt-1">
                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Full Name</p>
                        <h4 className="font-display font-black text-2xl leading-none text-foreground tracking-tight uppercase">{scannedData.name}</h4>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Team</p>
                          <p className="font-bold text-sm text-foreground truncate">{scannedData.teamName}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Track</p>
                          <p className="font-bold text-sm text-foreground">{scannedData.track}</p>
                        </div>
                      </div>

                      <div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">College / Organization</p>
                        <p className="text-sm font-medium text-muted-foreground italic leading-tight uppercase">{scannedData.collegeName}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-muted/50 px-6 py-4 flex flex-col gap-4 border-t border-border/50">
                  {/* Attendance Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <CalendarCheck2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Attendance</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Attendance_1', 'Attendance_2', 'Attendance_3'].map((key) => (
                        <Button
                          key={key}
                          variant={scannedData.actions?.[key] ? "default" : "outline"}
                          size="sm"
                          className="h-8 text-[10px] font-bold px-3"
                          onClick={() => toggleAction(key)}
                        >
                          {key.replace('_', ' ')}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Meals Section */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <Utensils className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Food Vouchers</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'day_1_lunch', label: 'D1 Lunch' },
                        { id: 'day_1_dinner', label: 'D1 Dinner' },
                        { id: 'day_2_breakfast', label: 'D2 B-Fast' },
                        { id: 'day_2_lunch', label: 'D2 Lunch' }
                      ].map((meal) => (
                        <Button
                          key={meal.id}
                          variant={scannedData.actions?.[meal.id] ? "default" : "outline"}
                          size="sm"
                          className="h-9 text-[10px] font-bold justify-start px-3"
                          onClick={() => toggleAction(meal.id)}
                        >
                          <div className={`w-2 h-2 rounded-full mr-2 ${scannedData.actions?.[meal.id] ? "bg-white" : "bg-primary/30"}`} />
                          {meal.label}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Identification & Time */}
                  <div className="pt-2 flex items-center justify-between opacity-60">
                    <div className="flex items-center gap-2 text-primary">
                      <Tag className="w-4 h-4" />
                      <span className="font-mono text-[10px] font-black tracking-tighter">{scannedData.id}</span>
                    </div>
                    <div className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                      {new Date(scannedData.registeredAt).toLocaleTimeString("en-IN", { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Next Scan Action */}
                  <Button 
                    onClick={clearScan} 
                    className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black tracking-widest uppercase mt-2 shadow-lg shadow-primary/20 group"
                  >
                    NEXT SCAN <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 py-24 bg-muted/20 border-2 border-dashed border-border rounded-[2rem] text-center px-8 group">
              <div className="w-20 h-20 rounded-3xl bg-background flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-500">
                <ScanLine className="w-10 h-10 opacity-20 text-primary" />
              </div>
              <div>
                <p className="text-base font-black tracking-tight text-foreground">AWAITING SCAN...</p>
                <p className="text-xs text-muted-foreground mt-1 max-w-[200px] mx-auto leading-relaxed">Please align any participant ID inside the camera guide.</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
