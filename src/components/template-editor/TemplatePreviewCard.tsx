import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";
import { TemplateElement } from "@/types/template";

interface TemplatePreviewCardProps {
  elements: TemplateElement[];
  backgroundColor: string;
  backgroundImage?: string;
  cardWidth: number;
  cardHeight: number;
  data: {
    id: string;
    name: string;
    teamName: string;
    collegeName: string;
    track: string;
    photo: string;
  };
}

const PreviewBarcode = ({ value, style }: { value: string, style: React.CSSProperties }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (canvasRef.current && value) {
      try {
        JsBarcode(canvasRef.current, value, {
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
  }, [value]);
  return <canvas ref={canvasRef} style={style} />;
};

const TemplatePreviewCard = ({
  elements,
  backgroundColor,
  backgroundImage,
  cardWidth,
  cardHeight,
  data,
}: TemplatePreviewCardProps) => {

  const renderElement = (el: TemplateElement) => {
    if (!el.visible) return null;

    const textStyle: React.CSSProperties = {
      position: "absolute",
      left: `${el.x}px`,
      top: `${el.y}px`,
      width: `${el.width}px`,
      height: `${el.height}px`,
      fontSize: `${el.fontSize || 12}px`,
      fontWeight: el.fontWeight || 400,
      color: el.color || "#000",
      textAlign: el.textAlign || "center",
      textTransform: el.textTransform || "none",
      letterSpacing: el.letterSpacing ? `${el.letterSpacing}px` : undefined,
      lineHeight: 1.2,
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
      case "photo": {
        const isCircle = el.photoShape === "circle";
        return (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
              overflow: "hidden",
              borderRadius: isCircle ? "50%" : el.borderRadius ? `${el.borderRadius}px` : undefined,
              border: "2px solid #2d3748",
            }}
          >
            <img
              src={data.photo}
              alt={data.name}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
              crossOrigin="anonymous"
            />
          </div>
        );
      }
      case "barcode":
        return (
          <PreviewBarcode
            key={el.id}
            value={data.id}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
            }}
          />
        );
      case "name":
        return <div key={el.id} style={textStyle}>{data.name}</div>;
      case "teamName":
        return <div key={el.id} style={textStyle}>{data.teamName}</div>;
      case "collegeName":
        return <div key={el.id} style={textStyle}>{data.collegeName}</div>;
      case "track": {
        const isSW = data.track.includes("SW");
        return (
          <div
            key={el.id}
            style={{
              ...textStyle,
              backgroundColor: isSW ? (el.backgroundColor || "#ebf4ff") : "#fff5f5",
              color: isSW ? (el.color || "#3182ce") : "#e53e3e",
              border: `1px solid ${isSW ? "#bee3f8" : "#fed7d7"}`,
            }}
          >
            {data.track}
          </div>
        );
      }
      case "eventTitle":
        return <div key={el.id} style={textStyle}>{el.textContent || "EVENT"}</div>;
      case "idText":
        return <div key={el.id} style={textStyle}>{data.id}</div>;
      case "customText":
        return <div key={el.id} style={textStyle}>{el.textContent || ""}</div>;
      case "customImage":
        return el.imageSrc ? (
          <div
            key={el.id}
            style={{
              position: "absolute",
              left: `${el.x}px`,
              top: `${el.y}px`,
              width: `${el.width}px`,
              height: `${el.height}px`,
            }}
          >
            <img
              src={el.imageSrc}
              alt={el.label}
              style={{
                width: "100%",
                height: "100%",
                objectFit: el.objectFit || "cover",
                borderRadius: el.borderRadius ? `${el.borderRadius}px` : undefined,
              }}
            />
          </div>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div
      className="id-card"
      style={{
        width: `${cardWidth}px`,
        height: `${cardHeight}px`,
        position: "relative",
        overflow: "hidden",
        backgroundColor: backgroundImage ? "transparent" : backgroundColor,
        fontFamily: "'Space Grotesk', sans-serif",
        backgroundImage: backgroundImage ? `url(${backgroundImage})` : undefined,
        backgroundSize: "cover",
        backgroundRepeat: "no-repeat",
        backgroundPosition: "center",
        pageBreakInside: "avoid",
      }}
    >
      {elements.map(renderElement)}
    </div>
  );
};

export default TemplatePreviewCard;
