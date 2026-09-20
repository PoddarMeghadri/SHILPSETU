import React, { useState, useEffect, useRef } from 'react';
import { ProductItem, ScreenId, LanguageCode } from '../../types';
import { sound } from '../../services/sound';
import { PotterWheelSpinner } from '../common/PotterWheelSpinner';
import { SuccessModal } from '../common/SuccessModal';
import { useTranslation } from '../../services/translations';
import { AIProductDetailsModal } from './AIProductDetailsModal';

interface AIStudioScreenProps {
  products: ProductItem[];
  onNavigate: (screen: ScreenId) => void;
  onSelectProductForCatalog?: (prod: ProductItem) => void;
  onAddProduct?: (prod: ProductItem) => void;
  onUpdateProduct?: (prod: ProductItem) => void;
  language?: LanguageCode;
  isDark?: boolean;
}

type DeviceCategory = 'mobile' | 'tablet' | 'pc';
type AspectRatioOption = '1:1' | '4:3' | '16:9' | '9:16';

const getDeviceCategory = (): DeviceCategory => {
  if (typeof window === 'undefined') return 'pc';
  const width = window.innerWidth;
  if (width < 768) return 'mobile';
  if (width < 1024) return 'tablet';
  return 'pc';
};

const getViewfinderClass = (ratio: AspectRatioOption, device: DeviceCategory): string => {
  if (device === 'mobile') {
    switch (ratio) {
      case '1:1':
        return 'aspect-square max-w-[340px]';
      case '4:3':
        return 'aspect-[4/3] max-w-[360px]';
      case '9:16':
      default:
        return 'aspect-[9/16] max-w-[280px]';
    }
  }

  if (device === 'tablet') {
    switch (ratio) {
      case '1:1':
        return 'aspect-square max-w-[420px]';
      case '4:3':
        return 'aspect-[4/3] max-w-[520px]';
      case '16:9':
      default:
        return 'aspect-[16/9] max-w-[680px]';
    }
  }

  // PC / Desktop (>= 1024px)
  switch (ratio) {
    case '1:1':
      return 'aspect-square max-w-[420px]';
    case '4:3':
      return 'aspect-[4/3] max-w-[560px]';
    case '16:9':
    default:
      return 'aspect-[16/9] max-w-[700px]';
  }
};

const LIGHTING_PRESETS = [
  {
    id: 'soft_cinematic',
    labelKey: 'lighting_soft_cinematic',
    defaultLabel: 'Soft Cinematic',
    icon: 'wb_incandescent',
    cssFilter: 'contrast(106%) brightness(103%) saturate(118%) sepia(8%)',
  },
  {
    id: 'clean_neutral',
    labelKey: 'lighting_direct_sunlight',
    defaultLabel: 'Direct Sunlight',
    icon: 'wb_sunny',
    cssFilter: 'contrast(116%) brightness(112%) saturate(125%)',
  },
  {
    id: 'texture_macro',
    labelKey: 'lighting_heritage_museum',
    defaultLabel: 'High Detail Macro',
    icon: 'texture',
    cssFilter: 'contrast(130%) brightness(100%) saturate(110%)',
  },
  {
    id: 'photorealistic',
    labelKey: 'lighting_boutique_gallery',
    defaultLabel: 'Editorial Polish',
    icon: 'auto_awesome',
    cssFilter: 'contrast(112%) brightness(106%) saturate(108%)',
  },
];

const RELIABLE_CRAFT_FALLBACK =
  'https://images.unsplash.com/photo-1534349762230-e0cadf78f5da?w=800&auto=format&fit=crop&q=80';

