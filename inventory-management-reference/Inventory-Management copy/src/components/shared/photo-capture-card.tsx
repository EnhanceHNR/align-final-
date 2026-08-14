import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Camera, Upload, CheckCircle, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

export const PhotoCaptureCard = ({
    title,
    photo,
    onCaptureClick,
    onUploadClick,
    onClearClick,
    isProcessing,
    isOptional = false
}: {
    title: string;
    photo: string | null;
    onCaptureClick: () => void;
    onUploadClick: () => void;
    onClearClick: () => void;
    isProcessing: boolean;
    isOptional?: boolean;
}) => {
    return (
        <Card>
            <CardHeader>
                <CardTitle className="font-headline flex items-center justify-between">
                    <span>{title}</span>
                    {photo || isOptional ? <CheckCircle className={cn("text-green-500", isOptional && !photo && "text-muted-foreground/50" )} /> : <XCircle className="text-destructive" />}
                </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
                {photo ? (
                    <div className="relative">
                        <img src={photo} alt={`${title} Capture`} className="rounded-md w-full aspect-video object-cover" />
                        <Button variant="outline" size="sm" className="absolute top-2 right-2" onClick={onClearClick} disabled={isProcessing}>
                            Change
                        </Button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-lg gap-2">
                        <p className="text-sm text-muted-foreground text-center">Capture or upload a photo.</p>
                        <div className="flex w-full gap-2">
                            <Button className="w-full" onClick={onCaptureClick} disabled={isProcessing}>
                                <Camera className="mr-2" /> Capture
                            </Button>
                            <Button className="w-full" variant="outline" onClick={onUploadClick} disabled={isProcessing}>
                                <Upload className="mr-2" /> Upload
                            </Button>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
};
