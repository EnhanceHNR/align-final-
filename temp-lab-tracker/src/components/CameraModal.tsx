"use client";

import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Camera, RefreshCw, X, Check, Repeat } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export function CameraModal({ isOpen, onClose, onCapture }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  const [isCapturing, setIsCapturing] = useState(false);
  const [hasFlash, setHasFlash] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);

  const startCamera = useCallback(async () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }

    try {
      const constraints = {
        video: {
          facingMode: facingMode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }
      };
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }

      // Check for multiple cameras
      const allDevices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = allDevices.filter(device => device.kind === 'videoinput');
      setDevices(videoDevices);
    } catch (err) {
      console.error("Error accessing camera:", err);
    }
  }, [facingMode]);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, startCamera]);

  const toggleCamera = () => {
    setFacingMode(prev => prev === 'user' ? 'environment' : 'user');
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (context) {
      // Trigger flash animation
      setHasFlash(true);
      setTimeout(() => setHasFlash(false), 150);

      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
          onCapture(file);
          onClose();
        }
      }, 'image/jpeg', 0.9);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md p-0 overflow-hidden bg-black border-none rounded-3xl h-[80vh] flex flex-col">
        <DialogHeader className="p-4 absolute top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/60 to-transparent">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white font-bold flex items-center gap-2">
              <Camera className="w-5 h-5" />
              Direct Capture
            </DialogTitle>
            <DialogDescription className="sr-only">
              Use your camera to capture a verification photo for this submission.
            </DialogDescription>
            <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/10 rounded-full">
              <X className="w-6 h-6" />
            </Button>
          </div>
        </DialogHeader>

        <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={cn(
              "w-full h-full object-cover",
              facingMode === 'user' && "scale-x-[-1]"
            )}
          />

          {/* Shutter Flash Effect */}
          {hasFlash && <div className="absolute inset-0 bg-white shutter-flash z-50" />}

          {/* Video Overlays */}
          <div className="absolute inset-x-0 bottom-0 p-8 bg-gradient-to-t from-black/60 to-transparent flex flex-col items-center gap-6">
            <div className="flex items-center gap-12">
              {devices.length > 1 && (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleCamera}
                  className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 backdrop-blur-md"
                >
                  <Repeat className="w-6 h-6" />
                </Button>
              )}

              <button
                onClick={capturePhoto}
                className="w-20 h-20 rounded-full bg-white p-1 text-black flex items-center justify-center active:scale-95 transition-transform"
              >
                <div className="w-full h-full rounded-full border-4 border-black/10 flex items-center justify-center">
                  <div className="w-16 h-16 rounded-full bg-white border-2 border-primary/20" />
                </div>
              </button>

              <div className="w-12 h-12 invisible" /> 
            </div>
          </div>
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  );
}
