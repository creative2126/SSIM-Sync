"use client";

import { useEffect, useRef, useState } from "react";
import { Camera, X, RefreshCw, Check, AlertCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
    title: string;
}

export default function CameraCapture({ onCapture, onClose, title }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [capturedImage, setCapturedImage] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        setLoading(true);
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "user" },
                audio: false,
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Camera access error:", err);
            setError("Unable to access camera. Please ensure you have given permission.");
        } finally {
            setLoading(false);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const capturePhoto = () => {
        if (videoRef.current && canvasRef.current) {
            const context = canvasRef.current.getContext("2d");
            if (context) {
                canvasRef.current.width = videoRef.current.videoWidth;
                canvasRef.current.height = videoRef.current.videoHeight;
                context.drawImage(videoRef.current, 0, 0);
                const dataUrl = canvasRef.current.toDataURL("image/jpeg");
                setCapturedImage(dataUrl);
                stopCamera();
            }
        }
    };

    const retake = () => {
        setCapturedImage(null);
        startCamera();
    };

    const confirm = () => {
        if (capturedImage) {
            // Convert dataUrl to File
            fetch(capturedImage)
                .then((res) => res.blob())
                .then((blob) => {
                    const file = new File([blob], "camera_capture.jpg", { type: "image/jpeg" });
                    onCapture(file);
                    onClose();
                });
        }
    };

    return (
        <div className="fixed inset-0 z-[100] bg-midnight/90 backdrop-blur-xl flex flex-col items-center justify-center p-6">
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-lg glass-panel rounded-3xl overflow-hidden relative"
            >
                <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <h3 className="font-bold text-lg">{title}</h3>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors font-bold">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="aspect-[4/3] relative bg-black flex items-center justify-center">
                    {loading && (
                        <div className="flex flex-col items-center gap-2">
                            <RefreshCw className="w-8 h-8 text-primary animate-spin" />
                            <p className="text-xs text-foreground/50">Starting camera...</p>
                        </div>
                    )}

                    {error && (
                        <div className="flex flex-col items-center gap-4 p-8 text-center text-red-400">
                            <AlertCircle className="w-12 h-12" />
                            <p className="text-sm font-medium">{error}</p>
                            <button
                                onClick={startCamera}
                                className="px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl text-xs transition-all"
                            >
                                Try Again
                            </button>
                        </div>
                    )}

                    {!loading && !error && !capturedImage && (
                        <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            className="w-full h-full object-cover mirror"
                            style={{ transform: "scaleX(-1)" }}
                        />
                    )}

                    {capturedImage && (
                        <img
                            src={capturedImage}
                            alt="Captured"
                            className="w-full h-full object-cover"
                        />
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                <div className="p-6 flex justify-center gap-4 bg-white/5 border-t border-white/10">
                    {!capturedImage ? (
                        <button
                            onClick={capturePhoto}
                            disabled={loading || !!error}
                            className="w-16 h-16 rounded-full bg-primary flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all shadow-lg shadow-primary/20 disabled:opacity-50"
                        >
                            <Camera className="w-8 h-8" />
                        </button>
                    ) : (
                        <>
                            <button
                                onClick={retake}
                                className="flex-1 py-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 font-medium transition-all flex items-center justify-center gap-2"
                            >
                                <RefreshCw className="w-5 h-5" /> Retake
                            </button>
                            <button
                                onClick={confirm}
                                className="flex-1 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 font-medium transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
                            >
                                <Check className="w-5 h-5" /> Confirm
                            </button>
                        </>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
