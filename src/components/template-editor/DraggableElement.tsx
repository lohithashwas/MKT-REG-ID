import { useRef, useCallback, useState } from "react";
import { TemplateElement } from "@/types/template";

interface DraggableElementProps {
  element: TemplateElement;
  selected: boolean;
  scale: number;
  onSelect: () => void;
  onUpdate: (updates: Partial<TemplateElement>) => void;
  children: React.ReactNode;
}

const DraggableElement = ({
  element,
  selected,
  scale,
  onSelect,
  onUpdate,
  children,
}: DraggableElementProps) => {
  const elRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState(false);
  const [resizing, setResizing] = useState(false);
  const startPos = useRef({ x: 0, y: 0, elX: 0, elY: 0, elW: 0, elH: 0 });

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if ((e.target as HTMLElement).dataset.resize) return;
      e.stopPropagation();
      e.preventDefault();
      onSelect();
      setDragging(true);
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        elX: element.x,
        elY: element.y,
        elW: element.width,
        elH: element.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [element.x, element.y, onSelect]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (dragging) {
        const dx = (e.clientX - startPos.current.x) / scale;
        const dy = (e.clientY - startPos.current.y) / scale;
        onUpdate({
          x: Math.round(startPos.current.elX + dx),
          y: Math.round(startPos.current.elY + dy),
        });
      }
      if (resizing) {
        const dx = (e.clientX - startPos.current.x) / scale;
        const dy = (e.clientY - startPos.current.y) / scale;
        onUpdate({
          width: Math.max(20, Math.round(startPos.current.elW + dx)),
          height: Math.max(10, Math.round(startPos.current.elH + dy)),
        });
      }
    },
    [dragging, resizing, scale, onUpdate]
  );

  const handlePointerUp = useCallback(() => {
    setDragging(false);
    setResizing(false);
  }, []);

  const handleResizeDown = useCallback(
    (e: React.PointerEvent) => {
      e.stopPropagation();
      e.preventDefault();
      onSelect();
      setResizing(true);
      startPos.current = {
        x: e.clientX,
        y: e.clientY,
        elX: element.x,
        elY: element.y,
        elW: element.width,
        elH: element.height,
      };
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    },
    [element, onSelect]
  );

  if (!element.visible) return null;

  return (
    <div
      ref={elRef}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      style={{
        position: "absolute",
        left: `${element.x}px`,
        top: `${element.y}px`,
        width: `${element.width}px`,
        height: `${element.height}px`,
        cursor: dragging ? "grabbing" : "grab",
        outline: selected ? "2px solid #3b82f6" : "1px dashed rgba(100,100,100,0.3)",
        outlineOffset: "1px",
        zIndex: selected ? 50 : 10,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {children}
      {selected && (
        <div
          data-resize="true"
          onPointerDown={handleResizeDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          style={{
            position: "absolute",
            right: -4,
            bottom: -4,
            width: 8,
            height: 8,
            backgroundColor: "#3b82f6",
            cursor: "nwse-resize",
            borderRadius: 1,
            touchAction: "none",
          }}
        />
      )}
    </div>
  );
};

export default DraggableElement;
