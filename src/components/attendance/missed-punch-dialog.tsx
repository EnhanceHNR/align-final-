'use client';

import { useState, useRef, useContext, useEffect } from 'react';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { AppContext } from '@/context/app-context';
import { uploadAttendanceImageAction } from '@/components/attendance/actions';
import { Loader2, Camera, Upload } from 'lucide-react';

function PhotoUploader({
  label,
  description,
  capturedImage,
  setCapturedImage,
  setUploadedFile,
}: {
  label: string;
  description?: string;
  capturedImage: string | null;
  setCapturedImage: (img: string | null) => void;
  setUploadedFile: (file: File | null) => void;
}) {
  const [isCapturing, setIsCapturing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const startCamera = async () => {
    setIsCapturing(true);
    setCapturedImage(null);
    setUploadedFile(null);
    if (!navigator.mediaDevices?.getUserMedia) {
      toast({
        variant: 'destructive',
        title: 'Camera Not Supported',
        description: 'Your browser does not support camera access.',
      });
      setIsCapturing(false);
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        variant: 'destructive',
        title: 'Camera Access Denied',
        description: 'Please enable camera permissions to use this feature.',
      });
      setIsCapturing(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setIsCapturing(false);
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const context = canvas.getContext('2d');
    if (!context) return;
    
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const imageDataUrl = canvas.toDataURL('image/jpeg', 0.8);
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (!file.type.startsWith('image/')) {
        toast({ variant: 'destructive', title: 'Invalid File', description: 'Please upload an image file.'});
        return;
    }

    setUploadedFile(file);
    setCapturedImage(null);
    setIsCapturing(false);
    stopCamera();

    const reader = new FileReader();
    reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      {description && (
        <p className="text-xs text-muted-foreground mb-2">{description}</p>
      )}
      
      {!capturedImage && !isCapturing && (
        <div className="flex gap-2">
          <Button type="button" variant="outline" className="w-full" onClick={startCamera}>
            <Camera className="mr-2 h-4 w-4" /> Open Camera
          </Button>
          <Button type="button" variant="outline" className="w-full" onClick={() => fileInputRef.current?.click()}>
            <Upload className="mr-2 h-4 w-4" /> Upload File
          </Button>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            ref={fileInputRef}
            onChange={handleFileUpload}
          />
        </div>
      )}

      {isCapturing && (
        <div className="space-y-2">
          <div className="relative rounded-md overflow-hidden bg-muted flex items-center justify-center">
              <video ref={videoRef} className="w-full max-h-[400px] object-contain" autoPlay playsInline muted />
          </div>
          <div className="flex gap-2">
              <Button type="button" className="w-full" onClick={handleCapture}>Take Photo</Button>
              <Button type="button" variant="secondary" onClick={stopCamera}>Cancel</Button>
          </div>
        </div>
      )}

      {capturedImage && !isCapturing && (
        <div className="space-y-2">
           <div className="relative rounded-md overflow-hidden bg-muted border flex items-center justify-center">
              <img src={capturedImage} alt="Captured proof" className="w-full max-h-[400px] object-contain" />
           </div>
           <Button type="button" variant="outline" className="w-full" onClick={() => { setCapturedImage(null); setUploadedFile(null); }}>
             Remove & Retake
           </Button>
        </div>
      )}
      
      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

export function MissedPunchDialog() {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [punchType, setPunchType] = useState<'In' | 'Out' | 'Both'>('In');
  const [punchInTime, setPunchInTime] = useState('');
  const [punchOutTime, setPunchOutTime] = useState('');
  const [reason, setReason] = useState('');
  
  // Calculate date range (current month)
  const now = new Date();
  const minDate = format(new Date(now.getFullYear(), now.getMonth(), 1), 'yyyy-MM-dd');
  const maxDate = format(now, 'yyyy-MM-dd');
  
  const [isLoading, setIsLoading] = useState(false);
  const [capturedImageIn, setCapturedImageIn] = useState<string | null>(null);
  const [uploadedFileIn, setUploadedFileIn] = useState<File | null>(null);
  const [capturedImageOut, setCapturedImageOut] = useState<string | null>(null);
  const [uploadedFileOut, setUploadedFileOut] = useState<File | null>(null);

  const { toast } = useToast();
  const { currentUser, addMissedPunchRequest } = useContext(AppContext);

  const handleSubmit = async () => {
    if (!currentUser) return;
    if (!reason.trim()) {
      toast({ variant: 'destructive', title: 'Reason Required', description: 'Please provide a reason for the missed punch.' });
      return;
    }

    if (punchType === 'In' || punchType === 'Both') {
      if (!punchInTime) {
        toast({ variant: 'destructive', title: 'Time Required', description: 'Please provide the missing punch in time.' });
        return;
      }
      if (!capturedImageIn) {
        toast({ variant: 'destructive', title: 'Photo Required', description: 'Please provide a photo for the punch in.' });
        return;
      }
    }

    if (punchType === 'Out' || punchType === 'Both') {
      if (!punchOutTime) {
        toast({ variant: 'destructive', title: 'Time Required', description: 'Please provide the missing punch out time.' });
        return;
      }
      if (!capturedImageOut && punchType === 'Both') {
        toast({ variant: 'destructive', title: 'Photo Required', description: 'Please provide a photo for the punch out.' });
        return;
      }
      if (!capturedImageIn && punchType === 'Out') {
        // If punch type is Out only, we use the "In" states to hold the single photo
        toast({ variant: 'destructive', title: 'Photo Required', description: 'Please provide a photo for the punch out.' });
        return;
      }
    }

    if (date < minDate) {
      toast({ variant: 'destructive', title: 'Window Expired', description: 'Missed punches can only be logged for the current month.' });
      return;
    }

    setIsLoading(true);
    try {
      toast({ title: 'Uploading photos...', description: 'Please wait.' });

      let photoUrlIn = '';
      let photoUrlOut = '';

      if (punchType === 'In' || punchType === 'Both' || punchType === 'Out') {
        const primaryImage = capturedImageIn; // This is the first photo
        if (primaryImage) {
          const uploadResult = await uploadAttendanceImageAction(currentUser.id, primaryImage, 'missed_punch');
          if (!uploadResult.success || !uploadResult.url) {
              throw new Error(uploadResult.error || "Failed to upload primary photo.");
          }
          photoUrlIn = uploadResult.url;
        }
      }

      if (punchType === 'Both' && capturedImageOut) {
        const uploadResultOut = await uploadAttendanceImageAction(currentUser.id, capturedImageOut, 'missed_punch_out');
        if (!uploadResultOut.success || !uploadResultOut.url) {
            throw new Error(uploadResultOut.error || "Failed to upload punch out photo.");
        }
        photoUrlOut = uploadResultOut.url;
      }

      await addMissedPunchRequest({
        date,
        punchType,
        ...((punchType === 'In' || punchType === 'Both') ? { punchInTime } : {}),
        ...((punchType === 'Out' || punchType === 'Both') ? { punchOutTime } : {}),
        photoUrl: photoUrlIn,
        ...(punchType === 'Both' ? { photoUrlOut: photoUrlOut } : {}),
        reason: reason.trim(),
      });

      setOpen(false);
      resetForm();
    } catch (error) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Error', description: 'Failed to submit request.' });
    } finally {
      setIsLoading(false);
    }
  };

  const resetForm = () => {
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setPunchType('In');
    setPunchInTime('');
    setPunchOutTime('');
    setReason('');
    setCapturedImageIn(null);
    setUploadedFileIn(null);
    setCapturedImageOut(null);
    setUploadedFileOut(null);
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) {
      resetForm();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="outline">Log Missed Punch</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Log Missed Punch</DialogTitle>
          <DialogDescription>
            Submit a request for a missed punch. You must provide a photo containing timestamp proof.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4 max-h-[70vh] overflow-y-auto pr-2">
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                min={minDate}
                max={maxDate}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Punch Type</Label>
              <Select value={punchType} onValueChange={(v: 'In'|'Out'|'Both') => {
                setPunchType(v);
                setCapturedImageIn(null);
                setCapturedImageOut(null);
              }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="In">Punch In Only</SelectItem>
                  <SelectItem value="Out">Punch Out Only</SelectItem>
                  <SelectItem value="Both">Both (In & Out)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {(punchType === 'In' || punchType === 'Both') && (
              <div className="space-y-2">
                <Label>Missing Punch In</Label>
                <Input
                  type="time"
                  value={punchInTime}
                  onChange={(e) => setPunchInTime(e.target.value)}
                />
              </div>
            )}
            {(punchType === 'Out' || punchType === 'Both') && (
              <div className="space-y-2">
                <Label>Missing Punch Out</Label>
                <Input
                  type="time"
                  value={punchOutTime}
                  onChange={(e) => setPunchOutTime(e.target.value)}
                />
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Reason</Label>
            <Input
              placeholder="e.g. App crashed, Phone died, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {(punchType === 'In' || punchType === 'Out') && (
             <PhotoUploader
               label={punchType === 'In' ? 'Proof (Punch In)' : 'Proof (Punch Out)'}
               description="Take a picture with your phone's camera app and upload it here."
               capturedImage={capturedImageIn}
               setCapturedImage={setCapturedImageIn}
               setUploadedFile={setUploadedFileIn}
             />
          )}

          {punchType === 'Both' && (
            <div className="space-y-6 pt-2 border-t">
              <PhotoUploader
                label="Proof for Punch In"
                description="Upload the timestamped photo for your punch in time."
                capturedImage={capturedImageIn}
                setCapturedImage={setCapturedImageIn}
                setUploadedFile={setUploadedFileIn}
              />
              <PhotoUploader
                label="Proof for Punch Out"
                description="Upload the timestamped photo for your punch out time."
                capturedImage={capturedImageOut}
                setCapturedImage={setCapturedImageOut}
                setUploadedFile={setUploadedFileOut}
              />
            </div>
          )}

        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isLoading || !reason}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Submit Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
