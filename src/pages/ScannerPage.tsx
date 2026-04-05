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
import jsQR from "jsqr";
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
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>();
  const navigate = useNavigate();

  // Load history from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('mkt-scanner-history');
    if (saved) setHistory(JSON.parse(saved));
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, []);

  const addToHistory = (id: string, name: string) => {
    const newEntry = { id, name, time: Date.now() };
    const updated = [newEntry, ...history.slice(0, 9)];
    setHistory(updated);
    localStorage.setItem('mkt-scanner-history', JSON.stringify(updated));
  };

  const stopScanner = useCallback(() => {
    if (requestRef.current) cancelAnimationFrame(requestRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
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
      toast.success("Locked Successfully");
      if (navigator.vibrate) navigator.vibrate(50);
    } catch {
      toast.error("Error Updating Database");
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
        toast.success(`Found: ${data.name}`);
        if (navigator.vibrate) navigator.vibrate([30, 10, 30]);
      } else {
        setError(`Unknown Participant ID: ${id}`);
        setScannedData(null);
        setStatus("ERROR");
        setTimeout(() => { setLastScannedId(null); setStatus("ACTIVE"); }, 3000);
      }
    } catch {
      setError("Database Offline");
      setStatus("ERROR");
      setTimeout(() => { setLastScannedId(null); setStatus("ACTIVE"); }, 3000);
    } finally {
      setLoading(false);
    }
  }, [lastScannedId, loading, history]);

  const scanFrame = useCallback(async () => {
    if (!videoRef.current || !canvasRef.current || !scanning) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });

    if (video.readyState === video.HAVE_ENOUGH_DATA && ctx) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      let detectedText: string | null = null;
      // @ts-ignore
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const barcodeDetector = new BarcodeDetector({ formats: ['qr_code', 'code_128'] });
          const barcodes = await barcodeDetector.detect(canvas);
          if (barcodes.length > 0) detectedText = barcodes[0].rawValue;
        } catch {}
      }

      if (!detectedText) {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height, { inversionAttempts: "dontInvert" });
        if (code) detectedText = code.data;
      }

      if (detectedText) fetchRegistration(detectedText);
    }
    if (scanning) requestRef.current = requestAnimationFrame(scanFrame);
  }, [scanning, fetchRegistration]);

  useEffect(() => {
    if (scanning) {
      const initCamera = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false
          });

          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            try {
              await videoRef.current.play();
              setCameraReady(true);
              setStatus("ACTIVE");
              requestRef.current = requestAnimationFrame(scanFrame);
            } catch (pErr) {
              setCameraReady(true);
              setStatus("ACTIVE");
              requestRef.current = requestAnimationFrame(scanFrame);
            }
          }
        } catch (err: any) {
          setError(err.name === 'NotAllowedError' ? "Permission Denied" : "Hardware failure");
          setScanning(false);
          setStatus("ERROR");
          toast.error("Check Camera Permissions");
        }
      };
      initCamera();
    }
  }, [scanning, scanFrame]);

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
    if (scannerLogin(pin)) toast.success("Verified");
    else toast.error("Invalid PIN");
  };

  if (!scannerAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0c0f] p-4">
        <Card className="max-w-sm w-full bg-[#111318] border-white/5 shadow-2xl">
          <CardContent className="pt-8">
            <Zap className="w-12 h-12 text-primary mx-auto mb-6" />
            <h2 className="text-xl font-bold text-center text-white mb-6 uppercase tracking-tighter">Event Terminal</h2>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="password" placeholder="PIN" value={pin} onChange={(e) => setPin(e.target.value)} autoFocus className="text-center text-2xl h-14 bg-white/5 border-white/10" />
              <Button type="submit" className="w-full h-14 font-black uppercase text-lg">Launch Scanner</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0c0f] text-white overflow-x-hidden">
      <div className="sticky top-0 z-50 bg-[#111318]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => { stopScanner(); navigate("/admin"); }}>
          <ArrowLeft className="w-4 h-4 mr-2" /> EXIT
        </Button>
        <div className={`flex items-center gap-2 px-3 py-1 rounded-full border text-[10px] font-black tracking-[0.2em] uppercase ${
          status === "ACTIVE" ? "border-primary/50 text-primary" : status === "SUCCESS" ? "border-green-500 text-green-500" : "border-white/10 text-white/40"
        }`}>
          <div className={`w-1.5 h-1.5 rounded-full bg-current ${status === "ACTIVE"?"animate-pulse":""}`} />
          {status}
        </div>
        <div className="flex gap-2">
          {scanning ? (
            <Button variant="destructive" size="sm" onClick={stopScanner} className="h-8">STOP</Button>
          ) : (
            <Button size="sm" onClick={startScanner} className="h-8 bg-primary text-black font-bold">START</Button>
          )}
        </div>
      </div>

      <div className="max-w-xl mx-auto p-4 space-y-6 pb-24">
        <div className="relative rounded-[2.5rem] overflow-hidden bg-black aspect-square border-[6px] border-white/5 shadow-2xl">
          <video ref={videoRef} className="w-full h-full object-cover" muted playsInline />
          <canvas ref={canvasRef} className="hidden" />
          
          {scanning && !scannedData && (
            <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
              <div className="w-64 h-64 border-2 border-primary/30 rounded-[2rem] relative overflow-hidden">
                <div className="absolute inset-x-4 top-0 h-[2px] bg-primary animate-scan-line shadow-[0_0_15px_#00e5a0]" />
              </div>
            </div>
          )}

          {scanning && !cameraReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#0a0c0f] gap-4 z-20">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-white/40">Opening Iris...</p>
            </div>
          )}
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 flex items-center gap-3 text-red-500 animate-in slide-in-from-top">
            <X className="w-5 h-5 shrink-0" /> <p className="text-xs font-bold uppercase flex-1 text-center">{error}</p>
            <Button size="sm" variant="ghost" onClick={startScanner} className="font-black h-8">Retry</Button>
          </div>
        )}

        <div className="space-y-4">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-6 py-20 bg-white/5 border border-white/10 rounded-[3rem]">
              <Loader2 className="w-10 h-10 animate-spin text-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest opacity-40">Syncing Record...</p>
            </div>
          ) : scannedData ? (
            <Card className="bg-[#111318] border-2 border-primary/20 shadow-2xl rounded-[2.5rem] overflow-hidden animate-in zoom-in-95 duration-500">
              <CardContent className="p-0">
                <div className={`px-6 py-3 text-[10px] font-black tracking-[0.25em] uppercase flex items-center justify-between ${scannedData.track.toLowerCase().includes("sw") ? "bg-blue-600" : "bg-rose-600"} text-white`}>
                  <div className="flex items-center gap-2"><CheckCircle2 className="w-3.5 h-3.5" /> Verified</div>
                  <span className="opacity-60 font-mono">#{scannedData.id.slice(-6)}</span>
                </div>

                <div className="p-6">
                  <div className="flex gap-5 items-start">
                    <div className="w-24 h-32 rounded-2xl overflow-hidden shadow-lg border border-white/10 flex-shrink-0">
                      <img src={scannedData.photo} alt={scannedData.name} className="w-full h-full object-cover" crossOrigin="anonymous" />
                    </div>
                    <div className="flex-1 min-w-0 pt-1">
                      <div className="mb-4">
                        <p className="text-[9px] font-black text-white/50 uppercase mb-1 tracking-tighter">Participant</p>
                        <h4 className="font-display font-black text-xl text-white leading-tight uppercase break-words line-clamp-2">
                          {scannedData.name}
                        </h4>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-white/50 uppercase mb-0.5 tracking-tighter line-clamp-1">TEAM: {scannedData.teamName}</p>
                        </div>
                        <div className="min-w-0">
                          <p className="text-[9px] font-black text-white/50 uppercase mb-0.5 tracking-tighter line-clamp-1">ROLE: {scannedData.track}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-6 pt-4 border-t border-white/5">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="secondary" size="sm" className="w-full h-10 text-[10px] font-black uppercase bg-white/10 hover:bg-white/20 border-white/5 rounded-2xl text-white">
                          <Info className="w-4 h-4 mr-2" /> View Extended Metadata
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-sm rounded-[2rem] bg-[#111318] border-white/10 text-white">
                        <DialogHeader><DialogTitle className="uppercase font-bold tracking-tight">Record View</DialogTitle></DialogHeader>
                        <div className="space-y-4 pt-6 text-[11px] font-mono opacity-80">
                          <p className="border-b border-white/5 pb-2">ID: {scannedData.id}</p>
                          <p className="border-b border-white/5 pb-2">ORG: {scannedData.collegeName}</p>
                          <p>SYNC: {new Date(scannedData.registeredAt).toLocaleString()}</p>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>

                <div className="bg-black/40 px-6 py-6 flex flex-col gap-6 border-t border-white/5">
                  <div>
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <CalendarCheck2 className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-white/40 uppercase">Attendance Tracking</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {['Attendance_1', 'Attendance_2', 'Attendance_3'].map((key) => {
                        const isLocked = scannedData.actions?.[key] || false;
                        return (
                          <Button key={key} variant="outline" size="sm" disabled={isLocked} className={`h-10 px-5 rounded-xl border-white/10 font-bold transition-all text-[10px] ${isLocked ? 'bg-primary text-black border-primary opacity-100' : 'text-white/60 hover:bg-white/5'}`} onClick={() => toggleAction(key)}>
                            {isLocked && <Lock className="w-3 h-3 mr-1" />} {key.replace('_',' ')}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2 mb-4 px-1">
                      <Utensils className="w-4 h-4 text-primary" />
                      <span className="text-[10px] font-black text-white/40 uppercase">Catering Fulfillment</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { id: 'day_1_lunch', label: 'D1 LUNCH' },
                        { id: 'day_1_dinner', label: 'D1 DINNER' },
                        { id: 'day_2_breakfast', label: 'D2 B-FAST' },
                        { id: 'day_2_lunch', label: 'D2 LUNCH' }
                      ].map((meal) => {
                        const isLocked = scannedData.actions?.[meal.id] || false;
                        return (
                          <Button key={meal.id} variant="outline" size="sm" disabled={isLocked} className={`h-12 justify-start px-5 rounded-xl border-white/10 font-bold transition-all text-[10px] ${isLocked ? 'bg-blue-600 text-white border-blue-600 opacity-100' : 'text-white/60 hover:bg-white/5'}`} onClick={() => toggleAction(meal.id)}>
                            <div className={`w-1.5 h-1.5 rounded-full mr-3 ${isLocked ? "bg-white" : "bg-primary/40"}`} />
                            {meal.label} {isLocked && <Lock className="ml-auto w-3 h-3 opacity-40" />}
                          </Button>
                        );
                      })}
                    </div>
                  </div>

                  <Button onClick={clearScan} className="w-full h-16 bg-primary text-black font-black uppercase tracking-[0.25em] mt-2 shadow-[0_0_30px_rgba(0,229,160,0.3)] rounded-2xl group text-lg italic">
                    NEXT SCAN <ChevronRight className="w-6 h-6 ml-1 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col items-center justify-center gap-8 py-20 bg-white/5 border border-white/10 rounded-[4rem] text-center px-12 group overflow-hidden">
              <ScanLine className="w-16 h-16 text-primary opacity-30 animate-pulse" />
              <div>
                <p className="text-sm font-black tracking-[0.3em] text-white uppercase italic">Zero Latency Active</p>
                <p className="text-[10px] text-white/30 leading-relaxed max-w-[200px] mx-auto uppercase">Scanning at 60Hz ⚡</p>
              </div>
            </div>
          )}

          {history.length > 0 && !scannedData && (
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-6">
              <div className="flex items-center gap-2 mb-4 text-white/20 text-[10px] font-black uppercase">
                <History className="w-4 h-4" /> Recent Activities
              </div>
              <div className="space-y-3">
                {history.map((entry, i) => (
                  <div key={i} className="flex justify-between text-[11px] font-bold opacity-30 hover:opacity-100 transition-opacity">
                    <span className="truncate max-w-[150px]">{entry.name}</span>
                    <span>{new Date(entry.time).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
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
