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
    if (scannedData.actions?.[actionKey]) return; // Strictly locked
    
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
      
      toast.success("Locked Successfully");
      if (navigator.vibrate) navigator.vibrate(50);
    } catch (e) {
      toast.error("Operation failed");
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
        toast.success(`Verified: ${data.name}`);
        if (navigator.vibrate) navigator.vibrate(100);
      } else {
        setError(`Not Found: ${id}`);
        setScannedData(null);
        setTimeout(() => setLastScannedId(null), 2000);
      }
    } catch {
      setError("Database Offline");
      setScannedData(null);
      setTimeout(() => setLastScannedId(null), 2000);
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

          // Stable Mode: Let the browser and library handle device selection automatically.
          await reader.decodeFromVideoDevice(undefined, videoRef.current!, (result, err) => {
            if (result) {
              fetchRegistration(result.getText());
            }
          });

          setCameraReady(true);
        } catch (e) {
          console.error(e);
          setError("Permissions Denied");
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
        <Card className="max-w-sm w-full border-2 border-primary/20 shadow-2xl">
          <CardContent className="pt-8">
            <ScanLine className="w-16 h-16 text-primary mx-auto mb-6" />
            <h2 className="text-xl font-bold text-center uppercase mb-6">Scanner Login</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                type="password"
                placeholder="PIN"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                autoFocus
                className="text-center text-2xl h-14 font-black"
              />
              <Button type="submit" className="w-full h-14 font-bold uppercase text-lg">
                Access Scanner
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
        <Button variant="outline" size="sm" onClick={() => { stopScanner(); navigate("/admin"); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> EXIT
        </Button>
        <div className="flex items-center gap-2">
          <div className={`w-2 h-2 rounded-full ${cameraReady ? "bg-green-500 animate-pulse" : "bg-muted"}`} />
          <span className="text-[11px] font-black uppercase tracking-widest">Scanner Ready</span>
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <Button variant="destructive" size="sm" onClick={stopScanner}>
              <CameraOff className="w-4 h-4 mr-1" /> STOP
            </Button>
          ) : (
            <Button size="sm" onClick={startScanner}>
              <Camera className="w-4 h-4 mr-1" /> START
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6 pb-24">
        {/* Scanner Viewport */}
        <div className="relative rounded-[2rem] overflow-hidden bg-black aspect-square border-4 border-card shadow-xl">
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
              <p className="text-sm font-bold opacity-40 uppercase">Waiting to start</p>
            </div>
          )}

          {scanning && !cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 text-white gap-4">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-xs font-bold uppercase tracking-widest">Activating Camera...</p>
            </div>
          )}
        </div>

        {/* Error Notification */}
        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-2xl p-4 flex items-center gap-3 text-destructive animate-in fade-in slide-in-from-top duration-300">
            <X className="w-5 h-5 flex-shrink-0" />
            <p className="text-sm font-bold uppercase flex-1">{error}</p>
            <Button size="sm" variant="ghost" onClick={startScanner} className="text-destructive font-black">RETRY</Button>
          </div>
        )}

        {/* Final Scanning Card */}
        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-4 py-20 bg-muted/20 border-2 border-dashed border-border rounded-[2.5rem]">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Verifying...</p>
            </div>
          ) : scannedData ? (
            <Card className="glass-card overflow-hidden border-2 border-primary/20 shadow-2xl animate-in zoom-in-95 duration-500 rounded-[2.5rem]">
              <CardContent className="p-0">
                <div className={`px-6 py-3 text-[10px] font-black tracking-[0.2em] uppercase flex items-center gap-2 ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-600" : "bg-rose-600"} text-white`}>
                  <CheckCircle2 className="w-3.5 h-3.5" /> Verified Participant
                </div>

                <div className="p-6">
                  <div className="flex gap-5 items-start">
                    <div className="w-24 h-32 rounded-2xl overflow-hidden shadow-lg border-2 border-border flex-shrink-0">
                      <img src={scannedData.photo} alt={scannedData.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="mb-4">
                        <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Name</p>
                        <h4 className="font-display font-black text-xl text-foreground leading-tight uppercase break-words line-clamp-2">{scannedData.name}</h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Team</p>
                          <p className="font-bold text-xs text-foreground truncate">{scannedData.teamName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest mb-0.5">Category</p>
                          <p className="font-bold text-xs text-foreground truncate">{scannedData.track}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-border/50">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full h-10 text-[10px] font-bold uppercase tracking-widest rounded-xl">
                          <Info className="w-3.5 h-3.5 mr-2" /> View Full Info
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm rounded-[2rem]">
                        <DialogHeader>
                          <DialogTitle className="text-xl font-bold uppercase">Participant Registry</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4 pt-4 text-sm font-medium">
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground uppercase text-[10px] font-black">ID</span>
                            <span className="font-mono font-bold text-primary">{scannedData.id}</span>
                          </div>
                          <div className="flex justify-between border-b pb-2">
                            <span className="text-muted-foreground uppercase text-[10px] font-black">Org</span>
                            <span>{scannedData.collegeName}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground uppercase text-[10px] font-black">Join Date</span>
                            <span>{new Date(scannedData.registeredAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-muted/30 px-6 py-6 flex flex-col gap-6 border-t border-border/50">
                  {/* Attendance */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Mark Attendance</span>
                    <div className="flex flex-wrap gap-2">
                      {['Attendance_1', 'Attendance_2', 'Attendance_3'].map((key) => {
                        const isLocked = scannedData.actions?.[key] || false;
                        return (
                          <Button
                            key={key}
                            variant={isLocked ? "default" : "outline"}
                            size="sm"
                            disabled={isLocked}
                            className={`h-9 px-4 rounded-xl font-bold ${isLocked ? 'bg-green-600 opacity-100 ring-2 ring-green-600/20' : ''}`}
                            onClick={() => toggleAction(key)}
                          >
                            {isLocked ? <Lock className="w-3 h-3 mr-1.5" /> : null} {key.replace('_', ' ')}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Meals */}
                  <div className="space-y-3">
                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest px-1">Meal Tracking</span>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: 'day_1_lunch', label: 'D1 Lunch' },
                        { id: 'day_1_dinner', label: 'D1 Dinner' },
                        { id: 'day_2_breakfast', label: 'D2 B-Fast' },
                        { id: 'day_2_lunch', label: 'D2 Lunch' }
                      ].map((meal) => {
                        const isLocked = scannedData.actions?.[meal.id] || false;
                        return (
                          <Button
                            key={meal.id}
                            variant={isLocked ? "default" : "outline"}
                            size="sm"
                            disabled={isLocked}
                            className={`h-10 justify-start px-4 rounded-xl font-bold ${isLocked ? 'bg-blue-600 opacity-100 ring-2 ring-blue-600/20' : ''}`}
                            onClick={() => toggleAction(meal.id)}
                          >
                            <div className={`w-2 h-2 rounded-full mr-3 ${isLocked ? "bg-white animate-pulse" : "bg-primary/40"}`} />
                            {meal.label} {isLocked && <Lock className="ml-auto w-3 h-3 opacity-50" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Button 
                    onClick={clearScan} 
                    className="w-full h-14 bg-primary text-white font-black uppercase tracking-widest mt-2 shadow-2xl rounded-2xl group"
                  >
                    READY FOR NEXT SCAN <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-7 py-20 bg-card/50 border-2 border-dashed border-border rounded-[3rem] text-center px-10 group">
              <ScanLine className="w-12 h-12 text-primary opacity-20 animate-pulse" />
              <div>
                <p className="text-xs font-black tracking-[0.2em] text-foreground uppercase mb-2">SYSTEM ARMED</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed max-w-[200px] mx-auto">
                  Align the participant QR code firmly within the center guides.
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
