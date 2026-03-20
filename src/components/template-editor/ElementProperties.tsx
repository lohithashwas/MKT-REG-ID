import { TemplateElement } from "@/types/template";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";

interface ElementPropertiesProps {
  element: TemplateElement;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  onDelete?: () => void;
}

const ElementProperties = ({ element, onUpdate, onDelete }: ElementPropertiesProps) => {
  const isTextElement = !["photo", "barcode"].includes(element.type);

  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold text-foreground">{element.label}</h4>
        <div className="flex items-center gap-2">
          <Label htmlFor="visible" className="text-xs text-muted-foreground">Show</Label>
          <Switch
            id="visible"
            checked={element.visible}
            onCheckedChange={(v) => onUpdate({ visible: v })}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-xs text-muted-foreground">X</Label>
          <Input
            type="number"
            value={element.x}
            onChange={(e) => onUpdate({ x: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Y</Label>
          <Input
            type="number"
            value={element.y}
            onChange={(e) => onUpdate({ y: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Width</Label>
          <Input
            type="number"
            value={element.width}
            onChange={(e) => onUpdate({ width: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
        <div>
          <Label className="text-xs text-muted-foreground">Height</Label>
          <Input
            type="number"
            value={element.height}
            onChange={(e) => onUpdate({ height: Number(e.target.value) })}
            className="h-7 text-xs"
          />
        </div>
      </div>

      {isTextElement && (
        <>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Font Size</Label>
              <Input
                type="number"
                value={element.fontSize || 12}
                onChange={(e) => onUpdate({ fontSize: Number(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Font Weight</Label>
              <Input
                type="number"
                value={element.fontWeight || 400}
                step={100}
                onChange={(e) => onUpdate({ fontWeight: Number(e.target.value) })}
                className="h-7 text-xs"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={element.color || "#000000"}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-7 h-7 rounded border border-input cursor-pointer"
                />
                <Input
                  value={element.color || "#000000"}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Align</Label>
              <select
                value={element.textAlign || "center"}
                onChange={(e) => onUpdate({ textAlign: e.target.value as "left" | "center" | "right" })}
                className="w-full h-7 text-xs border border-input rounded-md px-2 bg-background"
              >
                <option value="left">Left</option>
                <option value="center">Center</option>
                <option value="right">Right</option>
              </select>
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Transform</Label>
            <select
              value={element.textTransform || "none"}
              onChange={(e) => onUpdate({ textTransform: e.target.value as "none" | "uppercase" | "lowercase" })}
              className="w-full h-7 text-xs border border-input rounded-md px-2 bg-background"
            >
              <option value="none">None</option>
              <option value="uppercase">UPPERCASE</option>
              <option value="lowercase">lowercase</option>
            </select>
          </div>

          {element.backgroundColor !== undefined && (
            <div>
              <Label className="text-xs text-muted-foreground">Background</Label>
              <div className="flex gap-1">
                <input
                  type="color"
                  value={element.backgroundColor || "#ffffff"}
                  onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                  className="w-7 h-7 rounded border border-input cursor-pointer"
                />
                <Input
                  value={element.backgroundColor || "#ffffff"}
                  onChange={(e) => onUpdate({ backgroundColor: e.target.value })}
                  className="h-7 text-xs flex-1"
                />
              </div>
            </div>
          )}

          {(element.type === "customText" || element.type === "eventTitle") && (
            <div>
              <Label className="text-xs text-muted-foreground">Text Content</Label>
              <Input
                value={element.textContent || ""}
                onChange={(e) => onUpdate({ textContent: e.target.value })}
                className="h-7 text-xs"
              />
            </div>
          )}
        </>
      )}

      <div>
        <Label className="text-xs text-muted-foreground">Border Radius</Label>
        <Input
          type="number"
          value={element.borderRadius || 0}
          onChange={(e) => onUpdate({ borderRadius: Number(e.target.value) })}
          className="h-7 text-xs"
        />
      </div>

      {element.type === "customText" && onDelete && (
        <Button variant="destructive" size="sm" className="w-full h-7 text-xs" onClick={onDelete}>
          <Trash2 className="w-3 h-3 mr-1" /> Remove Element
        </Button>
      )}
    </div>
  );
};

export default ElementProperties;
