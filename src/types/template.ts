export type ElementType =
  | "photo"
  | "name"
  | "teamName"
  | "collegeName"
  | "track"
  | "barcode"
  | "qrCode"
  | "eventTitle"
  | "idText"
  | "customText"
  | "customImage";

export interface TemplateElement {
  id: string;
  type: ElementType;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontWeight?: number;
  color?: string;
  backgroundColor?: string;
  borderRadius?: number;
  textAlign?: "left" | "center" | "right";
  textContent?: string; // for customText and eventTitle
  letterSpacing?: number;
  textTransform?: "none" | "uppercase" | "lowercase";
  visible: boolean;
  imageSrc?: string; // base64 for customImage elements
  objectFit?: "cover" | "contain" | "fill";
  photoShape?: "square" | "circle";
}

export interface TemplateConfig {
  id: string;
  name: string;
  background?: string; // base64 or URL
  backgroundColor: string;
  cardWidth: number;
  cardHeight: number;
  elements: TemplateElement[];
  createdAt: string;
  updatedAt: string;
}

export const CARD_WIDTH = 242;
export const CARD_HEIGHT = 365;

export const DEFAULT_ELEMENTS: TemplateElement[] = [
  {
    id: "eventTitle",
    type: "eventTitle",
    label: "Event Title",
    x: 14,
    y: 14,
    width: 160,
    height: 22,
    fontSize: 11,
    fontWeight: 600,
    color: "#2d3748",
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textContent: "MAKE-A-THON",
    textAlign: "left",
    visible: true,
  },
  {
    id: "track",
    type: "track",
    label: "Track Badge",
    x: 81,
    y: 42,
    width: 80,
    height: 18,
    fontSize: 8,
    fontWeight: 600,
    color: "#3182ce",
    backgroundColor: "#ebf4ff",
    borderRadius: 10,
    textAlign: "center",
    letterSpacing: 1,
    visible: true,
  },
  {
    id: "photo",
    type: "photo",
    label: "Photo",
    x: 56,
    y: 65,
    width: 130,
    height: 155,
    borderRadius: 6,
    visible: true,
  },
  {
    id: "name",
    type: "name",
    label: "Name",
    x: 21,
    y: 228,
    width: 200,
    height: 20,
    fontSize: 14,
    fontWeight: 700,
    color: "#1a202c",
    textTransform: "uppercase",
    textAlign: "center",
    letterSpacing: 0.5,
    visible: true,
  },
  {
    id: "teamName",
    type: "teamName",
    label: "Team Name",
    x: 21,
    y: 252,
    width: 200,
    height: 16,
    fontSize: 10,
    fontWeight: 500,
    color: "#4a5568",
    textAlign: "center",
    visible: true,
  },
  {
    id: "collegeName",
    type: "collegeName",
    label: "College",
    x: 21,
    y: 270,
    width: 200,
    height: 14,
    fontSize: 8,
    fontWeight: 400,
    color: "#718096",
    textAlign: "center",
    visible: true,
  },
  {
    id: "barcode",
    type: "barcode",
    label: "Barcode",
    x: 51,
    y: 292,
    width: 140,
    height: 35,
    visible: true,
  },
  {
    id: "idText",
    type: "idText",
    label: "ID Text",
    x: 51,
    y: 330,
    width: 140,
    height: 12,
    fontSize: 6,
    color: "#a0aec0",
    textAlign: "center",
    letterSpacing: 0.5,
    visible: true,
  },
];

export const PREDEFINED_LAYOUTS: { name: string; elements: TemplateElement[]; backgroundColor: string }[] = [
  {
    name: "Classic (Default)",
    backgroundColor: "#e8ecf1",
    elements: DEFAULT_ELEMENTS,
  },
  {
    name: "Modern Dark",
    backgroundColor: "#1a202c",
    elements: DEFAULT_ELEMENTS.map((el) => {
      const overrides: Partial<TemplateElement> = {};
      if (el.type === "name") overrides.color = "#f7fafc";
      if (el.type === "teamName") overrides.color = "#a0aec0";
      if (el.type === "collegeName") overrides.color = "#718096";
      if (el.type === "eventTitle") overrides.color = "#f7fafc";
      if (el.type === "idText") overrides.color = "#4a5568";
      if (el.type === "track") {
        overrides.backgroundColor = "#2d3748";
        overrides.color = "#63b3ed";
      }
      return { ...el, ...overrides };
    }),
  },
  {
    name: "Compact Top Photo",
    backgroundColor: "#f7fafc",
    elements: [
      { ...DEFAULT_ELEMENTS[0], x: 71, y: 8, width: 100, textAlign: "center" as const },
      { ...DEFAULT_ELEMENTS[1], x: 81, y: 30, width: 80 },
      { ...DEFAULT_ELEMENTS[2], x: 56, y: 52, width: 130, height: 130 },
      { ...DEFAULT_ELEMENTS[3], x: 21, y: 190, width: 200 },
      { ...DEFAULT_ELEMENTS[4], x: 21, y: 214, width: 200 },
      { ...DEFAULT_ELEMENTS[5], x: 21, y: 232, width: 200 },
      { ...DEFAULT_ELEMENTS[6], x: 31, y: 260, width: 180, height: 50 },
      { ...DEFAULT_ELEMENTS[7], x: 51, y: 315, width: 140 },
    ],
  },
];
