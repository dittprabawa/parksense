"use client";

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MobileShell } from "@/components/mobile-shell";
import {
  ChevronLeftIcon,
  BoltIcon,
  PhotoCameraIcon,
  PhotoLibraryIcon,
  ArrowPathIcon,
} from "@/components/icons";

export default function TakePhotoPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [flashMode, setFlashMode] = useState<"auto" | "on" | "off">("auto");
  const [isCapturing, setIsCapturing] = useState(false);

  useEffect(() => {
    let currentStream: MediaStream | null = null;
    let isCancelled = false;

    async function initCamera() {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setCameraError("Camera API is not supported in this browser.");
        return;
      }

      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: facingMode },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
          audio: false,
        });

        if (isCancelled) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }

        currentStream = mediaStream;
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
          await videoRef.current.play().catch(() => {});
          setCameraActive(true);
        }
      } catch (err: unknown) {
        if (!isCancelled) {
          const errorMsg = err instanceof Error ? err.message : String(err);
          console.warn("Camera stream unavailable:", errorMsg);
          setCameraError(
            "Camera stream unavailable. You can use your device's native camera app or choose from files."
          );
        }
      }
    }

    initCamera();

    return () => {
      isCancelled = true;
      if (currentStream) {
        currentStream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [facingMode]);

  // Handle Photo Capture from Live Video Stream
  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraActive) {
      // Fallback: If camera stream is not live, use default sample vehicle photo
      saveAndProceed("/motorcycle-b2.png");
      return;
    }

    setIsCapturing(true);

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
      saveAndProceed(dataUrl);
    } else {
      saveAndProceed("/motorcycle-b2.png");
    }
  };

  // Handle Native File / Device Camera App upload
  const handleNativeFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (typeof event.target?.result === "string") {
        saveAndProceed(event.target.result);
      }
    };
    reader.readAsDataURL(file);
  };

  // Save photo and navigate to Save Parking form
  const saveAndProceed = (photoDataUrl: string) => {
    if (typeof window !== "undefined") {
      try {
        sessionStorage.setItem("parksense_captured_photo", photoDataUrl);
      } catch (err) {
        console.error("Failed to store captured photo:", err);
      }
    }
    router.push("/save-parking");
  };

  // Toggle Camera Facing Mode
  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  };

  // Toggle Flash state
  const toggleFlash = () => {
    setFlashMode((prev) => {
      if (prev === "auto") return "on";
      if (prev === "on") return "off";
      return "auto";
    });
  };

  return (
    <MobileShell hideHeaderPad className="!bg-black">
      <div className="relative flex flex-col flex-1 h-full min-h-[620px] bg-black text-white justify-between select-none overflow-hidden">
        {/* Hidden Canvas for Frame Capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Hidden Native Camera App input */}
        <input
          ref={nativeCameraInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleNativeFile}
          aria-label="Launch device camera app"
        />

        {/* Hidden Gallery input */}
        <input
          ref={galleryInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleNativeFile}
          aria-label="Select photo from library"
        />

        {/* TOP BAR: Controls & Branding */}
        <div className="relative z-20 flex items-center justify-between px-5 pt-3 pb-2 bg-gradient-to-b from-black/80 via-black/40 to-transparent">
          <Link
            href="/home"
            className="p-2 -ml-2 rounded-full text-white hover:bg-white/10 active:opacity-60 transition-all flex items-center gap-1"
            aria-label="Back to home"
          >
            <ChevronLeftIcon className="w-6 h-6 text-white" />
          </Link>

          <div className="flex items-center gap-4">
            {/* Flash Indicator */}
            <button
              type="button"
              onClick={toggleFlash}
              className={`p-2 rounded-full transition-colors flex items-center gap-1 text-xs font-semibold ${
                flashMode === "on"
                  ? "text-[#FFD60A] bg-white/20"
                  : flashMode === "auto"
                  ? "text-white/90 bg-white/10"
                  : "text-white/40 hover:text-white"
              }`}
              aria-label={`Flash: ${flashMode}`}
            >
              <BoltIcon className="w-5 h-5" />
              <span className="text-[10px] uppercase">{flashMode}</span>
            </button>

            {/* Quick Native Camera App Trigger */}
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="p-2 rounded-full bg-white/15 hover:bg-white/25 text-white active:scale-95 transition-all"
              title="Launch Device Camera App"
              aria-label="Launch Device Camera App"
            >
              <PhotoCameraIcon className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* CENTER: Viewfinder with Live Stream or Fallback */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden my-2">
          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
              cameraActive ? "opacity-100" : "opacity-0"
            }`}
          />

          {/* Fallback Viewfinder if video unavailable or desktop */}
          {!cameraActive && (
            <div className="absolute inset-0 w-full h-full bg-neutral-900 flex flex-col items-center justify-center">
              <div className="relative w-full h-full">
                <Image
                  src="/motorcycle-b2.png"
                  fill
                  className="object-cover opacity-80"
                  alt="Camera placeholder"
                  priority
                  unoptimized
                />
              </div>
            </div>
          )}

          {/* Figma Focus Box (Rounded Rect Frame from design_refs/09-take-vehicle-photo.png) */}
          <div className="relative z-10 w-[82%] h-[68%] rounded-3xl border-2 border-white/90 pointer-events-none shadow-[0_0_0_9999px_rgba(0,0,0,0.35)] flex flex-col justify-between p-4 transition-all">
            <div className="flex justify-between items-start">
              <span className="w-4 h-4 border-t-2 border-l-2 border-white" />
              <span className="w-4 h-4 border-t-2 border-r-2 border-white" />
            </div>

            <div className="text-center">
              <span className="inline-block px-3 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-medium text-white/90">
                Fit vehicle inside frame
              </span>
            </div>

            <div className="flex justify-between items-end">
              <span className="w-4 h-4 border-b-2 border-l-2 border-white" />
              <span className="w-4 h-4 border-b-2 border-r-2 border-white" />
            </div>
          </div>

          {/* Camera Status Message Banner */}
          {cameraError && (
            <div className="absolute top-4 left-4 right-4 z-20 bg-black/75 backdrop-blur-md border border-white/10 rounded-2xl p-2.5 text-center text-xs text-white/90">
              <p>{cameraError}</p>
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="mt-1.5 px-3 py-1 rounded-full bg-[#007AFF] text-white font-bold text-xs"
              >
                Launch Device Camera App
              </button>
            </div>
          )}
        </div>

        {/* BOTTOM BAR: Shutter & Action Controls (Exact Figma 09 layout) */}
        <div className="relative z-20 flex flex-col items-center justify-end px-6 pt-2 pb-6 bg-gradient-to-t from-black/90 via-black/50 to-transparent">
          {/* Quick Option to Launch Native Camera App on mobile */}
          <div className="mb-4">
            <button
              type="button"
              onClick={() => nativeCameraInputRef.current?.click()}
              className="px-4 py-1.5 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-xs font-semibold text-white transition-all active:scale-95 flex items-center gap-1.5"
            >
              <PhotoCameraIcon className="w-4 h-4 text-[#007AFF]" />
              <span>Tap for Phone Camera App</span>
            </button>
          </div>

          <div className="w-full flex items-center justify-around max-w-[340px]">
            {/* Gallery / Library Button */}
            <button
              type="button"
              onClick={() => galleryInputRef.current?.click()}
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white active:scale-90 transition-all"
              aria-label="Pick from photo library"
            >
              <PhotoLibraryIcon className="w-6 h-6" />
            </button>

            {/* Circular Shutter Button (Figma 09 White Outer Ring + Circle) */}
            <button
              type="button"
              onClick={captureFrame}
              disabled={isCapturing}
              className="w-20 h-20 rounded-full border-4 border-white flex items-center justify-center p-1 active:scale-95 transition-transform group"
              aria-label="Capture vehicle photo"
            >
              <span className="w-full h-full rounded-full bg-white group-hover:scale-95 transition-transform" />
            </button>

            {/* Flip / Switch Camera Button */}
            <button
              type="button"
              onClick={toggleCameraFacing}
              className="w-12 h-12 rounded-full bg-white/15 hover:bg-white/25 flex items-center justify-center text-white active:scale-90 transition-all"
              aria-label="Switch camera"
            >
              <ArrowPathIcon className="w-6 h-6" />
            </button>
          </div>
        </div>
      </div>
    </MobileShell>
  );
}
