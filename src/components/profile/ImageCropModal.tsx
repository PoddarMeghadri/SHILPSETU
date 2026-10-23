import React, { useState, useRef, useEffect, useCallback } from 'react';
import { sound } from '../../services/sound';

export interface ImageCropModalProps {
  isOpen: boolean;
  imageSrc: string;
  mode?: 'user' | 'admin';
  onClose: () => void;
  onCropComplete: (croppedBlob: Blob, croppedDataUrl: string) => Promise<void> | void;
  isProcessing?: boolean;
}

/**
 * Validates avatar image file type (.jpg, .jpeg, .png, .webp) and 5MB size limit.
 */
export function validateAvatarFile(file: File): { valid: boolean; error?: string } {
  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp'];
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  const fileName = file.name.toLowerCase();
  const hasValidExt = allowedExtensions.some((ext) => fileName.endsWith(ext));
  const hasValidMime = allowedTypes.includes(file.type.toLowerCase()) || file.type.startsWith('image/');

  if (!hasValidExt && !hasValidMime) {
    return {
      valid: false,
      error: 'Please upload a valid image file (.jpg, .jpeg, .png, or .webp).',
    };
  }

  const maxSizeBytes = 5 * 1024 * 1024; // 5MB limit
  if (file.size > maxSizeBytes) {
    return {
      valid: false,
      error: `File size exceeds 5MB limit (${(file.size / (1024 * 1024)).toFixed(1)}MB). Please choose a smaller photo.`,
    };
  }

  return { valid: true };
}

