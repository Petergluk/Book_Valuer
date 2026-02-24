import React, { useEffect, useRef, useState, useCallback } from 'react';

// Inline icons for the modal to keep it self-contained
const CloseIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <line x1="18" y1="6" x2="6" y2="18"></line>
    <line x1="6" y1="6" x2="18" y2="18"></line>
  </svg>
);

const RotateCcwIcon = ({ className }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
    <path d="M3 3v5h5" />
  </svg>
);

const CheckIcon = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
        <polyline points="20 6 9 17 4 12"></polyline>
    </svg>
);

interface CameraModalProps {
    onCapture: (files: File[]) => void;
    onClose: () => void;
}

export const CameraModal: React.FC<CameraModalProps> = ({ onCapture, onClose }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [capturedImages, setCapturedImages] = useState<File[]>([]);
    const [isFlashing, setIsFlashing] = useState(false);
    
    // Device management
    const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
    const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null);

    // Initialize Camera and enumerate devices
    useEffect(() => {
        let currentStream: MediaStream | null = null;
        let mounted = true;

        const startCamera = async () => {
            try {
                // Stop any existing stream tracks before starting a new one
                if (stream) {
                    stream.getTracks().forEach(track => track.stop());
                }

                const constraints: MediaStreamConstraints = {
                    video: activeDeviceId 
                        ? { deviceId: { exact: activeDeviceId }, width: { ideal: 1920 }, height: { ideal: 1080 } }
                        : { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }, // Default preference
                    audio: false
                };

                let newStream: MediaStream;
                try {
                    newStream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (err) {
                    // Fallback for laptops or if constraints fail
                    console.warn("Constraints failed, retrying with basic config", err);
                    newStream = await navigator.mediaDevices.getUserMedia({ video: true });
                }

                if (!mounted) {
                    newStream.getTracks().forEach(t => t.stop());
                    return;
                }

                setStream(newStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
                setError(null);

                // Enumerate devices if we haven't yet, or update active ID
                const deviceList = await navigator.mediaDevices.enumerateDevices();
                const videoInputs = deviceList.filter(d => d.kind === 'videoinput');
                
                if (mounted) {
                    setDevices(videoInputs);
                    
                    // Update activeDeviceId to match what we actually got if not set
                    if (!activeDeviceId) {
                        const videoTrack = newStream.getVideoTracks()[0];
                        const settings = videoTrack.getSettings();
                        if (settings.deviceId) {
                            setActiveDeviceId(settings.deviceId);
                        }
                    }
                }

            } catch (err) {
                console.error("Error accessing camera:", err);
                if (mounted) {
                    setError("Не удалось получить доступ к камере. Проверьте разрешения.");
                }
            }
        };

        startCamera();

        return () => {
            mounted = false;
            // Cleanup function for when component unmounts or activeDeviceId changes
            // We don't stop the stream here immediately if we are just switching IDs to prevent black flash, 
            // but the startCamera logic handles stopping the *old* stream reference it has access to via closure/state if needed,
            // or we rely on the fact that creating a new stream releases the camera lock mostly.
            // However, strictly cleaning up 'stream' from state is safer:
             if (currentStream) {
                currentStream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [activeDeviceId]); 
    // Dependency on activeDeviceId ensures we restart camera when user switches device.
    // We purposely don't add 'stream' to deps to avoid loops, cleanup handles previous stream via variable capture if possible, 
    // but better relies on React's cleanup cycle.

    // Cleanup on unmount (separate effect to ensure we kill the last stream)
    useEffect(() => {
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [stream]);


    const handleCapture = useCallback(() => {
        if (!videoRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        if (!context) return;

        // Visual flash effect
        setIsFlashing(true);
        setTimeout(() => setIsFlashing(false), 150);

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        // Draw video frame to canvas
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Convert to blob/file
        canvas.toBlob((blob) => {
            if (blob) {
                const fileName = `camera_photo_${Date.now()}.jpg`;
                const file = new File([blob], fileName, { type: 'image/jpeg' });
                setCapturedImages(prev => [...prev, file]);
            }
        }, 'image/jpeg', 0.9);

    }, []);

    const handleDone = () => {
        if (capturedImages.length > 0) {
            onCapture(capturedImages);
        }
        onClose();
    };

    const switchCamera = () => {
        if (devices.length < 2) return;
        
        const currentIndex = devices.findIndex(d => d.deviceId === activeDeviceId);
        // If not found, default to 0, else next one
        const nextIndex = (currentIndex + 1) % devices.length;
        setActiveDeviceId(devices[nextIndex].deviceId);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col animate-fade-in">
            {/* Main Camera View */}
            <div className="relative flex-1 overflow-hidden bg-black rounded-b-xl">
                {error ? (
                    <div className="absolute inset-0 flex items-center justify-center text-white p-6 text-center">
                        <div>
                            <p className="mb-4 text-red-400">{error}</p>
                            <button onClick={onClose} className="px-4 py-2 bg-slate-800 rounded-lg text-sm">Закрыть</button>
                        </div>
                    </div>
                ) : (
                    <video 
                        ref={videoRef} 
                        autoPlay 
                        playsInline 
                        muted 
                        className="absolute inset-0 w-full h-full object-cover" 
                    />
                )}
                
                {/* Flash overlay */}
                <div className={`absolute inset-0 bg-white pointer-events-none transition-opacity duration-150 ${isFlashing ? 'opacity-50' : 'opacity-0'}`} />

                {/* Top Controls */}
                <div className="absolute top-0 left-0 right-0 p-4 flex justify-between items-start bg-gradient-to-b from-black/50 to-transparent">
                    <button onClick={onClose} className="p-2 text-white hover:bg-white/20 rounded-full transition-colors" aria-label="Закрыть камеру">
                        <CloseIcon className="w-8 h-8" />
                    </button>
                    {capturedImages.length > 0 && (
                        <div className="bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full text-white text-xs font-medium border border-white/10">
                            {capturedImages.length} фото
                        </div>
                    )}
                </div>
            </div>

            {/* Bottom Controls */}
            <div className="bg-black text-white p-6 pb-8 flex items-center justify-between gap-6">
                 {/* Switch Camera */}
                <div className="w-16 flex justify-center">
                    {!error && devices.length > 1 && (
                        <button onClick={switchCamera} className="p-3 bg-slate-800/80 rounded-full hover:bg-slate-700 transition-colors" aria-label="Переключить камеру">
                             <RotateCcwIcon className="w-6 h-6 text-white" />
                        </button>
                    )}
                </div>

                {/* Shutter Button */}
                <div className="flex-1 flex justify-center">
                    {!error && (
                        <button 
                            onClick={handleCapture}
                            className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center relative active:scale-95 transition-transform group"
                            aria-label="Сделать снимок"
                        >
                             <div className="w-16 h-16 bg-white rounded-full group-hover:bg-slate-200 transition-colors"></div>
                        </button>
                    )}
                </div>

                {/* Done Button */}
                <div className="w-16 flex justify-center">
                    {capturedImages.length > 0 ? (
                        <button onClick={handleDone} className="p-3 bg-indigo-600 rounded-full hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/50" aria-label="Готово">
                            <CheckIcon className="w-6 h-6" />
                        </button>
                    ) : (
                        <div className="w-12" /> /* Spacer */
                    )}
                </div>
            </div>

            {/* Hidden Canvas for Capture */}
            <canvas ref={canvasRef} className="hidden" />
        </div>
    );
};