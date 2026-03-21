import { useRef, useEffect } from "react";
import JsBarcode from "jsbarcode";
import { TemplateElement, CARD_WIDTH, CARD_HEIGHT } from "@/types/template";
import DraggableElement from "./DraggableElement";

interface TemplateCanvasProps {
  elements: TemplateElement[];
  backgroundColor: string;
  backgroundImage?: string;
  selectedId: string | null;
  scale: number;
  onSelect: (id: string | null) => void;
  onUpdateElement: (id: string, updates: Partial<TemplateElement>) => void;
}

const SAMPLE_DATA = {
  name: "JOHN SMITH",
  teamName: "Team Alpha",
  collegeName: "MIT University",
  track: "SW Track",
  id: "REG-001234",
  photo: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=250&fit=crop&crop=face",
};

const TemplateCanvas = ({
  elements,
  backgroundColor,
  backgroundImage,
  selectedId,
  scale,
  onSelect,
  onUpdateElement,
}: TemplateCanvasProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current) {
      try {
        JsBarcode(barcodeRef.current, SAMPLE_DATA.id, {
          format: "CODE128",
          width: 1.5,
          height: 35,
          displayValue: false,
          margin: 0,
        });
      } catch {
        // ignore
      }
    }
  }, [elements]);

  const renderElementContent = (el: TemplateElement) => {
    const textStyle: React.CSSProperties = {
      fontSize: `${el.fontSize || 12}px`,
      fontWeight: el.fontWeight || 400,
      color: el.color || "#000",
      textAlign: el.textAlign || "center",
      textTransform: el.textTransform || "none",
      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
      lineHeight: 1.2,
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      justifyContent:
        el.textAlign === "left" ? "flex-start" : el.textAlign === "right" ? "flex-end" : "center",
      overflow: "hidden",
      whiteSpace: "nowrap",
      textOverflow: "ellipsis",
      backgroundColor: el.backgroundColor || "transparent",
      borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
      padding: el.backgroundColor ? "2px 8px" : undefined,
      fontFamily: "'Space Grotesk', sans-serif",
    };

    switch (el.type) {
      case "photo":
        return (
          <img
            src={SAMPLE_DATA.photo}
            alt="Sample"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
              border: "2px solid #2d3748",
            }}
            draggable={false}
          />
        );
      case "name":
        return <div style={textStyle}>{SAMPLE_DATA.name}</div>;
      case "teamName":
        return <div style={textStyle}>{SAMPLE_DATA.teamName}</div>;
      case "collegeName":
        return <div style={textStyle}>{SAMPLE_DATA.collegeName}</div>;
      case "track":
        return <div style={textStyle}>{SAMPLE_DATA.track}</div>;
      case "eventTitle":
        return <div style={textStyle}>{el.textContent || "EVENT TITLE"}</div>;
      case "idText":
        return <div style={textStyle}>{SAMPLE_DATA.id}</div>;
      case "barcode":
        return <svg ref={barcodeRef} style={{ width: "100%", height: "100%" }} />;
      case "customText":
        return <div style={textStyle}>{el.textContent || "Custom Text"}</div>;
      case "customImage":
        return el.imageSrc ? (
          <img
            src={el.imageSrc}
            alt={el.label}
            style={{
              width: "100%",
              height: "100%",
              objectFit: el.objectFit || "cover",
              borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
            }}
            draggable={false}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "#e2e8f0",
              borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
              fontSize: "9px",
              color: "#64748b",
            }}
          >
            No Image
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      style={{
        width: `${CARD_WIDTH}px`,
        height: `${CARD_HEIGHT}px`,
        backgroundColor,
        position: "relative",
        overflow: "hidden",
        fontFamily: "'Space Grotesk', sans-serif",
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundPosition: "center",
        transform: `scale(${scale})`,
        transformOrigin: "top left",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onSelect(null);
      }}
    >
      {elements.map((el) => (
        <DraggableElement
          key={el.id}
          element={el}
          selected={selectedId === el.id}
          scale={scale}
          onSelect={() => onSelect(el.id)}
          onUpdate={(updates) => onUpdateElement(el.id, updates)}
        >
          {renderElementContent(el)}
        </DraggableElement>
      ))}
    </div>
  );
};

export default TemplateCanvas;
