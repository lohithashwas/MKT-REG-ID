import { useState, useCallback, useRef } from "react";
import { ref, set, get } from "firebase/database";
import { database } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  ArrowLeft,
  Save,
  Plus,
  LayoutTemplate,
  Image,
  Shield,
  Eye,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import TemplateCanvas from "@/components/template-editor/TemplateCanvas";
import ElementProperties from "@/components/template-editor/ElementProperties";
import {
  TemplateElement,
  TemplateConfig,
  CARD_WIDTH,
  CARD_HEIGHT,
  DEFAULT_ELEMENTS,
  PREDEFINED_LAYOUTS,
} from "@/types/template";

const ADMIN_PIN = "admin2024";

const TemplateEditorPage = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [pin, setPin] = useState("");
  const navigate = useNavigate();

  const [templateName, setTemplateName] = useState("My Template");
  const [elements, setElements] = useState<TemplateElement[]>(DEFAULT_ELEMENTS);
  const [backgroundColor, setBackgroundColor] = useState("#e8ecf1");
  const [backgroundImage, setBackgroundImage] = useState<string | undefined>();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [canvasScale] = useState(1.8);
  const bgInputRef = useRef<HTMLInputElement>(null);
  const addImgInputRef = useRef<HTMLInputElement>(null);

  const selectedElement = elements.find((e) => e.id === selectedId) || null;

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pin === ADMIN_PIN) {
      setAuthenticated(true);
      loadTemplate();
    } else {
      toast.error("Invalid PIN");
    }
  };

  const loadTemplate = async () => {
    try {
      const snap = await get(ref(database, "templateConfig"));
      if (snap.exists()) {
        const config = snap.val() as TemplateConfig;
        setTemplateName(config.name);
        setElements(config.elements);
        setBackgroundColor(config.backgroundColor);
        setBackgroundImage(config.background);
        toast.success("Template loaded");
      }
    } catch {
      // no saved template, use defaults
    }
  };

  const updateElement = useCallback(
    (id: string, updates: Partial<TemplateElement>) => {
      setElements((prev) =>
        prev.map((el) => (el.id === id ? { ...el, ...updates } : el))
      );
    },
    []
  );

  const deleteElement = useCallback((id: string) => {
    setElements((prev) => prev.filter((el) => el.id !== id));
    setSelectedId(null);
  }, []);

  const addCustomText = () => {
    const newEl: TemplateElement = {
      id: `custom-${Date.now()}`,
      type: "customText",
      label: "Custom Text",
      x: 60,
      y: 180,
      width: 120,
      height: 20,
      fontSize: 10,
      fontWeight: 400,
      color: "#2d3748",
      textAlign: "center",
      textContent: "Custom Label",
      visible: true,
    };
    setElements((prev) => [...prev, newEl]);
    setSelectedId(newEl.id);
  };

  const addCustomImage = () => {
    addImgInputRef.current?.click();
  };

  const handleAddImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const newEl: TemplateElement = {
        id: `img-${Date.now()}`,
        type: "customImage",
        label: "Custom Image",
        x: 60,
        y: 100,
        width: 80,
        height: 60,
        borderRadius: 4,
        visible: true,
        objectFit: "cover",
        imageSrc: reader.result as string,
      };
      setElements((prev) => [...prev, newEl]);
      setSelectedId(newEl.id);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const applyLayout = (layoutIdx: number) => {
    const layout = PREDEFINED_LAYOUTS[layoutIdx];
    setElements(layout.elements.map((el) => ({ ...el })));
    setBackgroundColor(layout.backgroundColor);
    setBackgroundImage(undefined);
    setSelectedId(null);
    toast.success(`Applied "${layout.name}" layout`);
  };

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setBackgroundImage(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveTemplate = async () => {
    setSaving(true);
    try {
      // Don't store large base64 background images in Firebase (size limit)
      let bgToSave = backgroundImage;
      if (bgToSave && bgToSave.length > 500000) {
        // Compress by drawing to a smaller canvas
        bgToSave = await compressImage(bgToSave, 400, 600);
      }
      const config: TemplateConfig = {
        id: "main",
        name: templateName,
        background: bgToSave || "",
        backgroundColor,
        cardWidth: CARD_WIDTH,
        cardHeight: CARD_HEIGHT,
        elements,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      await set(ref(database, "templateConfig"), config);
      toast.success("Template saved! It will be used for ID card generation.");
    } catch (err) {
      console.error("Save template error:", err);
      toast.error("Failed to save template: " + (err instanceof Error ? err.message : "Unknown error"));
    } finally {
      setSaving(false);
    }
  };

  const compressImage = (dataUrl: string, maxW: number, maxH: number): Promise<string> => {
    return new Promise((resolve) => {
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let w = img.width, h = img.height;
        if (w > maxW) { h = h * maxW / w; w = maxW; }
        if (h > maxH) { w = w * maxH / h; h = maxH; }
        canvas.width = w;
        canvas.height = h;
        canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL("image/jpeg", 0.6));
      };
      img.src = dataUrl;
    });
  };

  if (!authenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="glass-card max-w-sm w-full">
          <CardContent className="pt-6">
            <div className="text-center mb-4">
              <div className="mx-auto w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mb-2">
                <Shield className="w-7 h-7 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold">Template Editor</h2>
              <p className="text-sm text-muted-foreground mt-1">Design your ID card layout</p>
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
    <div className="min-h-screen bg-background flex flex-col">
      {/* Toolbar */}
      <div className="sticky top-0 z-50 bg-card border-b border-border px-4 py-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => navigate("/admin")}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Admin
          </Button>
          <Input
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
            className="h-8 w-48 text-sm font-semibold"
          />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => navigate("/print")}>
            <Eye className="w-4 h-4 mr-1" /> Preview Cards
          </Button>
          <Button size="sm" onClick={saveTemplate} disabled={saving}>
            <Save className="w-4 h-4 mr-1" /> {saving ? "Saving..." : "Save Template"}
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Layouts & Tools */}
        <div className="w-56 border-r border-border bg-card overflow-y-auto p-3 space-y-4">
          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Predefined Layouts
            </h3>
            <div className="space-y-1.5">
              {PREDEFINED_LAYOUTS.map((layout, i) => (
                <Button
                  key={i}
                  variant="outline"
                  size="sm"
                  className="w-full justify-start h-8 text-xs"
                  onClick={() => applyLayout(i)}
                >
                  <LayoutTemplate className="w-3 h-3 mr-1.5" />
                  {layout.name}
                </Button>
              ))}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Background
            </h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="w-8 h-8 rounded border border-input cursor-pointer"
                />
                <Input
                  value={backgroundColor}
                  onChange={(e) => setBackgroundColor(e.target.value)}
                  className="h-7 text-xs flex-1"
                />
              </div>
              <input
                type="file"
                ref={bgInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleBgUpload}
              />
              <Button
                variant="outline"
                size="sm"
                className="w-full h-7 text-xs"
                onClick={() => bgInputRef.current?.click()}
              >
                <Image className="w-3 h-3 mr-1" /> Upload Background
              </Button>
              {backgroundImage && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full h-7 text-xs text-destructive"
                  onClick={() => setBackgroundImage(undefined)}
                >
                  Remove Background
                </Button>
              )}
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Add Elements
            </h3>
            <div className="space-y-1.5">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={addCustomText}
              >
                <Plus className="w-3 h-3 mr-1.5" /> Custom Text
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-start h-8 text-xs"
                onClick={addCustomImage}
              >
                <Image className="w-3 h-3 mr-1.5" /> Custom Image
              </Button>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              Elements List
            </h3>
            <div className="space-y-1">
              {elements.map((el) => (
                <button
                  key={el.id}
                  className={`w-full text-left px-2 py-1 rounded text-xs transition-colors ${
                    selectedId === el.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted"
                  } ${!el.visible ? "opacity-40 line-through" : ""}`}
                  onClick={() => setSelectedId(el.id)}
                >
                  {el.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Center - Canvas */}
        <div className="flex-1 overflow-auto bg-muted/30 flex items-start justify-center p-8">
          <div
            className="shadow-2xl"
            style={{
              width: `${CARD_WIDTH * canvasScale}px`,
              height: `${CARD_HEIGHT * canvasScale}px`,
            }}
          >
            <TemplateCanvas
              elements={elements}
              backgroundColor={backgroundColor}
              backgroundImage={backgroundImage}
              selectedId={selectedId}
              scale={canvasScale}
              onSelect={setSelectedId}
              onUpdateElement={updateElement}
            />
          </div>
        </div>

        {/* Right panel - Properties */}
        <div className="w-60 border-l border-border bg-card overflow-y-auto p-3">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Properties
          </h3>
          {selectedElement ? (
            <ElementProperties
              element={selectedElement}
              onUpdate={(updates) => updateElement(selectedElement.id, updates)}
              onDelete={
                selectedElement.type === "customText"
                  ? () => deleteElement(selectedElement.id)
                  : undefined
              }
            />
          ) : (
            <p className="text-xs text-muted-foreground">
              Click an element on the card to edit its properties.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default TemplateEditorPage;
