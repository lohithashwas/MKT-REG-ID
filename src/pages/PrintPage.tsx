import { useState, useEffect, useRef } from "react";
import { ref, onValue, update, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { ArrowLeft, Printer, Download, Edit2, Check, X, Shield, Palette } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAdminAuth } from "@/contexts/AdminAuthContext";
import TemplatePreviewCard from "@/components/template-editor/TemplatePreviewCard";
import { TemplateConfig, DEFAULT_ELEMENTS, CARD_WIDTH, CARD_HEIGHT } from "@/types/template";
import html2canvas from "html2canvas-pro";
import { jsPDF } from "jspdf";

interface Registration {
  id: string;
  name: string;
  teamName: string;
  collegeName: string;
  track: string;
  photo: string;
  registeredAt: string;
}

const CARDS_PER_ROW = 3;

const A4_W = 210;
const A4_H = 297;

const PrintPage = () => {
  const { authenticated, login } = useAdminAuth();
  const [pin, setPin] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Registration>>({});
  const [generating, setGenerating] = useState(false);
  const [templateConfig, setTemplateConfig] = useState<TemplateConfig | null>(null);
  const printRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authenticated) return;
    get(ref(database, "templateConfig")).then((snap) => {
      if (snap.exists()) setTemplateConfig(snap.val() as TemplateConfig);
    });
    const regRef = ref(database, "registrations");
    const unsub = onValue(regRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({
          id,
          ...(val as Omit<Registration, "id">),
        }));
        setRegistrations(list);
      } else {
        setRegistrations([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!login(pin)) {
      toast.error("Invalid PIN");
    }
  };

  const startEdit = (r: Registration) => {
    setEditingId(r.id);
    setEditData({ name: r.name, teamName: r.teamName, collegeName: r.collegeName, track: r.track });
  };

  const saveEdit = async () => {
    if (!editingId) return;
    try {
      const regRef = ref(database, `registrations/${editingId}`);
      await update(regRef, editData);
      toast.success("Updated successfully");
      setEditingId(null);
    } catch {
      toast.error("Failed to update");
    }
  };

  const generatePDF = async () => {
    if (!printRef.current) return;
    setGenerating(true);
    try {
      const pages = printRef.current.querySelectorAll(".a4-page");
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
      for (let i = 0; i < pages.length; i++) {
        const page = pages[i] as HTMLElement;
        const canvas = await html2canvas(page, {
          scale: 5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: "#ffffff",
        });
        const imgData = canvas.toDataURL("image/png");
        if (i > 0) pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, 0, A4_W, A4_H);
      }
      pdf.save("id-cards.pdf");
      toast.success("PDF downloaded!");
    } catch (err) {
      console.error(err);
      toast.error("Failed to generate PDF");
    } finally {
      setGenerating(false);
    }
  };

  const cw = templateConfig?.cardWidth || CARD_WIDTH;
  const ch = templateConfig?.cardHeight || CARD_HEIGHT;
  const s = ((A4_W / CARDS_PER_ROW) * 3.7795) / cw; 
  const realW_mm = A4_W / CARDS_PER_ROW; 
  const realH_mm = (ch * s) / 3.7795;
  const CARDS_PER_COL = Math.floor(A4_H / realH_mm);
  const CARDS_PER_PAGE = CARDS_PER_ROW * CARDS_PER_COL;

  const pages: Registration[][] = [];
  for (let i = 0; i < registrations.length; i += CARDS_PER_PAGE) {
    pages.push(registrations.slice(i, i + CARDS_PER_PAGE));
  }

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-sm w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold">Print Access</h2>
            </div>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="password" placeholder="Enter admin PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
              <Button type="submit" className="w-full">Unlock</Button>
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
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Button>
          <span className="text-sm text-muted-foreground">
            {registrations.length} cards · {pages.length} page{pages.length !== 1 ? "s" : ""}
          </span>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/template-editor")}>
            <Palette className="w-4 h-4 mr-1" /> Edit Template
          </Button>
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="w-4 h-4 mr-1" /> Print
          </Button>
          <Button size="sm" onClick={generatePDF} disabled={generating || registrations.length === 0}>
            <Download className="w-4 h-4 mr-1" /> {generating ? "Generating..." : "Download PDF"}
          </Button>
        </div>
      </div>

      {loading ? (
        <p className="text-center text-muted-foreground py-12">Loading...</p>
      ) : registrations.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No registrations found.</p>
      ) : (
        <>
          <div className="p-4 max-w-6xl mx-auto no-print">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
              Edit Registrations (click edit to modify before printing)
            </h3>
            <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
              {registrations.map((r) => (
                <Card key={r.id} className="glass-card">
                  <CardContent className="p-3">
                    {editingId === r.id ? (
                      <div className="space-y-2">
                        <Input value={editData.name || ""} onChange={(e) => setEditData({ ...editData, name: e.target.value })} placeholder="Name" className="h-8 text-sm" />
                        <Input value={editData.teamName || ""} onChange={(e) => setEditData({ ...editData, teamName: e.target.value })} placeholder="Team Name" className="h-8 text-sm" />
                        <Input value={editData.collegeName || ""} onChange={(e) => setEditData({ ...editData, collegeName: e.target.value })} placeholder="College" className="h-8 text-sm" />
                        <select value={editData.track || ""} onChange={(e) => setEditData({ ...editData, track: e.target.value })} className="w-full h-8 text-sm border border-input rounded-md px-2 bg-background">
                          <option value="SW Track">SW Track</option>
                          <option value="HW Track">HW Track</option>
                        </select>
                        <div className="flex gap-2">
                          <Button size="sm" className="h-7 text-xs" onClick={saveEdit}><Check className="w-3 h-3 mr-1" /> Save</Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => setEditingId(null)}><X className="w-3 h-3 mr-1" /> Cancel</Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between">
                        <div className="min-w-0">
                          <p className="font-semibold text-sm truncate">{r.name}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.teamName} · {r.collegeName}</p>
                          <span className={`text-xs px-2 py-0.5 rounded-full ${r.track.includes("SW") ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"}`}>{r.track}</span>
                        </div>
                        <Button size="sm" variant="ghost" className="h-7" onClick={() => startEdit(r)}><Edit2 className="w-3 h-3" /></Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <div className="py-8 flex flex-col items-center gap-8 print-area" ref={printRef}>
            {pages.map((pageCards, pageIdx) => {
              return (
                <div
                  key={pageIdx}
                  className="a4-page bg-white"
                  style={{
                    width: `${A4_W}mm`,
                    height: `${A4_H}mm`,
                    display: "grid",
                    gridTemplateColumns: `repeat(${CARDS_PER_ROW}, ${realW_mm}mm)`,
                    gridTemplateRows: `repeat(${CARDS_PER_COL}, ${realH_mm}mm)`,
                    alignContent: "flex-start",
                    justifyContent: "flex-start",
                    gap: 0,
                    margin: 0,
                    padding: 0,
                    overflow: "hidden",
                    border: "none",
                  }}
                >
                  {pageCards.map((r) => (
                    <div key={r.id} style={{ width: `${realW_mm}mm`, height: `${realH_mm}mm`, overflow: "hidden", padding: 0, margin: 0, border: "none" }}>
                      <div style={{ transform: `scale(${s})`, transformOrigin: "top left", width: `${cw}px`, height: `${ch}px` }}>
                        <TemplatePreviewCard
                          elements={templateConfig?.elements || DEFAULT_ELEMENTS}
                          backgroundColor={templateConfig?.backgroundColor || "#e8ecf1"}
                          backgroundImage={templateConfig?.background}
                          cardWidth={cw}
                          cardHeight={ch}
                          data={{ id: r.id, name: r.name, teamName: r.teamName, collegeName: r.collegeName, track: r.track, photo: r.photo }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        </>
      )}

      <style>{`
        @media print {
          .no-print, .sticky { display: none !important; }
          .print-area { padding: 0 !important; }
          .a4-page { box-shadow: none !important; page-break-after: always; margin: 0 !important; }
          body { margin: 0; padding: 0; }
          @page { size: A4; margin: 0; }
        }
      `}</style>
    </div>
  );
};

export default PrintPage;
