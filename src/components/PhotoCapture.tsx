import { useState, useRef, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg, CropArea } from "@/lib/cropImage";
import { Button } from "@/components/ui/button";
import { Camera, Upload, RotateCcw, Check, X } from "lucide-react";

interface PhotoCaptureProps {
  onPhotoCropped: (dataUrl: string) => void;
  croppedPhoto: string | null;
}

type Step = "idle" | "preview" | "crop";

const ASPECT = 3.5 / 4.5; // ID card aspect ratio

const PhotoCapture = ({ onPhotoCropped, croppedPhoto }: PhotoCaptureProps) => {
  const [step, setStep] = useState<Step>("idle");
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setImageSrc(reader.result as string);
      setStep("crop");
    };
    reader.readAsDataURL(file);
  };

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: 640, height: 480 },
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setStep("preview");
    } catch {
      alert("Could not access camera. Please use the upload option.");
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current) return;
    const canvas = document.createElement("canvas");
    canvas.width = videoRef.current.videoWidth;
    canvas.height = videoRef.current.videoHeight;
    canvas.getContext("2d")!.drawImage(videoRef.current, 0, 0);
    setImageSrc(canvas.toDataURL("image/jpeg"));
    stopCamera();
    setStep("crop");
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const onCropComplete = useCallback((_: unknown, croppedPixels: CropArea) => {
    setCroppedAreaPixels(croppedPixels);
  }, []);

  const handleCropDone = async () => {
    if (!imageSrc || !croppedAreaPixels) return;
    const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
    onPhotoCropped(cropped);
    setStep("idle");
    setImageSrc(null);
  };

  const reset = () => {
    stopCamera();
    setStep("idle");
    setImageSrc(null);
    onPhotoCropped("");
  };

  if (croppedPhoto && step === "idle") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="relative w-36 h-44 rounded-lg overflow-hidden border-2 border-primary/30 shadow-md">
          <img src={croppedPhoto} alt="Cropped" className="w-full h-full object-cover" />
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="w-4 h-4 mr-1" /> Retake
        </Button>
      </div>
    );
  }

  if (step === "crop" && imageSrc) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-muted-foreground text-center">
          Adjust the crop area to fit your face properly for the ID card
        </p>
        <div className="relative w-full h-72 rounded-lg overflow-hidden bg-muted">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={ASPECT}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
            cropShape="rect"
            showGrid
          />
        </div>
        <input
          type="range"
          min={1}
          max={3}
          step={0.05}
          value={zoom}
          onChange={(e) => setZoom(Number(e.target.value))}
          className="w-full accent-primary"
        />
        <div className="flex gap-2 justify-center">
          <Button variant="outline" onClick={reset}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={handleCropDone}>
            <Check className="w-4 h-4 mr-1" /> Crop & Use
          </Button>
        </div>
      </div>
    );
  }

  if (step === "preview") {
    return (
      <div className="flex flex-col items-center gap-3">
        <div className="w-full max-w-xs rounded-lg overflow-hidden border border-border">
          <video ref={videoRef} autoPlay playsInline muted className="w-full" />
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => { stopCamera(); setStep("idle"); }}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button onClick={capturePhoto}>
            <Camera className="w-4 h-4 mr-1" /> Capture
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="w-36 h-44 rounded-lg border-2 border-dashed border-muted-foreground/30 flex items-center justify-center bg-muted/50">
        <Camera className="w-10 h-10 text-muted-foreground/40" />
      </div>
      <div className="flex gap-3">
        <Button variant="outline" onClick={startCamera}>
          <Camera className="w-4 h-4 mr-1" /> Camera
        </Button>
        <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
          <Upload className="w-4 h-4 mr-1" /> Upload
        </Button>
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
};

export default PhotoCapture;
