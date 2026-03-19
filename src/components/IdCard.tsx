import { useEffect, useRef } from "react";
import JsBarcode from "jsbarcode";

interface IdCardProps {
  id: string;
  name: string;
  teamName: string;
  collegeName: string;
  track: string;
  photo: string;
}

const IdCard = ({ id, name, teamName, collegeName, track, photo }: IdCardProps) => {
  const barcodeRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (barcodeRef.current && id) {
      try {
        JsBarcode(barcodeRef.current, id, {
          format: "CODE128",
          width: 1.5,
          height: 35,
          displayValue: false,
          margin: 0,
        });
      } catch {
        // fallback if barcode generation fails
      }
    }
  }, [id]);

  return (
    <div
      className="id-card"
      style={{
        width: "242px",
        height: "365px",
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#e8ecf1",
        fontFamily: "'Space Grotesk', sans-serif",
        pageBreakInside: "avoid",
      }}
    >
      {/* Background decorative elements */}
      {/* Top-right red chevron */}
      <div
        style={{
          position: "absolute",
          top: "-10px",
          right: "-10px",
          width: "60px",
          height: "60px",
          borderBottom: "5px solid #e53e3e",
          borderLeft: "5px solid #e53e3e",
          transform: "rotate(0deg)",
          zIndex: 1,
        }}
      />
      {/* Bottom-left red chevron */}
      <div
        style={{
          position: "absolute",
          bottom: "-10px",
          left: "-10px",
          width: "60px",
          height: "60px",
          borderTop: "5px solid #e53e3e",
          borderRight: "5px solid #e53e3e",
          zIndex: 1,
        }}
      />
      {/* Gray triangles top-left */}
      <div
        style={{
          position: "absolute",
          top: "20px",
          left: "0",
          width: 0,
          height: 0,
          borderLeft: "30px solid #c5cbd3",
          borderRight: "30px solid transparent",
          borderBottom: "30px solid transparent",
          opacity: 0.5,
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50px",
          left: "0",
          width: 0,
          height: 0,
          borderLeft: "20px solid #b0b8c4",
          borderRight: "20px solid transparent",
          borderBottom: "20px solid transparent",
          opacity: 0.4,
        }}
      />
      {/* Gray triangle bottom-right */}
      <div
        style={{
          position: "absolute",
          bottom: "30px",
          right: "0",
          width: 0,
          height: 0,
          borderRight: "35px solid #c5cbd3",
          borderLeft: "35px solid transparent",
          borderTop: "35px solid transparent",
          opacity: 0.5,
        }}
      />

      {/* Subtle radial overlay */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "radial-gradient(ellipse at center, rgba(255,255,255,0.3) 0%, transparent 70%)",
          zIndex: 0,
        }}
      />

      {/* Content */}
      <div
        style={{
          position: "relative",
          zIndex: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100%",
          padding: "14px 16px 10px",
        }}
      >
        {/* Header - Event name */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", marginBottom: "10px", alignSelf: "flex-start" }}>
          <div
            style={{
              width: "18px",
              height: "18px",
              backgroundColor: "#2d3748",
              borderRadius: "4px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <span style={{ color: "#fff", fontSize: "10px", fontWeight: 700 }}>M</span>
          </div>
          <span
            style={{
              fontSize: "11px",
              fontWeight: 600,
              color: "#2d3748",
              letterSpacing: "1.5px",
              textTransform: "uppercase",
            }}
          >
            MAKE-A-THON
          </span>
        </div>

        {/* Track badge */}
        <div
          style={{
            padding: "2px 10px",
            borderRadius: "10px",
            fontSize: "8px",
            fontWeight: 600,
            letterSpacing: "1px",
            marginBottom: "8px",
            backgroundColor: track.includes("SW") ? "#ebf4ff" : "#fff5f5",
            color: track.includes("SW") ? "#3182ce" : "#e53e3e",
            border: `1px solid ${track.includes("SW") ? "#bee3f8" : "#fed7d7"}`,
          }}
        >
          {track}
        </div>

        {/* Photo */}
        <div
          style={{
            width: "130px",
            height: "155px",
            border: "2px solid #2d3748",
            borderRadius: "6px",
            overflow: "hidden",
            marginBottom: "10px",
            backgroundColor: "#fff",
          }}
        >
          <img
            src={photo}
            alt={name}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            crossOrigin="anonymous"
          />
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: "14px",
            fontWeight: 700,
            color: "#1a202c",
            textTransform: "uppercase",
            letterSpacing: "0.5px",
            textAlign: "center",
            lineHeight: 1.2,
            marginBottom: "2px",
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {name}
        </div>

        {/* Team name */}
        <div
          style={{
            fontSize: "10px",
            fontWeight: 500,
            color: "#4a5568",
            textAlign: "center",
            marginBottom: "2px",
          }}
        >
          {teamName}
        </div>

        {/* College */}
        <div
          style={{
            fontSize: "8px",
            fontWeight: 400,
            color: "#718096",
            textAlign: "center",
            marginBottom: "8px",
            maxWidth: "200px",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {collegeName}
        </div>

        {/* Barcode */}
        <svg ref={barcodeRef} style={{ width: "140px", height: "35px" }} />

        {/* ID text */}
        <div style={{ fontSize: "6px", color: "#a0aec0", marginTop: "2px", letterSpacing: "0.5px" }}>
          {id}
        </div>
      </div>
    </div>
  );
};

export default IdCard;