export const ImageCropModal: React.FC<ImageCropModalProps> = ({
  isOpen,
  imageSrc,
  mode = 'user',
  onClose,
  onCropComplete,
  isProcessing = false,
}) => {
  const isAdmin = mode === 'admin';

  // State
  const [zoom, setZoom] = useState<number>(1);
  const [rotation, setRotation] = useState<number>(0);
  const [pan, setPan] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [imageLoaded, setImageLoaded] = useState<boolean>(false);
  const [naturalSize, setNaturalSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Refs
  const containerRef = useRef<HTMLDivElement | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const pointerStartRef = useRef<{ x: number; y: number; initialPan: { x: number; y: number } } | null>(null);
  const activePointersRef = useRef<Map<number, { x: number; y: number }>>(new Map());
  const pinchStartDistanceRef = useRef<number | null>(null);
  const pinchStartZoomRef = useRef<number>(1);

  // Adaptive Styling Palettes
  const theme = isAdmin
    ? {
        accent: '#10B981',
        accentHover: '#059669',
        bg: '#131E18',
        border: '#233C2E',
        text: '#E2F1E8',
        subtext: '#8BA496',
        cardBg: '#1A2922',
        ringColor: '#10B981',
        sliderTrack: '#233C2E',
      }
    : {
        accent: '#E05326',
        accentHover: '#C94318',
        bg: '#1C1714',
        border: '#3A2D27',
        text: '#EDE8E3',
        subtext: '#A89F91',
        cardBg: '#251E1A',
        ringColor: '#E05326',
        sliderTrack: '#3A2D27',
      };

  // Reset state whenever image source changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setPan({ x: 0, y: 0 });
      setImageLoaded(false);
      setIsExporting(false);
    }
  }, [isOpen, imageSrc]);

  // Image load handler
  const handleImageLoad = () => {
    if (imageRef.current) {
      setNaturalSize({
        width: imageRef.current.naturalWidth,
        height: imageRef.current.naturalHeight,
      });
      setImageLoaded(true);
    }
  };

  // Reset Controls
  const handleReset = () => {
    sound.playTap();
    setZoom(1);
    setRotation(0);
    setPan({ x: 0, y: 0 });
  };

  // 90-degree clockwise rotation
  const handleRotate = () => {
    sound.playTap();
    setRotation((prev) => (prev + 90) % 360);
  };

  // Pointer event handlers for pan & multi-touch pinch-to-zoom
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (containerRef.current) {
      containerRef.current.setPointerCapture(e.pointerId);
    }

    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    if (activePointersRef.current.size === 1) {
      pointerStartRef.current = {
        x: e.clientX,
        y: e.clientY,
        initialPan: { ...pan },
      };
    } else if (activePointersRef.current.size === 2) {
      // Begin pinch
      const points = Array.from(activePointersRef.current.values()) as Array<{ x: number; y: number }>;
      const dist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      pinchStartDistanceRef.current = dist;
      pinchStartZoomRef.current = zoom;
      pointerStartRef.current = null;
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!activePointersRef.current.has(e.pointerId)) return;
    activePointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });

    // Handle 2-finger pinch
    if (activePointersRef.current.size === 2 && pinchStartDistanceRef.current) {
      const points = Array.from(activePointersRef.current.values()) as Array<{ x: number; y: number }>;
      const currentDist = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const ratio = currentDist / pinchStartDistanceRef.current;
      const newZoom = Math.min(3, Math.max(1, pinchStartZoomRef.current * ratio));
      setZoom(Number(newZoom.toFixed(2)));
      return;
    }

    // Handle 1-finger / mouse drag
    if (activePointersRef.current.size === 1 && pointerStartRef.current) {
      const deltaX = e.clientX - pointerStartRef.current.x;
      const deltaY = e.clientY - pointerStartRef.current.y;
      setPan({
        x: pointerStartRef.current.initialPan.x + deltaX,
        y: pointerStartRef.current.initialPan.y + deltaY,
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (containerRef.current && containerRef.current.hasPointerCapture(e.pointerId)) {
      try {
        containerRef.current.releasePointerCapture(e.pointerId);
      } catch (_) {}
    }

    if (activePointersRef.current.size === 0) {
      pointerStartRef.current = null;
      pinchStartDistanceRef.current = null;
    } else if (activePointersRef.current.size === 1) {
      const remaining = Array.from(activePointersRef.current.values())[0] as { x: number; y: number } | undefined;
      if (remaining) {
        pointerStartRef.current = {
          x: remaining.x,
          y: remaining.y,
          initialPan: { ...pan },
        };
      }
      pinchStartDistanceRef.current = null;
    }
  };

  // Wheel zoom handler
  const handleWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const zoomDelta = -e.deltaY * 0.002;
    setZoom((prev) => {
      const next = Math.min(3, Math.max(1, prev + zoomDelta));
      return Number(next.toFixed(2));
    });
  };

  // Render cropped region via 512x512 HTML5 canvas and export optimized Blob
  const handleCropAndApply = useCallback(async () => {
    if (!imageRef.current || !containerRef.current || isExporting || isProcessing) return;

    sound.playTap();
    setIsExporting(true);

    try {
      const containerRect = containerRef.current.getBoundingClientRect();
      const containerSize = containerRect.width; // 1:1 aspect square
      const targetResolution = 512;
      const scaleMultiplier = targetResolution / containerSize;

      const canvas = document.createElement('canvas');
      canvas.width = targetResolution;
      canvas.height = targetResolution;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        throw new Error('Canvas 2D rendering context not available');
      }

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Determine cover base dimensions
      const img = imageRef.current;
      const natW = img.naturalWidth || 1;
      const natH = img.naturalHeight || 1;
      const aspect = natW / natH;

      let baseW = containerSize;
      let baseH = containerSize;

      if (aspect >= 1) {
        baseH = containerSize;
        baseW = containerSize * aspect;
      } else {
        baseW = containerSize;
        baseH = containerSize / aspect;
      }

      const canvasBaseW = baseW * scaleMultiplier;
      const canvasBaseH = baseH * scaleMultiplier;

      // Set up transformation matrix matching CSS transforms
      ctx.save();
      // Move to canvas center (256, 256)
      ctx.translate(targetResolution / 2, targetResolution / 2);
      // Apply scaled pan offset
      ctx.translate(pan.x * scaleMultiplier, pan.y * scaleMultiplier);
      // Apply rotation
      ctx.rotate((rotation * Math.PI) / 180);
      // Apply zoom
      ctx.scale(zoom, zoom);

      // Draw image centered at the origin
      ctx.drawImage(img, -canvasBaseW / 2, -canvasBaseH / 2, canvasBaseW, canvasBaseH);
      ctx.restore();

      // Convert to WebP (fallback to JPEG)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.92);

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(
          (b) => {
            if (b) resolve(b);
            else {
              canvas.toBlob((jb) => resolve(jb), 'image/jpeg', 0.92);
            }
          },
          'image/webp',
          0.92
        );
      });

      if (!blob) {
        throw new Error('Failed to generate image blob from canvas');
      }

      await onCropComplete(blob, dataUrl);
    } catch (err) {
      console.error('[Crop & Apply Error]:', err);
      sound.playError();
    } finally {
      setIsExporting(false);
    }
  }, [pan, rotation, zoom, onCropComplete, isExporting, isProcessing]);

  if (!isOpen) return null;

  const isBusy = isExporting || isProcessing;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="crop-modal-title"
      className="fixed inset-0 z-[150] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div
        className="w-full max-w-md rounded-3xl border shadow-2xl overflow-hidden flex flex-col transition-all"
        style={{
          backgroundColor: theme.bg,
          borderColor: theme.border,
          color: theme.text,
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: theme.border }}
        >
          <div className="flex items-center gap-2.5">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center text-white shrink-0"
              style={{ backgroundColor: theme.accent }}
            >
              <span className="material-symbols-outlined text-lg">crop</span>
            </div>
            <div>
              <h3 id="crop-modal-title" className="font-serif font-bold text-base leading-tight">
                Adjust Profile Photo
              </h3>
              <p className="text-[11px] opacity-75 font-sans" style={{ color: theme.subtext }}>
                Scroll or pinch to zoom
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10 cursor-pointer disabled:opacity-40"
            style={{ color: theme.subtext }}
            title="Cancel & Close"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Interactive 1:1 Crop Viewport */}
        <div className="p-4 sm:p-5 flex flex-col items-center">
          <div
            ref={containerRef}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onWheel={handleWheel}
            className="w-64 h-64 sm:w-72 sm:h-72 aspect-square relative rounded-2xl overflow-hidden cursor-grab active:cursor-grabbing select-none touch-none shadow-inner border"
            style={{
              backgroundColor: '#0A0D0B',
              borderColor: theme.border,
            }}
          >
            {/* The Image undergoing CSS transforms */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <img
                ref={imageRef}
                src={imageSrc}
                alt="Source preview"
                onLoad={handleImageLoad}
                crossOrigin="anonymous"
                draggable={false}
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) rotate(${rotation}deg) scale(${zoom})`,
                  transformOrigin: 'center center',
                  transition: activePointersRef.current.size > 0 ? 'none' : 'transform 0.05s ease-out',
                  maxWidth: 'none',
                  maxHeight: 'none',
                  ...(naturalSize.width >= naturalSize.height
                    ? { height: '100%', width: 'auto' }
                    : { width: '100%', height: 'auto' }),
                  opacity: imageLoaded ? 1 : 0,
                }}
                className="pointer-events-none select-none"
              />
            </div>

            {/* Circular Guide Mask with dark backdrop cutout */}
            <svg
              className="absolute inset-0 w-full h-full pointer-events-none z-10"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              <defs>
                <mask id="crop-circle-mask">
                  <rect width="100" height="100" fill="white" />
                  <circle cx="50" cy="50" r="48" fill="black" />
                </mask>
              </defs>
              {/* Outer dimmed shade */}
              <rect
                width="100" height="100"
                fill="rgba(0, 0, 0, 0.65)"
                mask="url(#crop-circle-mask)"
              />
              {/* Subtle alignment crosshair / grid */}
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke={theme.ringColor}
                strokeWidth="1.2"
                strokeDasharray="2.5 2.5"
                opacity="0.85"
              />
              <circle
                cx="50" cy="50" r="48"
                fill="none"
                stroke="#FFFFFF"
                strokeWidth="0.5"
                opacity="0.3"
              />
            </svg>

            {/* Loading Indicator */}
            {!imageLoaded && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
                <span
                  className="material-symbols-outlined text-2xl animate-spin"
                  style={{ color: theme.accent }}
                >
                  progress_activity
                </span>
              </div>
            )}
          </div>

          {/* Adjustment Controls */}
          <div className="w-full mt-4 space-y-3 px-1">
            {/* Zoom Slider (1x to 3x) - Center Aligned without numeric indicator */}
            <div
              className="p-3 rounded-2xl border flex items-center justify-center gap-3"
              style={{
                backgroundColor: theme.cardBg,
                borderColor: theme.border,
              }}
            >
              <span
                className="material-symbols-outlined text-base shrink-0"
                style={{ color: theme.subtext }}
              >
                zoom_out
              </span>
              <input
                type="range"
                min="1"
                max="3"
                step="0.02"
                value={zoom}
                disabled={isBusy}
                onChange={(e) => setZoom(Number(parseFloat(e.target.value).toFixed(2)))}
                className="w-full max-w-[220px] sm:max-w-[260px] h-1.5 rounded-lg appearance-none cursor-pointer disabled:opacity-50"
                style={{
                  accentColor: theme.accent,
                  backgroundColor: theme.sliderTrack,
                }}
                aria-label="Zoom control"
              />
              <span
                className="material-symbols-outlined text-base shrink-0"
                style={{ color: theme.subtext }}
              >
                zoom_in
              </span>
            </div>

            {/* Quick Actions: Rotate & Reset */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={handleRotate}
                className="flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 cursor-pointer disabled:opacity-40"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
                title="Rotate"
              >
                <span className="material-symbols-outlined text-base">rotate_right</span>
                <span>Rotate</span>
              </button>

              <button
                type="button"
                disabled={isBusy || (zoom === 1 && rotation === 0 && pan.x === 0 && pan.y === 0)}
                onClick={handleReset}
                className="flex-1 py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 text-xs font-semibold transition-all hover:bg-white/5 active:scale-95 cursor-pointer disabled:opacity-40"
                style={{
                  backgroundColor: theme.cardBg,
                  borderColor: theme.border,
                  color: theme.text,
                }}
                title="Reset zoom and position"
              >
                <span className="material-symbols-outlined text-base">restart_alt</span>
                <span>Reset</span>
              </button>
            </div>
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div
          className="flex items-center justify-end gap-2.5 px-5 py-4 border-t"
          style={{ borderColor: theme.border }}
        >
          <button
            type="button"
            disabled={isBusy}
            onClick={() => {
              sound.playTap();
              onClose();
            }}
            className="py-2.5 px-4 rounded-xl border text-xs font-semibold transition-colors hover:bg-white/5 cursor-pointer disabled:opacity-40"
            style={{
              borderColor: theme.border,
              color: theme.subtext,
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={handleCropAndApply}
            className="py-2.5 px-5 rounded-xl text-xs font-semibold text-white shadow-md flex items-center gap-2 transition-all active:scale-95 cursor-pointer disabled:opacity-60"
            style={{
              backgroundColor: theme.accent,
            }}
            onMouseEnter={(e) => {
              if (!isBusy) (e.currentTarget.style.backgroundColor = theme.accentHover);
            }}
            onMouseLeave={(e) => {
              if (!isBusy) (e.currentTarget.style.backgroundColor = theme.accent);
            }}
          >
            {isBusy ? (
              <>
                <span className="material-symbols-outlined text-sm animate-spin">
                  progress_activity
                </span>
                <span>Applying Crop...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-sm">check</span>
                <span>Crop & Apply</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
