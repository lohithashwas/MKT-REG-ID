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
  ZapOff,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import QrScanner from "qr-scanner"; // Nimiq Engine
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Slider } from "@/components/ui/slider";

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
  
  // Hardware Status
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [maxZoom, setMaxZoom] = useState(1);

  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerInstanceRef = useRef<QrScanner | null>(null);
  const navigate = useNavigate();

  const clearScan = useCallback(() => {
    setScannedData(null);
    setLastScannedId(null);
    setStatus("ACTIVE");
    setError(null);
  }, []);

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mkt-scanner-history-v3');
    if (saved) setHistory(JSON.parse(saved));
  }, []);

  const addToHistory = (id: string, name: string) => {
    const newEntry = { id, name, time: Date.now() };
    const updated = [newEntry, ...history.slice(0, 9)];
    setHistory(updated);
    localStorage.setItem('mkt-scanner-history-v3', JSON.stringify(updated));
  };

  const stopScanner = useCallback(async () => {
    if (scannerInstanceRef.current) {
        scannerInstanceRef.current.destroy();
        scannerInstanceRef.current = null;
    }
    setScanning(false);
    setCameraReady(false);
    setStatus("READY");
    setTorchOn(false);
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
    // Debounce: 1500ms 🛡️
    if (id === lastScannedId || loading) return;
    setLastScannedId(id);
    setLoading(true);
    setStatus("SUCCESS");
    
    // Haptic Success Pattern: [40, 20, 40] ⚡
    if (navigator.vibrate) navigator.vibrate([40, 20, 40]);

    try {
      const snap = await get(ref(database, `registrations/${id}`));
      if (snap.exists()) {
        const data = snap.val() as Omit<Registration, "id">;
        setScannedData({ id, ...data });
        addToHistory(id, data.name);
        toast.success(`Verified: ${data.name}`);
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

  // PERIODIC REFOCUS Strategy (Every 4s) 👁️
  useEffect(() => {
    if (!scanning || !cameraReady) return;
    const interval = setInterval(async () => {
        try {
            const track = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
            if (track) {
                const caps = track.getCapabilities();
                // @ts-ignore
                if (caps.focusMode?.includes('continuous')) {
                   // @ts-ignore
                   await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
                }
            }
        } catch (e) {}
    }, 4000);
    return () => clearInterval(interval);
  }, [scanning, cameraReady]);

  useEffect(() => {
    if (scanning && videoRef.current && !scannerInstanceRef.current) {
        const initScanner = async () => {
            try {
                // NIMIQ NATIVE V3.0 Core 🧠
                const scanner = new QrScanner(
                    videoRef.current!,
                    (result) => {
                        if (onScanSuccessRef.current) {
                            onScanSuccessRef.current(result.data);
                        }
                    },
                    {
                        preferredCamera: 'environment', // Primary lens
                        maxScansPerSecond: 25, // Optimized frame rate
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                        calculateScanRegion: (v) => {
                           // ULTIMATE V3.0 Scan Region: Center 60% 📐
                           const minEdge = Math.min(v.videoWidth, v.videoHeight);
                           const s = minEdge * 0.6; 
                           return {
                              x: (v.videoWidth - s) / 2,
                              y: (v.videoHeight - s) / 2,
                              width: s,
                              height: s
                           };
                        },
                        // HARDWARE FORCE CONSTRAINTS 📽️
                        // @ts-ignore 
                        videoConstraints: {
                           facingMode: { ideal: "environment" },
                           width: { ideal: 1920 }, // 1080p Full HD
                           height: { ideal: 1080 },
                           frameRate: { ideal: 30, min: 15 },
                           // @ts-ignore 
                           focusMode: "continuous",
                           zoom: 1.0 // Lock to 1X
                        }
                    }
                );
                
                scannerInstanceRef.current = scanner;
                await scanner.start();
                
                // DETECT DEVICE CAPABILITIES 🔦🔍
                const track = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
                if (track) {
                    const caps = track.getCapabilities();
                    // @ts-ignore
                    setHasTorch(!!caps.torch);
                    // @ts-ignore
                    if (caps.zoom) setMaxZoom(caps.zoom.max);
                }

                setCameraReady(true);
                setStatus("ACTIVE");
            } catch (err: any) {
                console.error("V3.0 Init Error:", err);
                
                // RETRY LOOP (Relax Constraints) 🛡️
                try {
                   const fallbackScanner = new QrScanner(videoRef.current!, (res) => onScanSuccessRef.current?.(res.data), {
                       preferredCamera: 'environment',
                       videoConstraints: { facingMode: 'environment' }
                   });
                   scannerInstanceRef.current = fallbackScanner;
                   await fallbackScanner.start();
                   setCameraReady(true);
                   setStatus("ACTIVE");
                } catch (retryErr) {
                   setError(`HARDWARE BLOCK: ${err.message || 'Busy'}`);
                   setScanning(false);
                   setStatus("ERROR");
                   toast.error("Camera access failed.");
                }
            }
        };
        initScanner();
    }
    
    return () => {
        if (scannerInstanceRef.current) {
            scannerInstanceRef.current.destroy();
            scannerInstanceRef.current = null;
        }
    };
  }, [scanning]);

  const startScanner = () => {
    setScanning(true);
    setCameraReady(false);
    setError(null);
    setScannedData(null);
    setLastScannedId(null);
    setStatus("ACTIVE");
  };

  const handleTorch = async () => {
    if (!scannerInstanceRef.current || !hasTorch) return;
    try {
        const nextState = !torchOn;
        await scannerInstanceRef.current.setFlashOn(nextState);
        setTorchOn(nextState);
    } catch (e) {
        toast.error("Torch unavailable");
    }
  };

  const handleZoom = async (val: number[]) => {
    const track = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
    if (track) {
        try {
            await track.applyConstraints({ advanced: [{ zoom: val[0] }] } as any);
            setZoomLevel(val[0]);
        } catch (e) {}
    }
  };

  const handleTapToFocus = async () => {
    if (!cameraReady) return;
    try {
        const track = (videoRef.current?.srcObject as MediaStream)?.getVideoTracks()[0];
        if (track) {
             // Tap-to-Focus: Briefly switch to auto then back 👁️
            // @ts-ignore
            await track.applyConstraints({ advanced: [{ focusMode: 'auto' }] });
            setTimeout(async () => {
                // @ts-ignore
                await track.applyConstraints({ advanced: [{ focusMode: 'continuous' }] });
            }, 500);
        }
    } catch (e) {}
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
    <div className="min-h-screen bg-[#0a0c0f] text-white selection:bg-primary/20 overflow-hidden">
      {/* Tactical Header V3.0 */}
      <div className="fixed top-0 inset-x-0 z-50 bg-[#111318]/90 backdrop-blur-2xl border-b border-white/5 px-6 py-4 flex items-center justify-between">
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
            {status === "ACTIVE" ? "ARMED: 1080p 1X" : status}
          </div>
        </div>
        <div className="flex gap-2">
          {hasTorch && scanning && (
             <Button variant="ghost" size="icon" onClick={handleTorch} className={`rounded-xl border border-white/5 ${torchOn ? "text-primary bg-primary/10" : "text-white/30"}`}>
                {torchOn ? <Zap className="w-5 h-5" /> : <ZapOff className="w-5 h-5" />}
             </Button>
          )}
          {scanning ? (
            <Button variant="destructive" size="sm" onClick={stopScanner} className="h-10 px-6 font-black rounded-xl">STOP</Button>
          ) : (
            <Button size="sm" onClick={startScanner} className="h-10 px-6 bg-primary text-black font-black rounded-xl shadow-glow active:scale-95 transition-all">START</Button>
          )}
        </div>
      </div>

      {/* Main Viewport V3.0 */}
      <div className="relative w-full h-[100vh] bg-black">
        {/* Pro Camera Lens - FULLSCREEN */}
        <div className="absolute inset-0 z-0 bg-black flex items-center justify-center overflow-hidden">
           <video 
              ref={videoRef} 
              onClick={handleTapToFocus}
              className="min-w-full min-h-full object-cover scale-[1.01]" 
           />
           
           {/* Center 60% Scan Region Overlay 📐 */}
           {scanning && cameraReady && !scannedData && (
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                 {/* Dark Mask */}
                 <div className="absolute inset-0 bg-black/40" style={{
                    maskImage: 'radial-gradient(transparent 65%, black 66%)',
                    WebkitMaskImage: 'radial-gradient(transparent 65%, black 66%)'
                 }} />
                 
                 {/* Corners */}
                 <div className="w-[60vw] h-[60vw] max-w-[280px] max-h-[280px] border-2 border-primary/20 rounded-[3rem] relative shadow-[0_0_0_2000px_rgba(0,0,0,0.4)]">
                    <div className="absolute -top-1 -left-1 w-12 h-12 border-t-[5px] border-l-[5px] border-primary rounded-tl-[1.8rem] shadow-glow" />
                    <div className="absolute -top-1 -right-1 w-12 h-12 border-t-[5px] border-r-[5px] border-primary rounded-tr-[1.8rem] shadow-glow" />
                    <div className="absolute -bottom-1 -left-1 w-12 h-12 border-b-[5px] border-l-[5px] border-primary rounded-bl-[1.8rem] shadow-glow" />
                    <div className="absolute -bottom-1 -right-1 w-12 h-12 border-b-[5px] border-r-[5px] border-primary rounded-br-[1.8rem] shadow-glow" />
                    
                    {/* Scan Line Animation */}
                    <div className="absolute inset-x-8 top-0 h-[2px] bg-primary animate-scan-line shadow-[0_0_20px_#00e5a0] opacity-60" />
                 </div>
                 
                 {/* Precision Tooltip */}
                 <div className="absolute bottom-[12vh] px-6 py-2.5 bg-black/80 backdrop-blur-xl border border-white/10 rounded-full flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    <span className="text-[10px] font-black uppercase tracking-[0.15em] text-white/50">Align QR Code to Center</span>
                 </div>
              </div>
           )}

           {/* Zoom Control Slider 🔍 */}
           {scanning && cameraReady && maxZoom > 1 && (
              <div className="absolute bottom-[24vh] left-1/2 -translate-x-1/2 w-48 px-4 py-6 bg-black/60 backdrop-blur-xl border border-white/5 rounded-3xl flex flex-col items-center gap-4 z-40">
                 <div className="flex justify-between w-full text-[9px] font-black uppercase text-white/30 tracking-widest">
                    <span>1X</span>
                    <span>ZOOM: {zoomLevel.toFixed(1)}X</span>
                    <span>{maxZoom.toFixed(1)}X</span>
                 </div>
                 <Slider 
                    value={[zoomLevel]} 
                    min={1} 
                    max={maxZoom} 
                    step={0.1} 
                    onValueChange={handleZoom}
                    className="w-full"
                 />
              </div>
           )}
        </div>

        {/* Loading / Offline Overlays */}
        {scanning && !cameraReady && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c0f] gap-6 z-20 text-center p-8">
            <Loader2 className="w-14 h-14 animate-spin text-primary" />
            <div className="space-y-1">
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Nimiq Native V3.0</p>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/10 italic">Initializing Full HD Pipeline...</p>
            </div>
          </div>
        )}
        
        {!scanning && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-10 bg-[#0a0c0f]/80 backdrop-blur-sm">
             <div className="w-24 h-24 rounded-full border border-white/5 flex items-center justify-center bg-white/5">
                <CameraOff className="w-10 h-10 text-white/20" />
             </div>
             <p className="text-[11px] font-black uppercase tracking-[0.4em] text-white/20">Terminal Offline</p>
             <Button onClick={startScanner} variant="outline" className="h-14 px-10 border-primary/20 text-primary hover:bg-primary/10 rounded-2xl font-black uppercase text-[10px] tracking-[0.25em]">Initialize Link</Button>
          </div>
        )}

        {error && (
          <div className="absolute inset-x-4 top-24 z-50 bg-red-500/10 backdrop-blur-2xl border-2 border-red-500/20 rounded-[2.5rem] p-10 flex flex-col items-center gap-6 text-red-500 animate-in slide-in-from-top duration-500">
            <X className="w-12 h-12 shrink-0 bg-red-500/20 rounded-full p-2" />
            <div className="text-center space-y-2">
                <p className="text-xs font-black uppercase tracking-[0.2em]">{error.split(':')[0]}</p>
                <p className="text-[10px] font-mono opacity-60 break-all">{error.split(':')[1] || 'Hardware Busy'}</p>
            </div>
            <Button size="sm" variant="outline" onClick={startScanner} className="w-full h-14 border-red-500/30 text-red-500 hover:bg-red-500/10 uppercase font-black text-[11px] tracking-widest rounded-2xl">
               RETRY CONNECTION
            </Button>
          </div>
        )}
      </div>

      {/* VERIFICATION BOTTOM SHEET (V3.0 Logic) 📑 */}
      {scannedData && (
        <div className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none p-4">
           {/* Backdrop to clear background distractions */}
           <div className="absolute inset-0 bg-black/60 backdrop-blur-sm pointer-events-auto" onClick={clearScan} />
           
           <Card className="max-w-md w-full bg-[#111318] border-2 border-primary/40 shadow-[0_0_100px_-20px_rgba(0,229,160,0.4)] rounded-[3.5rem] overflow-hidden pointer-events-auto animate-in slide-in-from-bottom-[100%] duration-500">
              <CardContent className="p-0">
                <div className={`px-8 py-5 text-[11px] font-black tracking-[0.3em] uppercase flex items-center justify-between ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-600" : "bg-rose-600"} text-white shadow-2xl`}>
                  <div className="flex items-center gap-2.5">
                    <CheckCircle2 className="w-4.5 h-4.5 shadow-glow" /> PARTICIPANT VERIFIED
                  </div>
                  <span className="opacity-70 font-mono text-[10px]">VER: 3.0-NATIVE</span>
                </div>

                <div className="p-10">
                  <div className="flex gap-8 items-start mb-8">
                    <div className="w-32 h-40 rounded-[2.5rem] overflow-hidden shadow-2xl border-[4px] border-white/5 flex-shrink-0">
                      <img src={scannedData.photo} alt={scannedData.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                    <div className="flex-1 min-w-0 pt-2">
                       <div className="mb-6">
                          <p className="text-[10px] font-black text-white/30 uppercase mb-2 tracking-widest">Full Name</p>
                          <h4 className="font-display font-black text-3xl text-white leading-[1.05] uppercase break-words tracking-tight">
                             {scannedData.name}
                          </h4>
                       </div>
                       <div className="space-y-4 font-black text-[11px] text-white/60 uppercase tracking-wider">
                          <div className="flex items-center gap-3">
                             <Users className="w-3.5 h-3.5 opacity-40" /> {scannedData.teamName}
                          </div>
                          <div className="flex items-center gap-3">
                             <Tag className="w-3.5 h-3.5 opacity-40" /> {scannedData.track}
                          </div>
                       </div>
                    </div>
                  </div>
                  
                  {/* Action Terminal */}
                  <div className="space-y-8 pt-8 border-t border-white/5">
                     <div className="grid grid-cols-2 gap-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="secondary" className="h-16 rounded-3xl bg-white/5 border border-white/5 text-[10px] font-black uppercase tracking-widest text-white/40 hover:bg-white/10">
                               <Info className="w-4 h-4 mr-3 opacity-40" /> AUDIT TRAIL
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-sm rounded-[3.5rem] bg-[#0d0f14] border-white/10 text-white p-10">
                            <DialogHeader><DialogTitle className="uppercase font-black text-2xl mb-6">Security Log</DialogTitle></DialogHeader>
                            <div className="space-y-6 text-[12px] font-mono opacity-80 leading-relaxed">
                              <p>UID: {scannedData.id}</p>
                              <p>COLLEGE: {scannedData.collegeName}</p>
                              <p>REGISTERED: {new Date(scannedData.registeredAt).toLocaleString()}</p>
                              <p>PROTOCOL: Hardware-Force 720p</p>
                            </div>
                          </DialogContent>
                        </Dialog>
                        
                        <Button onClick={clearScan} className="h-16 bg-white text-black font-black uppercase text-[10px] tracking-[0.3em] rounded-3xl hover:bg-white/90">
                           DISMISS
                        </Button>
                     </div>

                     <div className="space-y-8">
                        <div>
                          <div className="flex items-center gap-2.5 mb-5 px-1">
                            <CalendarCheck2 className="w-4.5 h-4.5 text-primary shadow-glow" />
                            <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Attendance Locks</span>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            {['Attendance_1', 'Attendance_2', 'Attendance_3'].map((key) => {
                              const isLocked = scannedData.actions?.[key] || false;
                              return (
                                <Button key={key} variant="outline" disabled={isLocked} className={`h-11 rounded-2xl border-white/10 font-black text-[10px] transition-all ${isLocked ? 'bg-primary text-black border-primary shadow-glow italic' : 'bg-white/5 text-white/60 hover:bg-white/10'}`} onClick={() => toggleAction(key)}>
                                  {isLocked ? <Lock className="w-3.5 h-3.5" /> : key.split('_')[1]}
                                </Button>
                              );
                            })}
                          </div>
                        </div>

                        <div>
                          <div className="flex items-center gap-2.5 mb-5 px-1">
                            <Utensils className="w-4.5 h-4.5 text-primary shadow-glow" />
                            <span className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em]">Meal Vouchers</span>
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
                                <Button key={meal.id} variant="outline" disabled={isLocked} className={`h-14 justify-start px-6 rounded-2xl border-white/10 font-black text-[10px] tracking-widest ${isLocked ? 'bg-blue-600 text-white border-blue-600 shadow-glow' : 'bg-white/5 text-white/60 hover:bg-white/10'}`} onClick={() => toggleAction(meal.id)}>
                                  <div className={`w-1.5 h-1.5 rounded-full mr-4 ${isLocked ? "bg-white" : "bg-primary/40"}`} />
                                  {meal.label} {isLocked && <Lock className="ml-auto w-3.5 h-3.5 opacity-40" />}
                                </Button>
                              );
                            })}
                          </div>
                        </div>
                     </div>

                     <Button onClick={clearScan} className="w-full h-24 bg-primary text-black font-black uppercase tracking-[0.4em] mt-4 shadow-[0_0_60px_rgba(0,229,160,0.5)] rounded-[2.5rem] group text-2xl italic hover:scale-[1.02] active:scale-95 transition-all">
                       NEXT SCAN <ChevronRight className="w-8 h-8 ml-2 group-hover:translate-x-2 transition-transform" />
                     </Button>
                  </div>
                </div>
              </CardContent>
           </Card>
        </div>
      )}

      {/* Side Log (V3.0) */}
      {history.length > 0 && !scannedData && !error && (
        <div className="fixed bottom-12 right-6 z-40">
           <Dialog>
              <DialogTrigger asChild>
                 <Button className="w-16 h-16 rounded-3xl bg-black/80 backdrop-blur-2xl border border-white/10 shadow-2xl text-white/40 hover:text-primary transition-all">
                    <History className="w-6 h-6" />
                 </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md bg-[#0d0f14] border-white/5 text-white rounded-[3.5rem] p-10">
                 <DialogHeader><DialogTitle className="uppercase font-black text-2xl mb-8">Scan Log</DialogTitle></DialogHeader>
                 <div className="space-y-5">
                    {history.map((entry, i) => (
                      <div key={i} className="flex justify-between items-center p-4 bg-white/5 rounded-2xl border border-white/5">
                        <div className="min-w-0 flex-1">
                           <p className="text-[12px] font-black text-white uppercase truncate">{entry.name}</p>
                           <p className="text-[10px] font-mono text-white/30 mt-1 uppercase tracking-tighter">ID: {entry.id.slice(-6)}</p>
                        </div>
                        <span className="text-[10px] font-mono text-primary bg-primary/10 px-2 py-0.5 rounded-md ml-4 shrink-0">
                           {new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    ))}
                 </div>
              </DialogContent>
           </Dialog>
        </div>
      )}
    </div>
  );
};

export default ScannerPage;
