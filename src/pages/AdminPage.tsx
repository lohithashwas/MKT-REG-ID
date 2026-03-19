import { useState, useEffect } from "react";
import { ref, onValue } from "firebase/database";
import { database } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Download, Search, Users, Shield, ArrowLeft, Printer } from "lucide-react";
import { useNavigate } from "react-router-dom";
import * as XLSX from "xlsx";

interface Registration {
  id: string;
  name: string;
  teamName: string;
  collegeName: string;
  track: string;
  photo: string;
  registeredAt: string;
}

const ADMIN_PIN = "admin2024";

const AdminPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const [registrations, setRegistrations] = useState<Registration[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (!authenticated) return;
    const regRef = ref(database, "registrations");
    const unsub = onValue(regRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        const list = Object.entries(data).map(([id, val]) => ({
          id,
          ...(val as Omit<Registration, "id">),
        }));
        setRegistrations(list.reverse());
      } else {
        setRegistrations([]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [authenticated]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
    } else {
      toast.error("Invalid PIN");
    }
  };

  const filtered = registrations.filter(
    (r) =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.teamName.toLowerCase().includes(search.toLowerCase()) ||
      r.collegeName.toLowerCase().includes(search.toLowerCase())
  );

  const downloadExcel = () => {
    const data = registrations.map((r, i) => ({
      "S.No": i + 1,
      Name: r.name,
      "Team Name": r.teamName,
      "College Name": r.collegeName,
      Track: r.track,
      "Registered At": new Date(r.registeredAt).toLocaleString(),
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [{ wch: 6 }, { wch: 25 }, { wch: 20 }, { wch: 30 }, { wch: 15 }, { wch: 22 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Registrations");
    XLSX.writeFile(wb, "registrations.xlsx");
    toast.success("Excel file downloaded!");
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-sm w-full">
          <CardHeader className="text-center">
            <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <CardTitle className="font-display text-xl">Admin Access</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <Input type="password" placeholder="Enter admin PIN" value={pin} onChange={(e) => setPin(e.target.value)} />
              <Button type="submit" className="w-full">Unlock</Button>
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate("/")}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back to Registration
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-display font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              <Users className="w-4 h-4 inline mr-1" />
              {registrations.length} registration{registrations.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => navigate("/")}>
              <ArrowLeft className="w-4 h-4 mr-1" /> Registration
            </Button>
            <Button variant="outline" onClick={() => navigate("/print")}>
              <Printer className="w-4 h-4 mr-1" /> Print ID Cards
            </Button>
            <Button onClick={downloadExcel} disabled={registrations.length === 0}>
              <Download className="w-4 h-4 mr-1" /> Download Excel
            </Button>
          </div>
        </div>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by name, team, or college..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {loading ? (
          <p className="text-center text-muted-foreground py-12">Loading...</p>
        ) : filtered.length === 0 ? (
          <p className="text-center text-muted-foreground py-12">No registrations found.</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <Card key={r.id} className="glass-card overflow-hidden">
                <CardContent className="p-4 flex gap-4">
                  <div className="w-20 h-24 rounded-lg overflow-hidden flex-shrink-0 border border-border">
                    <img src={r.photo} alt={r.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display font-semibold text-foreground truncate">{r.name}</h3>
                    <p className="text-sm text-muted-foreground truncate">🏢 {r.collegeName}</p>
                    <p className="text-sm text-muted-foreground truncate">👥 {r.teamName}</p>
                    <span className={`inline-block mt-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      r.track.includes("SW")
                        ? "bg-primary/10 text-primary"
                        : "bg-accent/10 text-accent"
                    }`}>
                      {r.track}
                    </span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
