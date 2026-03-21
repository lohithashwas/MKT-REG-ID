import { useState, useCallback } from "react";
import Cropper from "react-easy-crop";
import { getCroppedImg, CropArea } from "@/lib/cropImage";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";

interface ImageCropDialogProps {
  open: boolean;
  imageSrc: string;
  aspectRatio?: number;
  onClose: () => void;
  onCropComplete: (croppedImage: string) => void;
}

const ImageCropDialog = ({
  open,
  imageSrc,
  aspectRatio = 1,
  onClose,
  onCropComplete,
}: ImageCropDialogProps) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropArea | null>(null);

  const onCropDone = useCallback(
    (_: unknown, croppedPixels: CropArea) => {
      setCroppedAreaPixels(croppedPixels);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;
    try {
      const cropped = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(cropped);
      onClose();
    } catch {
      // ignore
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Crop Image</DialogTitle>
        </DialogHeader>
        <div className="relative w-full h-72 bg-muted rounded-md overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={aspectRatio}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropDone}
          />
        </div>
        <div className="flex items-center gap-3">
          <Label className="text-xs text-muted-foreground whitespace-nowrap">Zoom</Label>
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.1}
            onValueChange={(v) => setZoom(v[0])}
            className="flex-1"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleConfirm}>Apply Crop</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;
