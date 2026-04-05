import { useState } from "react";
import { ref, set } from "firebase/database";
import { database } from "@/lib/firebase";
import PhotoCapture from "@/components/PhotoCapture";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { CheckCircle, Loader2, UserPlus } from "lucide-react";

const tracks = ["Software (SW)", "Hardware (HW)"] as const;

const RegistrationPage = () => {
  const [name, setName] = useState("");
  const [teamName, setTeamName] = useState("");
  const [collegeName, setCollegeName] = useState("");
  const [track, setTrack] = useState<string>("");
  const [photo, setPhoto] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !teamName.trim() || !collegeName.trim() || !track || !photo) {
      toast.error("Please fill all fields and add a photo.");
      return;
    }

    setLoading(true);
    try {
      const shortId = Math.random().toString(36).substring(2, 8).toUpperCase();
      const registrationsRef = ref(database, `registrations/${shortId}`);
      
      await set(registrationsRef, {
        name: name.trim(),
        teamName: teamName.trim(),
        collegeName: collegeName.trim(),
        track,
        photo,
        registeredAt: new Date().toISOString(),
      });
      setSuccess(true);
      toast.success("Registration successful!");
    } catch (err) {
      console.error(err);
      toast.error("Registration failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-md w-full text-center">
          <CardContent className="pt-10 pb-10 flex flex-col items-center gap-4">
            <div className="w-20 h-20 rounded-full bg-success/10 flex items-center justify-center">
              <CheckCircle className="w-10 h-10 text-success" />
            </div>
            <h2 className="text-2xl font-display font-bold text-foreground">You're Registered!</h2>
            <p className="text-muted-foreground">Thank you, {name}. Your ID card details have been submitted.</p>
            <Button onClick={() => { setSuccess(false); setName(""); setTeamName(""); setCollegeName(""); setTrack(""); setPhoto(null); }}>
              Register Another
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center py-8 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-4 py-1.5 rounded-full text-sm font-medium mb-4">
            <UserPlus className="w-4 h-4" /> ID Card Registration
          </div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">
            Register for Your <span className="text-primary">ID Card</span>
          </h1>
          <p className="text-muted-foreground mt-2">Fill in your details and upload a photo</p>
        </div>

        <Card className="glass-card">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Photo Section */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Photo *</Label>
                <PhotoCapture onPhotoCropped={(url) => setPhoto(url || null)} croppedPhoto={photo} />
              </div>

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name">Full Name *</Label>
                <Input id="name" placeholder="Enter your full name" value={name} onChange={(e) => setName(e.target.value)} maxLength={100} />
              </div>

              {/* Team Name */}
              <div className="space-y-2">
                <Label htmlFor="team">Team Name *</Label>
                <Input id="team" placeholder="Enter your team name" value={teamName} onChange={(e) => setTeamName(e.target.value)} maxLength={100} />
              </div>

              {/* College Name */}
              <div className="space-y-2">
                <Label htmlFor="college">College Name *</Label>
                <Input id="college" placeholder="Enter your college name" value={collegeName} onChange={(e) => setCollegeName(e.target.value)} maxLength={200} />
              </div>

              {/* Track */}
              <div className="space-y-2">
                <Label>Track *</Label>
                <div className="flex gap-3">
                  {tracks.map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTrack(t)}
                      className={`flex-1 py-3 px-4 rounded-lg border-2 text-sm font-medium transition-all ${
                        track === t
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-card text-muted-foreground hover:border-primary/40"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading}>
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : null}
                {loading ? "Submitting..." : "Submit Registration"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RegistrationPage;
