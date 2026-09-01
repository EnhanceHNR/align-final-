
'use client';
import { useState, useEffect, useRef, useContext } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Clock, Loader2, Upload } from 'lucide-react';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import type { ClockEvent } from '@/lib/types';
import { AppContext } from '@/context/app-context';
import { format } from 'date-fns';

interface ClockInOutDialogProps {
  isClockedIn: boolean;
  onClockIn: (capture: ClockEvent) => Promise<void> | void;
  onClockOut: (capture: ClockEvent) => Promise<void> | void;
  isResigned?: boolean;
}

export function ClockInOutDialog({
  isClockedIn,
  onClockIn,
  onClockOut,
  isResigned = false,
}: ClockInOutDialogProps) {
  const [open, setOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<
    boolean | null
  >(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [remarks, setRemarks] = useState('');
  const { currentUser } = useContext(AppContext);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getPermissions = async () => {
    setIsLoading(true);
    if (!navigator.mediaDevices?.getUserMedia) {
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Not Supported',
        description:
          'Your browser does not support camera access. Please use a different browser.',
      });
      setIsLoading(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
      });
      setHasCameraPermission(true);
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      setHasCameraPermission(false);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description:
          'Please enable camera permissions in your browser settings to use this feature.',
      });
    }

    setIsLoading(false);
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  useEffect(() => {
    if (open) {
      setUploadedImage(null);
      getPermissions();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [open]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.'});
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        setUploadedImage(event.target?.result as string);
        stopCamera();
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleCapture = async () => {
    let imageDataUrl = uploadedImage;

    if (!imageDataUrl) {
      if (
        !hasCameraPermission ||
        !videoRef.current ||
        !canvasRef.current ||
        videoRef.current.readyState < 3
      ) {
        toast({
          variant: 'destructive',
          title: 'Camera Not Ready',
          description:
            'Please wait for the camera to initialize or grant permission.',
        });
        return;
      }
      
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const context = canvas.getContext('2d');
      if (!context) {
          toast({ variant: 'destructive', title: 'Error', description: 'Could not process camera image.' });
          return;
      }
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      imageDataUrl = canvas.toDataURL('image/jpeg');
    }

    setIsSubmitting(true);
    try {
      
      // Capture the exact time of the event here.
      const eventTime = new Date();

      const capture: ClockEvent = {
        time: format(eventTime, 'p'), // Format time immediately 'hh:mm a'
        timestamp: eventTime.toISOString(),
        photo: imageDataUrl,
        location: null,
        ...(remarks.trim() ? { remarks: remarks.trim() } : {}),
      };

      if (isClockedIn) {
        await onClockOut(capture);
      } else {
        await onClockIn(capture);
      }
      setOpen(false);
      setRemarks('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="w-full" tabIndex={isResigned ? 0 : undefined}>
              <DialogTrigger asChild>
                <Button
                  className="w-full"
                  size="lg"
                  variant={isClockedIn ? 'destructive' : 'default'}
                  disabled={isResigned}
                >
                  <Clock className="mr-2" /> {isClockedIn ? 'Punch Out' : 'Punch In'}
                </Button>
              </DialogTrigger>
            </span>
          </TooltipTrigger>
          {isResigned && (
            <TooltipContent>
              <p>Attendance tracking is disabled due to resignation. Submit a rejoin request to restore access.</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
      <DialogContent className="w-[95vw] max-w-[95vw] sm:max-w-md h-[85vh] sm:h-auto max-h-[95vh] p-4 sm:p-6 flex flex-col overflow-y-auto rounded-xl">
        <DialogHeader>
          <DialogTitle>
            {isClockedIn ? 'Punch Out' : 'Punch In'} Confirmation
          </DialogTitle>
          <DialogDescription>
            Your photo will be captured for verification.
          </DialogDescription>
        </DialogHeader>
        <div className="relative flex-1 min-h-0 min-h-[300px] flex flex-col gap-2">
          {uploadedImage ? (
            <div className="relative w-full h-full sm:aspect-video rounded-md overflow-hidden bg-muted border flex items-center justify-center">
              <img src={uploadedImage} alt="Uploaded" className="max-w-full max-h-[300px] object-contain" />
              <Button 
                variant="secondary" 
                size="sm" 
                className="absolute top-2 right-2"
                onClick={() => {
                  setUploadedImage(null);
                  getPermissions();
                }}
              >
                Retake
              </Button>
            </div>
          ) : (
            <div className="relative w-full h-full sm:aspect-video rounded-md overflow-hidden bg-muted border">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                muted
                playsInline
              />
              <canvas ref={canvasRef} className="hidden" />
              {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="h-8 w-8 animate-spin text-white" />
                </div>
              )}
              {hasCameraPermission === false && !isLoading && (
                <div className="absolute inset-0 flex items-center justify-center p-4 bg-black/50 text-center">
                  <Alert variant="destructive" className="w-auto">
                    <AlertTitle>Camera Access Denied</AlertTitle>
                    <AlertDescription>Please enable camera access or upload a photo manually.</AlertDescription>
                  </Alert>
                </div>
              )}
            </div>
          )}
          
          <div className="flex gap-2 w-full justify-center">
            {!uploadedImage && (
              <>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                />
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full"
                >
                  <Upload className="mr-2 h-4 w-4" /> Upload Photo Manually
                </Button>
              </>
            )}
          </div>
        </div>
        
        <div className="space-y-2 mt-2">
          <label htmlFor="remarks" className="text-sm font-medium">Remarks (Optional)</label>
          <textarea
            id="remarks"
            className="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
            placeholder="Add any remarks for this punch..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
          />
        </div>

        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => {
              setOpen(false);
            }}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button onClick={handleCapture} disabled={(!hasCameraPermission && !uploadedImage) || isLoading || isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm {isClockedIn ? 'Punch Out' : 'Punch In'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