export const AIStudioScreen: React.FC<AIStudioScreenProps> = ({
  products,
  onNavigate,
  onSelectProductForCatalog,
  onAddProduct,
  onUpdateProduct,
  isDark = false,
}) => {
  const { t } = useTranslation();
  const [deviceCategory, setDeviceCategory] = useState<DeviceCategory>(getDeviceCategory);
  const [activeTab, setActiveTab] = useState<'camera' | 'gallery'>('camera');
  const [selectedProduct, setSelectedProduct] = useState<ProductItem>(products[0] || ({} as ProductItem));
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [showGrid, setShowGrid] = useState<boolean>(true);
  const [activeLighting, setActiveLighting] = useState<string>('soft_cinematic');
  const [aspectRatio, setAspectRatio] = useState<AspectRatioOption>('1:1');
  const [showSuccess, setShowSuccess] = useState<boolean>(false);
  const [studioProducts, setStudioProducts] = useState<ProductItem[]>(products);
  const [viewfinderImage, setViewfinderImage] = useState<string>(
    'https://images.unsplash.com/photo-1578749556568-bc2c40e68b61?w=800&auto=format&fit=crop&q=80'
  );

  // Device Camera States
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [cameraFacingMode, setCameraFacingMode] = useState<'environment' | 'user'>('environment');
  const [isFlashOn, setIsFlashOn] = useState<boolean>(false);
  const [showScreenFlash, setShowScreenFlash] = useState<boolean>(false);
  const [cameraPermissionStatus, setCameraPermissionStatus] = useState<'prompt' | 'granted' | 'denied' | 'unknown'>('unknown');
  const [availableBackCameras, setAvailableBackCameras] = useState<
    { deviceId: string; label: string; isMain: boolean }[]
  >([]);
  const [selectedBackCameraId, setSelectedBackCameraId] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState<boolean>(false);

  // Post-capture Details Modal States (Typing or Voice)
  const [showDetailsModal, setShowDetailsModal] = useState<boolean>(false);
  const [pendingCapturedImage, setPendingCapturedImage] = useState<string>('');
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const lightingScrollRef = useRef<HTMLDivElement>(null);
  const isFlashOnRef = useRef<boolean>(false);
  isFlashOnRef.current = isFlashOn;
  const isStartingCameraRef = useRef<boolean>(false);
  const hasSelectedSpecificLensRef = useRef<boolean>(false);

  // Responsive device listener for viewport resize and orientation changes
  useEffect(() => {
    const handleResize = () => {
      const cat = getDeviceCategory();
      setDeviceCategory((prev) => {
        if (prev !== cat) {
          if (cat === 'mobile' && aspectRatio === '16:9') {
            setAspectRatio('9:16');
          } else if (cat !== 'mobile' && aspectRatio === '9:16') {
            setAspectRatio('16:9');
          }
          return cat;
        }
        return prev;
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [aspectRatio]);

  // Ensure aspect ratio is appropriate for current device category
  useEffect(() => {
    if (deviceCategory === 'mobile' && aspectRatio === '16:9') {
      setAspectRatio('9:16');
    } else if (deviceCategory !== 'mobile' && aspectRatio === '9:16') {
      setAspectRatio('16:9');
    }
  }, [deviceCategory, aspectRatio]);

  // Auto-scroll lighting presets back to beginning
  useEffect(() => {
    const scrollToStart = () => {
      if (lightingScrollRef.current) {
        lightingScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
      }
    };
    scrollToStart();
    const timer = setTimeout(scrollToStart, 60);
    return () => clearTimeout(timer);
  }, [aspectRatio, deviceCategory]);

  const availableRatios =
    deviceCategory === 'mobile'
      ? (['1:1', '4:3', '9:16'] as const)
      : (['1:1', '4:3', '16:9'] as const);

  useEffect(() => {
    setStudioProducts(products);
    if (!products.some((p) => p.id === selectedProduct?.id) && products.length > 0) {
      setSelectedProduct(products[0]);
    }
  }, [products, selectedProduct]);

  // Reliable torch constraint applier for mobile hardware
  const applyTorchConstraint = async (track: MediaStreamTrack, enabled: boolean): Promise<boolean> => {
    try {
      if (!track || track.readyState !== 'live') {
        console.warn('[AI Studio] Cannot apply torch: track not live');
        return false;
      }

      console.log('[AI Studio] Applying torch constraint, enabled =', enabled, 'track:', track.label);

      // Attempt 1: Standard W3C advanced constraint (Chromium / Android standard)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ torch: enabled }],
        });
        console.log('[AI Studio] Torch successfully applied via advanced: [{ torch: ' + enabled + ' }]');
        return true;
      } catch (errAdv) {
        console.warn('[AI Studio] advanced [{ torch }] failed:', errAdv);
      }

      // Attempt 2: Direct root constraint (vendor WebViews & custom Chromium builds)
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          torch: enabled,
        });
        console.log('[AI Studio] Torch successfully applied via root torch: ' + enabled);
        return true;
      } catch (errRoot) {
        console.warn('[AI Studio] root torch failed:', errRoot);
      }

      // Attempt 3: Vendor fillLightMode if supported
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (track as any).applyConstraints({
          advanced: [{ fillLightMode: enabled ? 'torch' : 'off' } as any],
        });
        console.log('[AI Studio] Torch applied via fillLightMode');
        return true;
      } catch (errFill) {}

      return false;
    } catch (err: any) {
      console.warn('[AI Studio] applyTorchConstraint notice:', err?.message || err);
      return false;
    }
  };

  // Discover and catalog all available rear camera sensors to isolate the Main Camera (with triple-flash)
  const discoverCameraLenses = async (activeTrack?: MediaStreamTrack) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter((d) => d.kind === 'videoinput');
      console.log('[AI Studio] Enumerated camera sensors:', videoDevices);

      // Filter for rear/back cameras
      const backSensors = videoDevices.filter((d) => {
        const lbl = (d.label || '').toLowerCase();
        // Disqualify front sensors
        if (
          lbl.includes('front') ||
          lbl.includes('user') ||
          lbl.includes('selfie') ||
          lbl.includes('camera 1') ||
          lbl.includes('camera2 1')
        ) {
          return false;
        }
        // Accept rear sensors
        return (
          lbl.includes('back') ||
          lbl.includes('rear') ||
          lbl.includes('environment') ||
          lbl.includes('camera 0') ||
          lbl.includes('camera2 0') ||
          lbl.includes('0') ||
          lbl === ''
        );
      });

      // Sort: Camera 0 / "0, facing back" / Main camera ALWAYS gets index 0
      // In Android Camera2 API, Camera 0 is the primary sensor that commands the full multi-LED / triple flash!
      backSensors.sort((a, b) => {
        const aLbl = a.label.toLowerCase();
        const bLbl = b.label.toLowerCase();
        const aIsMain =
          aLbl.includes(' 0') ||
          aLbl.includes('camera 0') ||
          aLbl.includes('camera2 0') ||
          aLbl.includes('main');
        const bIsMain =
          bLbl.includes(' 0') ||
          bLbl.includes('camera 0') ||
          bLbl.includes('camera2 0') ||
          bLbl.includes('main');
        if (aIsMain && !bIsMain) return -1;
        if (!aIsMain && bIsMain) return 1;
        return 0;
      });

      const formatted = backSensors.map((d, index) => ({
        deviceId: d.deviceId,
        label: d.label || `Back Camera ${index + 1}`,
        isMain: index === 0,
      }));

      setAvailableBackCameras(formatted);

      if (formatted.length > 0 && !selectedBackCameraId) {
        setSelectedBackCameraId(formatted[0].deviceId);
      }

      // If active track is currently using a secondary sensor (like ultra-wide or macro) instead of the main sensor,
      // switch to the Main Camera (Camera 0) so the 3-flash array activates
      if (
        cameraFacingMode === 'environment' &&
        !hasSelectedSpecificLensRef.current &&
        formatted.length > 1 &&
        activeTrack &&
        activeTrack.getSettings().deviceId !== formatted[0].deviceId
      ) {
        console.log('[AI Studio] Promoting to primary rear camera (Camera 0) for triple-flash array');
        hasSelectedSpecificLensRef.current = true;
        setSelectedBackCameraId(formatted[0].deviceId);
        setTimeout(() => {
          startCamera('environment', formatted[0].deviceId);
        }, 100);
      }
    } catch (err) {
      console.warn('[AI Studio] Lens enumeration error:', err);
    }
  };

  // Robust Camera Startup with hardware release delays, race-condition locking, and automatic retry
  const startCamera = async (
    facing: 'environment' | 'user' = cameraFacingMode,
    targetDeviceId?: string
  ) => {
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
      setIsCameraActive(false);
      setCameraError('Camera API not supported in this browser.');
      return;
    }

    // Mutex locking: prevent overlapping parallel calls
    if (isStartingCameraRef.current) {
      console.log('[AI Studio] Camera startup already in progress, avoiding collision');
      return;
    }
    isStartingCameraRef.current = true;
    setIsStartingCamera(true);
    setCameraError(null);

    // 1. Cleanly stop old stream & wait for Android Camera Service hardware release
    if (streamRef.current) {
      const oldTrack = streamRef.current.getVideoTracks()[0];
      if (oldTrack) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (oldTrack as any).applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
        } catch (_) {}
      }
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      // Critical delay: Android cameraserver needs ~150ms to release hardware lock before next acquire
      await new Promise((resolve) => setTimeout(resolve, 150));
    }

    try {
      const chosenBackId =
        targetDeviceId || (facing === 'environment' ? selectedBackCameraId : null);

      // Build progressive constraint list
      const candidateList: MediaStreamConstraints[] = [];

      if (facing === 'environment' && chosenBackId) {
        // Option 1: Explicit Target Device ID (Main Back Camera with triple flash)
        candidateList.push({
          video: {
            deviceId: { exact: chosenBackId },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        candidateList.push({
          video: {
            deviceId: { exact: chosenBackId },
          },
          audio: false,
        });
      }

      if (facing === 'environment') {
        // Option 2: High-res environment facing mode
        candidateList.push({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        // Option 3: Exact environment
        candidateList.push({
          video: {
            facingMode: { exact: 'environment' },
          },
          audio: false,
        });
        // Option 4: Simple environment
        candidateList.push({
          video: {
            facingMode: 'environment',
          },
          audio: false,
        });
      } else {
        // Front Camera
        candidateList.push({
          video: {
            facingMode: { ideal: 'user' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });
        candidateList.push({
          video: {
            facingMode: 'user',
          },
          audio: false,
        });
      }

      // Generic Fallback
      candidateList.push({
        video: true,
        audio: false,
      });

      let stream: MediaStream | null = null;
      let lastErr: any = null;

      for (let i = 0; i < candidateList.length; i++) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(candidateList[i]);
          if (stream) break;
        } catch (err: any) {
          lastErr = err;
          // If Android returned NotReadableError or AbortError, hardware was momentarily busy
          if (err?.name === 'NotReadableError' || err?.name === 'AbortError') {
            await new Promise((r) => setTimeout(r, 250));
          }
        }
      }

      // If still failed and it was hardware contention (NotReadableError), perform one automatic retry after 400ms
      if (!stream && (lastErr?.name === 'NotReadableError' || lastErr?.name === 'AbortError')) {
        console.log('[AI Studio] Android camera was busy, running delayed recovery retry...');
        await new Promise((r) => setTimeout(r, 400));
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: facing === 'environment' ? { facingMode: 'environment' } : true,
            audio: false,
          });
        } catch (retryErr: any) {
          lastErr = retryErr;
        }
      }

      if (!stream) {
        setIsCameraActive(false);
        if (lastErr?.name === 'NotAllowedError' || lastErr?.name === 'PermissionDeniedError') {
          setCameraPermissionStatus('denied');
          setCameraError('Camera access was denied. Please allow camera in browser site settings.');
        } else {
          setCameraError('Camera sensor is currently busy or unavailable. Tap below to retry.');
        }
        return;
      }

      streamRef.current = stream;
      setCameraPermissionStatus('granted');
      setCameraError(null);

      // Attach stream to video element
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        try {
          await videoRef.current.play();
        } catch (playErr) {
          console.warn('[AI Studio] Auto-play deferred to user gesture:', playErr);
        }
      }
      setIsCameraActive(true);

      const activeTrack = stream.getVideoTracks()[0];
      if (activeTrack) {
        // Enumerate devices to populate lenses list and check for primary camera
        discoverCameraLenses(activeTrack);

        // If flash was turned on by user, activate physical torch immediately
        if (isFlashOnRef.current) {
          console.log('[AI Studio] Flash is active, engaging physical torch...');
          applyTorchConstraint(activeTrack, true);
          setTimeout(() => {
            if (isFlashOnRef.current && activeTrack.readyState === 'live') {
              applyTorchConstraint(activeTrack, true);
            }
          }, 250);
        }
      }
    } catch (err: any) {
      console.warn('[AI Studio] Camera startup exception:', err?.name, err?.message);
      setIsCameraActive(false);
      setCameraError(err?.message || 'Unable to start camera.');
    } finally {
      isStartingCameraRef.current = false;
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (track as any).applyConstraints({ advanced: [{ torch: false }] }).catch(() => {});
        } catch (_) {}
      }
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraActive(false);
    setIsFlashOn(false);
  };

  // Switch specifically between rear camera lenses (Main with Triple Flash vs Auxiliary)
  const handleSelectLens = async (deviceId: string) => {
    sound.playTap();
    hasSelectedSpecificLensRef.current = true;
    setSelectedBackCameraId(deviceId);
    await startCamera('environment', deviceId);
  };

  // Launch camera when in camera tab; listen to browser permissions & focus
  useEffect(() => {
    let permissionStatusObj: PermissionStatus | null = null;
    let pollInterval: any = null;

    const tryActivateCamera = () => {
      if (activeTab === 'camera' && !streamRef.current) {
        console.log('[AI Studio] Immediate camera startup triggered');
        startCamera(cameraFacingMode, selectedBackCameraId || undefined);
      }
    };

    if (activeTab === 'camera') {
      startCamera(cameraFacingMode, selectedBackCameraId || undefined);
    } else {
      stopCamera();
    }

    // Check and observe browser camera permissions
    if (typeof navigator !== 'undefined' && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: 'camera' as PermissionName })
        .then((status) => {
          permissionStatusObj = status;
          setCameraPermissionStatus(status.state as any);
          if (status.state === 'granted') {
            tryActivateCamera();
          }
          status.onchange = () => {
            setCameraPermissionStatus(status.state as any);
            // If user previously saw permission prompt and now granted it, immediately start camera
            if (status.state === 'granted') {
              tryActivateCamera();
            }
          };
        })
        .catch(() => {});
    }

    // Polling backup: Check if permission changed from prompt/denied to granted while user was on page
    if (activeTab === 'camera') {
      pollInterval = setInterval(() => {
        if (!streamRef.current && typeof navigator !== 'undefined' && navigator.permissions?.query) {
          navigator.permissions
            .query({ name: 'camera' as PermissionName })
            .then((s) => {
              if (s.state === 'granted' && !streamRef.current) {
                setCameraPermissionStatus('granted');
                tryActivateCamera();
              }
            })
            .catch(() => {});
        }
      }, 1000);
    }

    // When window re-gains focus (e.g. user allowed camera in browser prompt/settings and returned)
    const handleFocusOrVisible = () => {
      if (document.visibilityState === 'visible') {
        tryActivateCamera();
      }
    };
    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    return () => {
      if (pollInterval) clearInterval(pollInterval);
      if (permissionStatusObj) {
        permissionStatusObj.onchange = null;
      }
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      stopCamera();
    };
  }, [activeTab]);

  // Ensure video element always stays bound to streamRef
  useEffect(() => {
    if (videoRef.current && streamRef.current && videoRef.current.srcObject !== streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [isCameraActive]);

  // Turn / Flip Camera between rear (environment) and front (user)
  const handleFlipCamera = async () => {
    sound.playTap();
    const nextFacing = cameraFacingMode === 'environment' ? 'user' : 'environment';
    setCameraFacingMode(nextFacing);
    await startCamera(
      nextFacing,
      nextFacing === 'environment' ? selectedBackCameraId || undefined : undefined
    );
  };

  // Toggle Flash / Torch Mode
  const handleToggleFlash = async () => {
    sound.playTap();
    const nextFlash = !isFlashOn;
    setIsFlashOn(nextFlash);
    isFlashOnRef.current = nextFlash;

    if (streamRef.current) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track) {
        console.log('[AI Studio] Toggling physical torch to:', nextFlash);
        await applyTorchConstraint(track, nextFlash);
      }
    } else {
      // If camera is not yet active, start camera (torch will activate once stream starts)
      startCamera(cameraFacingMode, selectedBackCameraId || undefined);
    }
  };

  // Helper to convert ImageCapture Blob to filtered high-resolution DataURL
  const processBlobToDataUrl = async (
    blob: Blob,
    filter: string,
    isUserFacing: boolean
  ): Promise<string> => {
    const canvas = canvasRef.current || document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Method A: Modern high-performance createImageBitmap
    if (typeof createImageBitmap === 'function') {
      try {
        const bitmap = await createImageBitmap(blob);
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        if (ctx) {
          if (filter && filter !== 'none') {
            ctx.filter = filter;
          }
          if (isUserFacing) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
          return canvas.toDataURL('image/jpeg', 0.95);
        }
      } catch (bitmapErr) {
        console.warn('[AI Studio] createImageBitmap failed, falling back to Image element:', bitmapErr);
      }
    }

    // Method B: HTMLImageElement with Blob URL
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(blob);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        if (ctx) {
          if (filter && filter !== 'none') {
            ctx.filter = filter;
          }
          if (isUserFacing) {
            ctx.translate(canvas.width, 0);
            ctx.scale(-1, 1);
          }
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.95));
        } else {
          resolve(objectUrl);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        // Method C: FileReader base64 fallback
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => resolve(viewfinderImage);
        reader.readAsDataURL(blob);
      };
      img.src = objectUrl;
    });
  };

  // Capture photo using native W3C ImageCapture API (triggering synchronous multi-LED flash burst)
  // with graceful HTML5 video canvas snapshot fallback
  const captureFrame = async (uploadedUrl?: string): Promise<string> => {
    if (uploadedUrl) {
      return uploadedUrl;
    }

    const currentPreset =
      LIGHTING_PRESETS.find((p) => p.id === activeLighting) || LIGHTING_PRESETS[0];

    // Method 1: Native W3C ImageCapture API
    // This instructs native Android / mobile HAL to fire ALL flash LEDs (multi-LED / dual-tone)
    // synchronously at full driving current for high-intensity exposure, matching the native camera app.
    if (
      typeof window !== 'undefined' &&
      'ImageCapture' in window &&
      isCameraActive &&
      streamRef.current
    ) {
      const track = streamRef.current.getVideoTracks()[0];
      if (track && track.readyState === 'live') {
        try {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const imageCapture = new (window as any).ImageCapture(track);
          let photoBlob: Blob | null = null;

          if (isFlashOnRef.current) {
            console.log('[AI Studio] Triggering exposure with synchronous multi-LED flash burst...');
            try {
              // Primary W3C standard: fillLightMode 'flash' triggers the multi-LED exposure burst
              photoBlob = await imageCapture.takePhoto({ fillLightMode: 'flash' });
            } catch (errFlash) {
              console.warn('[AI Studio] takePhoto fillLightMode flash threw, trying on:', errFlash);
              try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                photoBlob = await imageCapture.takePhoto({ fillLightMode: 'on' as any });
              } catch (errOn) {
                console.warn('[AI Studio] takePhoto fillLightMode on threw, trying auto:', errOn);
                try {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  photoBlob = await imageCapture.takePhoto({ fillLightMode: 'auto' as any });
                } catch (errAuto) {
                  console.warn('[AI Studio] takePhoto fillLightMode auto threw, trying unconstrained:', errAuto);
                  photoBlob = await imageCapture.takePhoto();
                }
              }
            }
          } else {
            console.log('[AI Studio] Capturing photo with flash disengaged...');
            try {
              photoBlob = await imageCapture.takePhoto({ fillLightMode: 'off' });
            } catch (_) {
              photoBlob = await imageCapture.takePhoto();
            }
          }

          if (photoBlob) {
            console.log('[AI Studio] Native photo captured successfully, size:', photoBlob.size);
            return await processBlobToDataUrl(
              photoBlob,
              currentPreset.cssFilter,
              cameraFacingMode === 'user'
            );
          }
        } catch (imgCapError) {
          console.warn(
            '[AI Studio] ImageCapture takePhoto failed, falling back to canvas video snapshot:',
            imgCapError
          );
        }
      }
    }

    // Method 2: Graceful Fallback - HTML5 Video Canvas Snapshot
    const canvas = canvasRef.current || document.createElement('canvas');
    if (isCameraActive && videoRef.current && videoRef.current.videoWidth > 0) {
      const video = videoRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        if (currentPreset.cssFilter && currentPreset.cssFilter !== 'none') {
          ctx.filter = currentPreset.cssFilter;
        }
        if (cameraFacingMode === 'user') {
          ctx.translate(canvas.width, 0);
          ctx.scale(-1, 1);
        }
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        return canvas.toDataURL('image/jpeg', 0.95);
      }
    }

    return viewfinderImage;
  };

  // Handle Capture button click
  const handleCapture = async (capturedImageOverride?: string) => {
    if (isCapturing || isProcessing) return;
    setIsCapturing(true);

    sound.playShutter();

    // Trigger visual screen flash effect (serves as immediate visual feedback and screen-flash fallback)
    setShowScreenFlash(true);
    setTimeout(() => setShowScreenFlash(false), 220);

    try {
      const imageResult = await captureFrame(capturedImageOverride);
      setPendingCapturedImage(imageResult);
      setIsProcessing(true);

      setTimeout(() => {
        setIsProcessing(false);
        setIsCapturing(false);
        sound.playSuccess();
        // Open Product Details Modal where artisan can type or speak details
        setShowDetailsModal(true);
      }, 1200);
    } catch (err) {
      console.error('[AI Studio] handleCapture error:', err);
      setIsCapturing(false);
      setIsProcessing(false);
    }
  };

  // Custom photo upload simulation
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const uploadedUrl = event.target?.result as string;
        setViewfinderImage(uploadedUrl);
        handleCapture(uploadedUrl);
      };
      reader.readAsDataURL(file);
    }
  };

  // Save completed product from the typing/voice modal
  const handleSaveProductFromModal = (newCraftItem: ProductItem) => {
    if (editingProduct) {
      onUpdateProduct?.({ ...editingProduct, ...newCraftItem, id: editingProduct.id });
      setEditingProduct(null);
      setShowDetailsModal(false);
      return;
    }
    setShowDetailsModal(false);
    setStudioProducts((prev) => [newCraftItem, ...prev]);
    if (onAddProduct) {
      onAddProduct(newCraftItem);
    }
    setActiveTab('gallery');
    setShowSuccess(true);
  };

  const currentPreset =
    LIGHTING_PRESETS.find((p) => p.id === activeLighting) || LIGHTING_PRESETS[0];

  return (
    <div className="w-full max-w-7xl mx-auto pb-28 md:pb-12 pt-2 px-3 sm:px-6 lg:px-8 space-y-6">
      {/* Hidden canvas for video frame extraction */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Sub-navigation pill tabs - 2 options: AI Viewfinder & Studio Gallery */}
      <div className="flex justify-center">
        <div
          className={`flex p-1 rounded-2xl border w-full max-w-md ${
            isDark ? 'bg-[#1C221A] border-[#2D3A2B]' : 'bg-[#EFE4CF] border-[#22331E]/10'
          }`}
        >
          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('camera');
            }}
            className={`flex-1 py-2.5 text-xs font-serif font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'camera'
                ? 'bg-[#B5451B] text-white shadow-xs'
                : isDark
                ? 'text-[#F4ECDE]/70 hover:text-white'
                : 'text-[#22331E]/70 hover:text-[#1A1815]'
            }`}
          >
            {t('ai_viewfinder', 'AI Viewfinder')}
          </button>

          <button
            onClick={() => {
              sound.playTap();
              setActiveTab('gallery');
            }}
            className={`flex-1 py-2.5 text-xs font-serif font-bold rounded-xl transition-all cursor-pointer ${
              activeTab === 'gallery'
                ? 'bg-[#B5451B] text-white shadow-xs'
                : isDark
                ? 'text-[#F4ECDE]/70 hover:text-white'
                : 'text-[#22331E]/70 hover:text-[#1A1815]'
            }`}
          >
            {t('studio_gallery', 'Studio Gallery')}
          </button>
        </div>
      </div>

      {/* AI Processing Shimmer Loader State */}
      {isProcessing && (
        <div
          className={`rounded-3xl p-7 text-center space-y-4 border shadow-2xl ${
            isDark
              ? 'bg-[#1C221A] text-[#F4ECDE] border-[#2D3A2B]'
              : 'bg-[#22331E] text-[#F4ECDE] border-[#E8B84B]/40'
          }`}
        >
          <PotterWheelSpinner size="lg" text={t('enhancing_photo', 'Enhancing Photo with AI Studio...')} />

          <div className="space-y-1.5 px-2">
            <h4 className="font-serif font-bold text-base text-white">
              {t('studio_photo_title', 'Professional Studio Product Photography')}
            </h4>
            <p className="text-xs text-white/80 font-sans leading-relaxed">
              Applying {currentPreset.defaultLabel} lighting, 4K resolution enhancement, and sharp texture preservation.
            </p>
          </div>

          <div className="w-full h-2 rounded-full overflow-hidden shimmer-gold" />
        </div>
      )}

      {/* TAB 1: AI VIEWFINDER / CAMERA MODE */}
      {activeTab === 'camera' && !isProcessing && (
        <div className="w-full flex flex-col items-center space-y-4">
          <div
            className={`relative w-full ${getViewfinderClass(
              aspectRatio,
              deviceCategory
            )} bg-[#1A1815] rounded-3xl overflow-hidden border-2 border-[#D9A441]/40 shadow-2xl flex flex-col justify-between p-3.5 sm:p-4 transition-all duration-300 ease-out`}
            style={{
              aspectRatio:
                aspectRatio === '1:1'
                  ? '1 / 1'
                  : aspectRatio === '4:3'
                  ? '4 / 3'
                  : aspectRatio === '9:16'
                  ? '9 / 16'
                  : '16 / 9',
            }}
          >
            {/* Live Camera Video Feed (Always mounted so videoRef and media stream bind immediately) */}
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{ filter: currentPreset.cssFilter }}
              onLoadedMetadata={() => {
                videoRef.current?.play().catch(() => {});
              }}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                isCameraActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
              } ${cameraFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
            />

            {/* Connecting Spinner Overlay */}
            {isStartingCamera && (
              <div className="absolute inset-0 z-25 bg-black/60 backdrop-blur-xs flex flex-col items-center justify-center p-4 text-center">
                <div className="w-10 h-10 border-3 border-[#E8B84B] border-t-transparent rounded-full animate-spin mb-2" />
                <p className="text-xs font-serif font-bold text-white">
                  {cameraFacingMode === 'environment'
                    ? 'Connecting to Back Camera...'
                    : 'Connecting to Front Camera...'}
                </p>
                <p className="text-[10px] text-white/70 mt-0.5">
                  Synchronizing multi-sensor lenses and flash hardware
                </p>
              </div>
            )}

            {/* Fallback & Tap-to-Activate View when camera is inactive or awaiting permission */}
            {!isCameraActive && !isStartingCamera && (
              <div
                onClick={() => startCamera(cameraFacingMode, selectedBackCameraId || undefined)}
                className="absolute inset-0 w-full h-full cursor-pointer group z-10"
                title="Tap to activate camera"
              >
                <img
                  src={viewfinderImage}
                  alt="Live Viewfinder"
                  style={{ filter: currentPreset.cssFilter }}
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = RELIABLE_CRAFT_FALLBACK;
                  }}
                  className="w-full h-full object-cover opacity-80 transition-all duration-300 group-hover:opacity-90"
                />
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center p-4 text-center">
                  <div className="w-12 h-12 rounded-full bg-[#B5451B] text-white flex items-center justify-center mb-2 shadow-lg group-hover:scale-110 transition-transform">
                    <span className="material-symbols-outlined text-2xl">photo_camera</span>
                  </div>
                  <p className="text-xs font-serif font-bold text-white">
                    {cameraPermissionStatus === 'denied'
                      ? 'Camera Permission Needed'
                      : cameraError
                      ? 'Retry Back Camera'
                      : 'Tap to Activate Back Camera'}
                  </p>
                  <p className="text-[10px] text-white/80 mt-0.5 max-w-[230px]">
                    {cameraPermissionStatus === 'denied'
                      ? 'Please allow camera in your browser site settings and tap here'
                      : cameraError
                      ? cameraError
                      : 'Provide camera permission to preview live crafts'}
                  </p>
                  <div className="mt-2.5 px-3 py-1 rounded-full bg-[#E8B84B] text-[#1A1815] text-[10px] font-bold shadow-md hover:bg-[#d4a53d] transition-colors">
                    Start Back Camera
                  </div>
                </div>
              </div>
            )}

            {/* Flash Active Notification Badge */}
            {isFlashOn && (
              <div className="absolute top-14 left-3.5 z-30 flex items-center gap-1.5 px-3 py-1 rounded-full bg-linear-to-r from-[#E8B84B] via-[#F59E0B] to-[#E8B84B] text-[#1A1815] text-[10px] font-bold shadow-lg animate-pulse border border-white/40">
                <span className="material-symbols-outlined text-sm font-bold">bolt</span>
                <span>FLASH ACTIVE</span>
              </div>
            )}

            {/* Screen Flash Overlay Effect */}
            {showScreenFlash && (
              <div className="absolute inset-0 z-40 bg-white pointer-events-none transition-opacity duration-200" />
            )}

            {/* Framing Grid Overlay */}
            {showGrid && (
              <div className="absolute inset-0 woven-viewfinder pointer-events-none z-10" />
            )}

            {/* Top Camera Controls Bar */}
            <div className="relative z-20 flex items-center justify-between gap-1 sm:gap-2">
              <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                {/* Aspect Ratio Selector */}
                <div className="flex bg-black/60 backdrop-blur-md rounded-full p-1 border border-white/20">
                  {availableRatios.map((ratio) => (
                    <button
                      key={ratio}
                      id={`btn-aspect-${ratio.replace(':', '-')}`}
                      onClick={() => {
                        sound.playTap();
                        setAspectRatio(ratio);
                      }}
                      className={`px-2.5 py-0.5 text-[10px] font-semibold rounded-full transition-colors cursor-pointer ${
                        aspectRatio === ratio ? 'bg-[#E8B84B] text-[#1A1815]' : 'text-white/80 hover:text-white'
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                </div>

                {/* Multi-Lens Selector for Triple-Camera Phones */}
                {cameraFacingMode === 'environment' && availableBackCameras.length > 1 && (
                  <div className="flex bg-black/70 backdrop-blur-md rounded-full p-0.5 border border-white/20 text-[10px]">
                    {availableBackCameras.map((cam, idx) => {
                      const isSelected =
                        selectedBackCameraId === cam.deviceId || (!selectedBackCameraId && idx === 0);
                      return (
                        <button
                          key={cam.deviceId || idx}
                          type="button"
                          onClick={() => handleSelectLens(cam.deviceId)}
                          className={`px-2 py-0.5 rounded-full font-medium transition-all ${
                            isSelected
                              ? 'bg-[#E8B84B] text-[#1A1815] font-bold shadow-xs'
                              : 'text-white/80 hover:text-white'
                          }`}
                          title={cam.label}
                        >
                          {cam.isMain ? 'Main (3-Flash)' : `Lens ${idx + 1}`}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons: Grid, Turn Camera, Flash */}
              <div className="flex items-center gap-2">
                {/* Turn / Flip Camera Button */}
                <button
                  type="button"
                  onClick={handleFlipCamera}
                  className="w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center backdrop-blur-md border border-white/20 cursor-pointer hover:bg-black/80 transition-colors"
                  title="Turn / Flip Camera"
                >
                  <span className="material-symbols-outlined text-base">flip_camera_ios</span>
                </button>

                {/* Framing Grid Toggle */}
                <button
                  type="button"
                  onClick={() => {
                    sound.playTap();
                    setShowGrid(!showGrid);
                  }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border cursor-pointer transition-colors ${
                    showGrid
                      ? 'bg-[#E8B84B] text-[#1A1815] border-[#E8B84B]'
                      : 'bg-black/60 text-white border-white/20'
                  }`}
                  title="Toggle Framing Grid"
                >
                  <span className="material-symbols-outlined text-base">grid_4x4</span>
                </button>

                {/* Flash Toggle */}
                <button
                  type="button"
                  id="btn-viewfinder-flash"
                  onClick={handleToggleFlash}
                  className={`w-8 h-8 rounded-full flex items-center justify-center backdrop-blur-md border cursor-pointer transition-all ${
                    isFlashOn
                      ? 'bg-[#E8B84B] text-[#1A1815] border-[#E8B84B] shadow-md ring-2 ring-[#E8B84B]/60'
                      : 'bg-black/60 text-white border-white/20 hover:bg-black/80'
                  }`}
                  title={isFlashOn ? 'Flash Active' : 'Flash Off'}
                >
                  <span className="material-symbols-outlined text-base">
                    {isFlashOn ? 'flash_on' : 'flash_off'}
                  </span>
                </button>

                {/* Hidden input for camera upload handling */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>
            </div>

            {/* Center Focus Box Indicator */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-20 h-20 sm:w-24 sm:h-24 border-2 border-dashed border-[#E8B84B] rounded-2xl flex flex-col items-center justify-center pointer-events-none animate-pulse">
              <span className="text-[9px] uppercase tracking-widest text-[#E8B84B] font-bold bg-black/70 px-2 py-0.5 rounded">
                {t('focus_locked', 'Sharp Focus Locked')}
              </span>
              <span className="text-[8px] text-white/80 mt-1">
                {isCameraActive ? 'Device Camera Live' : t('geometry_preserved', 'Exact Geometry Preserved')}
              </span>
            </div>

            {/* Bottom Lighting Presets Bar (Soft Cinematic, Direct Sunlight, High Detail Macro, Editorial Polish) */}
            <div className="relative z-20 w-full pt-1 sm:pt-2">
              <div
                ref={lightingScrollRef}
                className="w-full overflow-x-auto no-scrollbar py-1 scroll-smooth"
              >
                <div className="flex items-center gap-2 px-1 sm:px-2 min-w-max justify-start">
                  {LIGHTING_PRESETS.map((light) => (
                    <button
                      key={light.id}
                      id={`btn-lighting-${light.id}`}
                      onClick={() => {
                        sound.playTap();
                        setActiveLighting(light.id);
                        if (light.id === 'soft_cinematic' && lightingScrollRef.current) {
                          lightingScrollRef.current.scrollTo({ left: 0, behavior: 'smooth' });
                        }
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-sans font-medium backdrop-blur-md transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                        activeLighting === light.id
                          ? 'bg-[#B5451B] text-white border-2 border-[#E8B84B] shadow-md'
                          : 'bg-black/75 text-white/95 border border-white/30 hover:bg-black/90'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">{light.icon}</span>
                      <span className="whitespace-nowrap">
                        {t(light.labelKey, light.defaultLabel)}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Shutter & Actions Row */}
          <div className="flex items-center justify-center gap-6 pt-3">
            {/* Gallery Thumbnail Shortcut */}
            <button
              onClick={() => {
                sound.playTap();
                setActiveTab('gallery');
              }}
              className="w-12 h-12 rounded-2xl overflow-hidden border-2 border-[#22331E]/20 shadow-xs hover:scale-105 active:scale-95 transition-transform cursor-pointer"
              title={t('studio_gallery', 'Studio Gallery')}
              id="btn-viewfinder-gallery"
            >
              <img
                src={studioProducts[0]?.polishedImageUrl || RELIABLE_CRAFT_FALLBACK}
                alt="Thumbnail"
                onError={(e) => {
                  (e.currentTarget as HTMLImageElement).src = RELIABLE_CRAFT_FALLBACK;
                }}
                className="w-full h-full object-cover"
              />
            </button>

            {/* Master Capture Button */}
            <button
              onClick={() => handleCapture()}
              disabled={isCapturing || isProcessing}
              className={`w-20 h-20 rounded-full bg-[#B5451B] border-4 border-[#F4ECDE] shadow-xl flex items-center justify-center text-white transition-transform group cursor-pointer ${
                isCapturing || isProcessing ? 'opacity-80 cursor-not-allowed' : 'active:scale-90'
              }`}
              title={t('capture_photo', 'Capture Photo')}
              id="btn-viewfinder-shutter"
            >
              <div className="w-14 h-14 rounded-full border-2 border-[#E8B84B] flex items-center justify-center bg-[#9E3913] group-hover:bg-[#B5451B] transition-colors">
                <span className="material-symbols-outlined text-2xl text-[#E8B84B]">
                  camera
                </span>
              </div>
            </button>

            {/* Upload Button */}
            <button
              type="button"
              onClick={() => {
                sound.playTap();
                fileInputRef.current?.click();
              }}
              className={`w-12 h-12 rounded-2xl flex items-center justify-center border-2 transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer ${
                isDark
                  ? 'bg-[#1C221A] border-[#D4A759]/40 text-[#E8B84B] hover:bg-[#252E22]'
                  : 'bg-[#EFE4CF] border-[#22331E]/20 text-[#B5451B] hover:bg-[#EAE0CC]'
              }`}
              title={t('upload_photo', 'Upload Craft Photo')}
              id="btn-viewfinder-upload"
            >
              <span className="material-symbols-outlined text-2xl">
                upload_file
              </span>
            </button>
          </div>
        </div>
      )}

      {/* TAB 2: STUDIO GALLERY */}
      {activeTab === 'gallery' && !isProcessing && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3
              className={`font-serif font-bold text-lg ${
                isDark ? 'text-[#F4ECDE]' : 'text-[#22331E]'
              }`}
            >
              {t('edit', 'Edit')}
            </h3>
            <span className="text-xs text-[#B5451B] font-sans font-bold">
              {studioProducts.length} {t('crafts_count', 'Crafts')}
            </span>
          </div>

          {studioProducts.length === 0 ? (
            <div className={`rounded-3xl border border-dashed p-6 text-center ${isDark ? 'bg-[#1C221A] border-[#2D3A2B] text-[#F4ECDE]' : 'bg-[#F6EDE1] border-[#22331E]/20 text-[#1A1815]'}`}>
              <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#B5451B]/15 text-[#B5451B]">
                <span className="material-symbols-outlined text-3xl">inventory_2</span>
              </div>
              <h4 className="font-serif font-bold text-base">{t('catalog_empty_title', 'No products in your studio yet')}</h4>
              <p className="mt-2 text-xs opacity-75">
                {t('catalog_empty_desc', 'Capture a photo to create your first catalog item and publish it for buyers.')}
              </p>
              <button
                type="button"
                onClick={() => { sound.playTap(); setActiveTab('camera'); }}
                className="mt-4 rounded-full bg-[#B5451B] px-4 py-2 text-xs font-bold text-white"
              >
                {t('capture_now', 'Capture now')}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {studioProducts.map((prod) => (
                <div
                  key={prod.id}
                  className={`rounded-3xl p-3.5 border flex flex-col justify-between shadow-xs group ${
                    isDark
                      ? 'bg-[#1C221A] border-[#2D3A2B]'
                      : 'bg-[#EFE4CF] border-[#22331E]/10'
                  }`}
                >
                  <div className="w-full aspect-square rounded-2xl overflow-hidden relative mb-2">
                    <img
                      src={prod.polishedImageUrl || prod.rawImageUrl || RELIABLE_CRAFT_FALLBACK}
                      alt={prod.title}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = RELIABLE_CRAFT_FALLBACK;
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    <div className="absolute top-2 right-2 px-2 py-0.5 bg-[#22331E]/90 text-white rounded-full text-[9px] font-bold">
                      ₹{(prod.price ?? 1200).toLocaleString('en-IN')}
                    </div>
                    <div className="absolute bottom-2 left-2 px-1.5 py-0.5 bg-black/70 backdrop-blur-xs text-[8px] font-bold text-[#E8B84B] rounded">
                      {t('studio_4k_badge', '4K Studio')}
                    </div>
                  </div>

                  <h4
                    className={`font-serif font-bold text-xs line-clamp-1 ${
                      isDark ? 'text-[#F4ECDE]' : 'text-[#1A1815]'
                    }`}
                  >
                    {prod.title}
                  </h4>
                  <p className="text-[10px] opacity-70 font-sans mt-0.5">
                    {prod.category} • {prod.stock} {t('in_stock', 'in stock')}
                  </p>

                  <div className="flex gap-1.5 mt-2">
                    <button
                      onClick={() => {
                        sound.playTap();
                        setEditingProduct(prod);
                        setPendingCapturedImage(prod.polishedImageUrl || prod.rawImageUrl || '');
                        setShowDetailsModal(true);
                        if (onSelectProductForCatalog) {
                          onSelectProductForCatalog(prod);
                        }
                      }}
                      className="flex-1 bg-[#B5451B] text-white text-[10px] font-semibold py-2 rounded-xl text-center flex items-center justify-center gap-1 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-xs">edit</span>
                      <span>{t('edit', 'Edit')}</span>
                    </button>
                    <button
                      onClick={() => {
                        sound.playTap();
                        onNavigate('social');
                      }}
                      className={`w-8 h-8 rounded-xl border flex items-center justify-center text-[#25D366] cursor-pointer ${
                        isDark
                          ? 'bg-[#121411] border-[#2D3A2B]'
                          : 'bg-white border-[#22331E]/10'
                      }`}
                    >
                      <span className="material-symbols-outlined text-sm">share</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      {/* Product Details Modal (Typing or Voice) */}
      <AIProductDetailsModal
        isOpen={showDetailsModal}
        onClose={() => setShowDetailsModal(false)}
        capturedImage={pendingCapturedImage}
        lightingFilterName={currentPreset.defaultLabel}
        initialProduct={editingProduct || undefined}
        onSaveProduct={handleSaveProductFromModal}
        isDark={isDark}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccess}
        onClose={() => {
          setShowSuccess(false);
          onNavigate('b2b');
        }}
        onAction={() => {
          setShowSuccess(false);
          onNavigate('b2b');
        }}
        title={t('studio_enhancement_complete', 'Studio Enhancement Complete!')}
        subtitle={t(
          'studio_photo_desc',
          'Soft cinematic lighting, 4k resolution, clean neutral background, sharp focus, exact original object preservation, highly detailed native texture, photorealistic enhancement.'
        )}
        actionText={t('continue_to_sell', 'Continue to Sell')}
        actionLabel={t('continue_to_sell', 'Continue to Sell')}
        isDark={isDark}
      />
    </div>
  );
};
