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
  History,
  Zap,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import { Html5Qrcode } from "html5-qrcode";
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
  const [status, setStatus] = useState<"READY" | "ACTIVE" | "SUCCESS" | "ERROR">("READY");
  const [history, setHistory] = useState<{id: string, name: string, time: number}[]>([]);
  
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const navigate = useNavigate();

  const clearScan = useCallback(() => {
    setScannedData(null);
    setLastScannedId(null);
    setStatus("ACTIVE");
    setError(null);
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mkt-scanner-history');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const addToHistory = (id: string, name: string) => {
    const newEntry = { id, name, time: Date.now() };
    const updated = [newEntry, ...history.slice(0, 9)];
    setHistory(updated);
    localStorage.setItem('mkt-scanner-history', JSON.stringify(updated));
  };

  const stopScanner = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop();
      } catch (e) {
        console.warn("Scanner stop warning:", e);
      }
    }
    setScanning(false);
    setCameraReady(false);
    setStatus("READY");
  }, []);

  const toggleAction = async (actionKey: string) => {
    if (!scannedData || scannedData.actions?.[actionKey]) return;
    try {
      await update(ref(database, `registrations/${scannedData.id}/actions`), { [actionKey]: true });
      setScannedData(prev => prev ? { ...prev, actions: { ...(prev.actions || {}), [actionKey]: true } } : null);
      toast.success("Voucher Locked");
      if (navigator.vibrate) navigator.vibrate(50);
    } catch {
      toast.error("Database Sync Error");
    }
  };

  const fetchRegistration = useCallback(async (id: string) => {
    if (id === lastScannedId || loading) return;
    setLastScannedId(id);
    setLoading(true);
    setStatus("SUCCESS");
    try {
      const snap = await get(ref(database, `registrations/${id}`));
      if (snap.exists()) {
        const data = snap.val() as Omit<Registration, "id">;
        setScannedData({ id, ...data });
        addToHistory(id, data.name);
        toast.success(`Verified: ${data.name}`);
        if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
      } else {
        setError(`Record Not Found: ${id}`);
        setScannedData(null);
        setStatus("ERROR");
        setTimeout(() => { if (!loading) { setLastScannedId(null); setStatus("ACTIVE"); setError(null); } }, 3000);
      }
    } catch {
      setError("Cloud Sync Failed");
      setStatus("ERROR");
      setTimeout(() => { setLastScannedId(null); setStatus("ACTIVE"); setError(null); }, 3000);
    } finally {
      setLoading(false);
    }
  }, [lastScannedId, loading, history]);

  const onScanSuccessRef = useRef<((id: string) => void) | null>(null);
  onScanSuccessRef.current = fetchRegistration;

  useEffect(() => {
    if (scanning && !scannerRef.current) {
        const initScanner = async () => {
            try {
                const scanner = new Html5Qrcode("reader");
                scannerRef.current = scanner;
                
                const cameras = await Html5Qrcode.getCameras();
                if (!cameras || cameras.length === 0) {
                    throw new Error("No camera hardware found");
                }
                
                // Smart Discovery: Prioritize back/rear cameras
                let backCameraId = cameras[cameras.length - 1].id;
                const rearCamera = cameras.find(c => 
                    c.label.toLowerCase().includes('back') || 
                    c.label.toLowerCase().includes('rear') ||
                    c.label.toLowerCase().includes('environment')
                );
                if (rearCamera) backCameraId = rearCamera.id;
                
                await scanner.start(
                    backCameraId,
                    {
                        fps: 20, // High-speed tracking
                        qrbox: { width: 250, height: 250 },
                        aspectRatio: 1.0,
                    },
                    (decodedText) => {
                        // USE THE REF: This prevents the scanner from restarting
                        if (onScanSuccessRef.current) {
                            onScanSuccessRef.current(decodedText);
                        }
                    },
                    undefined
                );
                
                setCameraReady(true);
                setStatus("ACTIVE");
            } catch (err: any) {
                console.error("Scanner Error:", err);
                setError(`HARDWARE BLOCK: ${err.message || 'Busy'}`);
                setScanning(false);
                setStatus("ERROR");
                toast.error("Lens failed. Check permissions.");
                scannerRef.current = null;
            }
        };
        initScanner();
    }
    
    return () => {
        // ONLY stop if the scanning toggle is turned OFF manually
        // We don't stop between individual scans anymore
    };
  }, [scanning]); // ONLY DEPEND ON SCANNING TOGGLE

  const startScanner = () => {
    setScanning(true);
    setCameraReady(false);
    setError(null);
    setScannedData(null);
    setLastScannedId(null);
    setStatus("ACTIVE");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (scannerLogin(pin)) toast.success("Access Granted");
    else toast.error("Invalid Security PIN");
  };

  if (!scannerAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c0f] p-4">
        <Card className="max-w-sm w-full bg-[#111318] border-white/5 shadow-2xl">
          <CardContent className="pt-10 pb-10">
            <Zap className="w-16 h-16 text-primary mx-auto mb-8 shadow-glow" />
            <h2 className="text-2xl font-black text-center text-white mb-2 uppercase tracking-tight">Security Vault</h2>
            <p className="text-white/30 text-[10px] text-center mb-8 uppercase tracking-[0.3em]">Authorized Personnel Only</p>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="password" placeholder="••••" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus className="text-center text-2xl h-16 bg-white/5 border-white/10 text-white tracking-[0.5em]" />
              <Button type="submit" className="w-full h-16 bg-primary text-black font-black uppercase text-lg hover:scale-[1.02] active:scale-95 transition-all">UNLOCK CONSOLE</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c0f] text-white selection:bg-primary/20">
      {/* Tactical Header */}
      <div className="sticky top-0 z-50 bg-[#111318]/90 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => { stopScanner(); navigate("/admin"); }} className="text-white/40 hover:text-white border border-white/5 rounded-xl">
            <ArrowLeft className="w-4 h-4 mr-2" /> EXIT
          </Button>
          <div className={`flex items-center gap-2.5 px-4 py-1.5 rounded-full border text-[10px] font-black tracking-[0.2em] uppercase transition-all duration-300 ${
            status === "ACTIVE" ? "border-primary/40 bg-primary/10 text-primary" : 
            status === "SUCCESS" ? "border-green-500/40 bg-green-500/10 text-green-500" : 
            "border-white/10 bg-white/5 text-white/30"
          }`}>
            <div className={`w-2 h-2 rounded-full bg-current ${status === "ACTIVE"?"animate-pulse":""}`} />
            {status}
          </div>
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <Button variant="destructive" size="sm" onClick={stopScanner} className="h-10 px-6 font-black rounded-xl">STOP</Button>
          ) : (
            <Button size="sm" onClick={startScanner} className="h-10 px-6 bg-primary text-black font-black rounded-xl shadow-glow active:scale-95 transition-all">START</Button>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6 pb-32">
        {/* Pro Camera Lens Container - ALWAYS IN DOM to prevent driver crash */}
        <div className={`relative rounded-[3rem] overflow-hidden bg-black aspect-square border-[8px] border-white/5 shadow-2xl ring-1 ring-white/10 ${scannedData ? 'hidden' : 'block'}`}>
          <div id="reader" className="w-full h-full object-cover" />
          
          {scanning && !scannedData && !error && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-[1.5px] border-primary/20 rounded-[2.5rem] relative overflow-hidden backdrop-blur-none">
                <div className="absolute inset-x-8 top-0 h-[3px] bg-primary animate-scan-line shadow-[0_0_25px_#00e5a0] opacity-80" />
              </div>
            </div>
          )}

          {scanning && !cameraReady && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c0f] gap-6 z-20">
              <Loader2 className="w-14 h-14 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30 text-center">Opening Iris...</p>
            </div>
          )}
          
          {!scanning && !error && (
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 opacity-10">
              <ScanLine className="w-20 h-20" />
              <p className="text-[11px] font-black uppercase tracking-[0.35em]">Link Offline</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border-2 border-red-500/20 rounded-[2rem] p-8 flex flex-col items-center gap-6 text-red-500 animate-in slide-in-from-top duration-500">
            <X className="w-12 h-12 shrink-0 bg-red-500/20 rounded-full p-2" />
            <div className="text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.2em]">{error.split(':')[0]}</p>
                <p className="text-[10px] font-mono opacity-60 break-all">{error.split(':')[1] || 'Hardware Busy'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={startScanner} className="w-full h-14 border-red-500/30 text-red-500 hover:bg-red-500/10 uppercase font-black text-[11px] tracking-widest rounded-2xl active:scale-95 transition-all">
               FULL HARDWARE RECOVERY
            </Button>
          </div>
        )}

        <div className="space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-8 py-24 bg-[#111318] border border-white/5 rounded-[3.5rem] shadow-inner-glow">
              <Loader2 className="w-12 h-12 animate-spin text-primary" />
              <p className="text-[11px] font-black uppercase tracking-[0.4em] opacity-30">Syncing Record...</p>
            </div>
          ) : scannedData ? (
            <Card className="bg-[#111318] border-2 border-primary/20 shadow-[0_0_60px_-15px_rgba(0,229,160,0.25)] rounded-[3rem] overflow-hidden animate-in zoom-in-95 duration-500">
              <CardContent className="p-0">
                <div className={`px-8 py-4 text-[11px] font-black tracking-[0.3em] uppercase flex items-center justify-between ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-600" : "bg-rose-600"} text-white shadow-xl`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 shadow-glow" /> VERIFIED
                  </div>
                  <span className="opacity-70 font-mono">UID-{scannedData.id.slice(-6).toUpperCase()}</span>
                </div>

                <div className="p-8">
                  <div className="flex gap-7 items-start">
                    <div className="w-28 h-36 rounded-[2rem] overflow-hidden shadow-2xl border-[3px] border-white/5 flex-shrink-0">
                      <img src={scannedData.photo} alt={scannedData.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                       <div className="mb-6">
                          <p className="text-[10px] font-black text-white/40 uppercase mb-2">Participant</p>
                          <h4 className="font-display font-black text-2xl text-white leading-[1.1] uppercase break-words tracking-tight">
                             {scannedData.name}
                          </h4>
                       </div>
                       <div className="space-y-3 font-bold text-[11px] text-white/70 uppercase">
                          <p className="truncate">TEAM: {scannedData.teamName}</p>
                          <p className="truncate">ROLE: {scannedData.track}</p>
                       </div>
                    </div>
                  </div>
                  
                  <div className="mt-8 pt-6 border-t border-white/5">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-full h-12 text-[10px] font-black uppercase bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl text-white/60">
                          <Info className="w-4 h-4 mr-3 opacity-40" /> EXTENDED METADATA
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm rounded-[3rem] bg-[#0d0f14] border-white/10 text-white p-8">
                        <DialogHeader><DialogTitle className="uppercase font-black text-xl mb-4">Audit Trail</DialogTitle></DialogHeader>
                        <div className="space-y-6 text-[11px] font-mono">
                          <p>Record ID: {scannedData.id} </p>
                          <p>Orig: {scannedData.collegeName}</p>
                          <p>Created: {new Date(scannedData.registeredAt).toLocaleString()}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-black/50 px-8 py-8 flex flex-col gap-8 border-t border-white/5">
                  <div>
                    <div className="flex items-center gap-2.5 mb-5 px-1">
                      <CalendarCheck2 className="w-4.5 h-4.5 text-primary shadow-glow" />
                      <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Attendance Logistics</span>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {['Attendance_1', 'Attendance_2', 'Attendance_3'].map((key) => {
                        const isLocked = scannedData.actions?.[key] || false;
                        return (
                          <Button key={key} variant="outline" size="sm" disabled={isLocked} className={`h-11 px-6 rounded-2xl border-white/10 font-black transition-all text-[10px] uppercase tracking-widest ${isLocked ? 'bg-primary text-black border-primary shadow-[0_0_15px_rgba(0,229,160,0.2)] opacity-100' : 'bg-white/5 text-white/60 hover:bg-white/10'}`} onClick={() => toggleAction(key)}>
                            {isLocked && <Lock className="w-3.5 h-3.5 mr-2" />} {key.replace('_',' ')}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2.5 mb-5 px-1">
                      <Utensils className="w-4.5 h-4.5 text-primary shadow-glow" />
                      <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Catering Vouchers</span>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { id: 'day_1_lunch', label: 'D1 LUNCH' },
                        { id: 'day_1_dinner', label: 'D1 DINNER' },
                        { id: 'day_2_breakfast', label: 'D2 B-FAST' },
                        { id: 'day_2_lunch', label: 'D2 LUNCH' }
                      ].map((meal) => {
                        const isLocked = scannedData.actions?.[meal.id] || false;
                        return (
                          <Button key={meal.id} variant="outline" size="sm" disabled={isLocked} className={`h-14 justify-start px-6 rounded-2xl border-white/10 font-black transition-all text-[10px] tracking-widest ${isLocked ? 'bg-blue-600 text-white border-blue-600 shadow-[0_0_15px_rgba(37,99,235,0.2)] opacity-100' : 'bg-white/5 text-white/60 hover:bg-white/10'}`} onClick={() => toggleAction(meal.id)}>
                            <div className={`w-2 h-2 rounded-full mr-4 ${isLocked ? "bg-white shadow-glow" : "bg-primary/30"}`} />
                            {meal.label} {isLocked && <Lock className="ml-auto w-3.5 h-3.5 opacity-50" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Button onClick={clearScan} className="w-full h-20 bg-primary text-black font-black uppercase tracking-[0.35em] mt-2 shadow-[0_0_50px_rgba(0,229,160,0.4)] rounded-[2rem] group text-xl italic hover:scale-[1.02] active:scale-95 transition-all">
                    NEXT SCAN <ChevronRight className="w-7 h-7 ml-2 group-hover:translate-x-2 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-10 py-24 bg-[#111318] border border-white/5 rounded-[4rem] text-center px-12 group overflow-hidden shadow-inner-glow relative">
               <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-primary/5 rounded-full blur-[80px] pointer-events-none" />
              <div className="relative">
                 <ScanLine className="w-20 h-20 text-primary opacity-40 animate-pulse relative" />
              </div>
              <div className="space-y-4">
                <p className="text-base font-black tracking-[0.4em] text-white uppercase italic drop-shadow-glow">Terminal Armed</p>
                <p className="text-[12px] text-white/20 tracking-[0.25em] leading-relaxed max-w-[240px] mx-auto uppercase">Lens Discovery Active</p>
              </div>
            </div>
          )}

          {history.length > 0 && !scannedData && (
            <div className="bg-white/5 border border-white/5 rounded-[3rem] p-8 shadow-inner-glow">
              <div className="flex items-center gap-3 mb-6 text-white/20 text-[10px] font-black uppercase tracking-[0.3em]">
                <History className="w-4 h-4 shadow-glow" /> SCAN LOG
              </div>
              <div className="space-y-4">
                {history.map((entry, i) => (
                  <div key={i} className="flex justify-between items-center text-[12px] font-bold opacity-30 hover:opacity-100 transition-all duration-300 group cursor-default">
                    <span className="truncate max-w-[180px] group-hover:text-primary transition-colors">{entry.name}</span>
                    <span className="font-mono text-[10px] tracking-tighter bg-white/5 px-2 py-0.5 rounded-md">{new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ScannerPage;
