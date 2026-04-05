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
  Info,
  Lock,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { BrowserMultiFormatReader, NotFoundException, BarcodeFormat, DecodeHintType } from "@zxing/library";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

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
    
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
    
    setScanning(false);
    setCameraReady(false);
  }, []);

  const toggleAction = async (actionKey: string) => {
    if (!scannedData) return;
    if (scannedData.actions?.[actionKey]) {
      toast.info("This record is already locked.");
      return;
    }
    
    try {
      await update(ref(database, `registrations/${scannedData.id}/actions`), {
        [actionKey]: true
      });
      
      setScannedData(prev => {
        if (!prev) return null;
        return {
          ...prev,
          actions: {
            ...(prev.actions || {}),
            [actionKey]: true
          }
        };
      });
      
      toast.success("Record submitted and locked.");
      if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
    } catch (e) {
      toast.error("Submit failed");
    }
  };

  const fetchRegistration = useCallback(async (id: string) => {
    if (id === lastScannedId || loading) return;
    setLastScannedId(id);
    setLoading(true);
    setError(null);
    try {
      const snap = await get(ref(database, `registrations/${id}`));
      if (snap.exists()) {
        const data = snap.val() as Omit<Registration, "id">;
        setScannedData({ id, ...data });
        toast.success(`Scanned: ${data.name}`);
        if (navigator.vibrate) navigator.vibrate(100);
      } else {
        setError("Invalid Code");
        toast.error("Participant not found");
        setScannedData(null);
        setTimeout(() => setLastScannedId(null), 1500);
      }
    } catch {
      setError("Sync Error");
      setScannedData(null);
      setTimeout(() => setLastScannedId(null), 1500);
    } finally {
      setLoading(false);
    }
  }, [lastScannedId, loading]);

  useEffect(() => {
    return () => {
      if (readerRef.current) readerRef.current.reset();
    };
  }, []);

  useEffect(() => {
    if (scanning && videoRef.current && !readerRef.current) {
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
          const deviceId = backCamera?.deviceId || (devices.length > 0 ? devices[0].deviceId : undefined);

          if (devices.length === 0) {
            setError("No Camera");
            setScanning(false);
            return;
          }

          console.log("Activating high-speed scanner engine...");

          // Start the unified scanning engine - DO NOT call getUserMedia manually first
          await reader.decodeFromVideoDevice(deviceId, videoRef.current!, (result, err) => {
            if (result) {
              fetchRegistration(result.getText());
            }
            if (err && !(err instanceof NotFoundException)) {
              if (err.name !== 'NotFoundException') console.warn("Scan Loop:", err);
            }
          });

          // Wait a small moment to ensure the stream is established
          setTimeout(() => setCameraReady(true), 500);
        } catch (e) {
          console.error(e);
          setError("Lens Error");
          setScanning(false);
        }
      };
      initScanner();
    }
  }, [scanning, fetchRegistration, stopScanner]);

  const startScanner = () => {
    setScanning(true);
    setCameraReady(false);
    setError(null);
    setScannedData(null);
    setLastScannedId(null);
  };

  const clearScan = () => {
    setScannedData(null);
    setError(null);
    setLastScannedId(null);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scannerLogin(pin)) toast.error("Invalid PIN");
  };

  if (!scannerAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-sm w-full shadow-2xl">
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3">
                <ScanLine className="w-8 h-8 text-primary" />
              </div>
              <h2 className="font-display text-2xl font-bold mb-1">Verify Access</h2>
              <p className="text-muted-foreground text-sm">Enter admin PIN to start scanning</p>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="Scanner PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
              />
              <Button type="submit" className="w-full h-11 font-semibold">
                <Shield className="w-4 h-4 mr-2" /> Unlock Scanner
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => { stopScanner(); navigate("/admin"); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Exit
          </Button>
          <div className="flex items-center gap-2 text-sm font-bold">
            <div className={`w-2 h-2 rounded-full ${cameraReady ? 'bg-green-500 animate-pulse' : 'bg-muted'}`} />
            <span>ID SCANNER v2.1</span>
          </div>
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <Button variant="destructive" size="sm" onClick={stopScanner}>
              <CameraOff className="w-4 h-4 mr-1" /> Stop
            </Button>
          ) : (
            <Button size="sm" onClick={startScanner} className="bg-green-600 hover:bg-green-700">
              <Camera className="w-4 h-4 mr-1" /> Start
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-4 grid md:grid-cols-2 gap-6 pb-24">
        <div className="space-y-4">
          <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-square border-4 border-card shadow-2xl group">
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
                  <div className="absolute inset-x-4 top-0 h-1 bg-primary animate-scan-line shadow-[0_0_15px_hsl(var(--primary))]" />
                </div>
              </div>
            )}

            {!scanning && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground gap-4">
                <Camera className="w-12 h-12 opacity-20" />
                <p className="text-sm font-bold tracking-widest opacity-40 uppercase">Awaiting Start</p>
              </div>
            )}

            {scanning && !cameraReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-md text-white gap-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
                <p className="text-sm font-bold uppercase tracking-tighter">Arming Lens...</p>
              </div>
            )}
          </div>

          {error && (
            <div className="flex items-center gap-3 bg-red-500/10 text-red-500 border border-red-500/20 rounded-2xl p-4 text-sm font-bold animate-in fade-in slide-in-from-top">
              <X className="w-5 h-5 shrink-0" /> <p>{error}</p>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <h3 className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">Latest Data Snap</h3>
            {scannedData && (
              <Button variant="ghost" size="sm" onClick={clearScan} className="h-7 text-[10px] font-black hover:bg-primary/10">
                <RefreshCw className="w-3 h-3 mr-1.5" /> RE-SCAN
              </Button>
            )}
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-24 bg-card/50 border-2 border-dashed border-border rounded-[2.5rem]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-widest">In Sync...</p>
            </div>
          ) : scannedData ? (
            <Card className="glass-card overflow-hidden border-2 border-primary/20 shadow-2xl animate-in slide-in-from-right duration-500 rounded-[2.5rem]">
              <CardContent className="p-0">
                <div className={`px-6 py-3 text-[10px] font-black tracking-[0.25em] uppercase flex items-center gap-2 ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-600" : "bg-rose-600"} text-white`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Checked-In
                </div>

                <div className="p-6">
                  <div className="flex gap-5 items-start">
                    <div className="w-24 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-border flex-shrink-0">
                      <img
                        src={scannedData.photo}
                        alt={scannedData.name}
                        className="w-full h-full object-cover"
                        crossOrigin="anonymous"
                      />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="mb-4">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1 font-mono">Participant</p>
                        <h4 className="font-display font-black text-xl text-foreground leading-tight uppercase break-words line-clamp-2">
                          {scannedData.name}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 font-mono">Team</p>
                          <p className="font-bold text-xs text-foreground truncate">{scannedData.teamName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5 font-mono">Category</p>
                          <p className="font-bold text-xs text-foreground truncate">{scannedData.track}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-9 text-[10px] font-bold uppercase tracking-widest border-dashed hover:bg-primary/5">
                          <Info className="w-3.5 h-3.5 mr-2" /> View All Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-black uppercase tracking-tight">Full Record</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">ID</p>
                              <p className="text-sm font-mono font-bold text-primary">{scannedData.id}</p>
                            </div>
                            <div>
                              <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Entry</p>
                              <p className="text-sm font-bold">{scannedData.track}</p>
                            </div>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Organization</p>
                            <p className="text-sm font-bold leading-tight">{scannedData.collegeName}</p>
                          </div>
                          <div>
                            <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">Timestamp</p>
                            <p className="text-sm font-bold">{new Date(scannedData.registeredAt).toLocaleString()}</p>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-muted/30 px-6 py-5 flex flex-col gap-5 border-t border-border/50">
                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <CalendarCheck2 className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] font-mono">Attendance Log</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Attendance_1', 'Attendance_2', 'Attendance_3'].map((key) => {
                        const isLocked = scannedData.actions?.[key] || false;
                        return (
                          <Button
                            key={key}
                            variant={isLocked ? "default" : "outline"}
                            size="sm"
                            disabled={isLocked}
                            className={`h-8 text-[9px] font-black px-3 transition-all duration-300 ${isLocked ? 'bg-green-600 hover:bg-green-600 opacity-100 cursor-default ring-2 ring-green-600/20' : ''}`}
                            onClick={() => toggleAction(key)}
                          >
                            {isLocked ? <Lock className="w-2.5 h-2.5 mr-1.5" /> : null}
                            {key.replace('_', ' ')}
                            {isLocked ? <span className="ml-1 opacity-60">LOCKED</span> : null}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-3 px-1">
                      <Utensils className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-[0.15em] font-mono">Meal Voucher</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'day_1_lunch', label: 'D1 Lunch' },
                        { id: 'day_1_dinner', label: 'D1 Dinner' },
                        { id: 'day_2_breakfast', label: 'D2 B-Fast' },
                        { id: 'day_2_lunch', label: 'D1 Lunch' }
                      ].map((meal) => {
                        const isLocked = scannedData.actions?.[meal.id] || false;
                        return (
                          <Button
                            key={meal.id}
                            variant={isLocked ? "default" : "outline"}
                            size="sm"
                            disabled={isLocked}
                            className={`h-9 text-[9px] font-black justify-start px-3 transition-all duration-300 ${isLocked ? 'bg-blue-600 hover:bg-blue-600 opacity-100 cursor-default ring-2 ring-blue-600/20' : ''}`}
                            onClick={() => toggleAction(meal.id)}
                          >
                            <div className={`w-1.5 h-1.5 rounded-full mr-2 ${isLocked ? "bg-white animate-pulse" : "bg-primary/40"}`} />
                            {meal.label}
                            {isLocked && <Lock className="ml-auto w-2.5 h-2.5 opacity-50" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Button 
                    onClick={clearScan} 
                    className="w-full h-14 bg-primary hover:bg-primary/90 text-white font-black tracking-[0.2em] uppercase mt-2 shadow-xl shadow-primary/25 group relative"
                  >
                    READY NEXT SCAN
                    <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-7 py-24 bg-card/40 border-2 border-dashed border-border rounded-[3rem] text-center px-10 group overflow-hidden">
              <div className="w-24 h-24 rounded-[2rem] bg-background flex items-center justify-center shadow-xl group-hover:scale-110 transition-transform duration-700 relative z-10">
                <ScanLine className="w-10 h-10 text-primary opacity-30 animate-pulse" />
              </div>
              <div className="relative z-10">
                <p className="text-sm font-black tracking-[0.2em] text-foreground uppercase mb-2">Scanner Armed</p>
                <p className="text-[11px] text-muted-foreground max-w-[220px] mx-auto leading-relaxed">
                  System is active and ready. Align badge for instant retrieval.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
