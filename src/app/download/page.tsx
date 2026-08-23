"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Download, Share2, Compass, Smartphone, Monitor } from "lucide-react";
import Link from "next/link";

export default function DownloadPage() {
    const [deviceType, setDeviceType] = useState<"android" | "ios" | "desktop">("android");
    const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
    const [isInstallable, setIsInstallable] = useState(false);

    useEffect(() => {
        const ua = navigator.userAgent.toLowerCase();
        if (/iphone|ipad|ipod/.test(ua)) {
            setDeviceType("ios");
        } else if (/android/.test(ua)) {
            setDeviceType("android");
        } else {
            setDeviceType("desktop");
        }

        // Listen for the PWA install prompt event
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e);
            setIsInstallable(true);
        };

        window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);

        // Check if already installed
        if (window.matchMedia("(display-mode: standalone)").matches) {
            setIsInstallable(false);
        }

        return () => {
            window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstallClick = async () => {
        if (!deferredPrompt) {
            // If prompt is not available, alert or guide them
            alert("To install, please use the browser menu (Add to Home Screen) as detailed in the guide below.");
            return;
        }

        deferredPrompt.prompt();

        const { outcome } = await deferredPrompt.userChoice;
        console.log(`User response to install prompt: ${outcome}`);

        // We can only use the prompt once, clear it
        setDeferredPrompt(null);
        setIsInstallable(false);
    };

    const shareApp = async () => {
        const shareUrl = window.location.origin + "/download";
        const shareText = "Hey! Download SSIM Sync — the verified, anonymous social network for SSIM students. Meet new people, vibe anonymously, and connect when you're ready! 🔥";

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "SSIM Sync — Campus Discovery App",
                    text: shareText,
                    url: shareUrl
                });
            } catch (err) {
                // User cancelled or error
            }
        } else {
            try {
                await navigator.clipboard.writeText(shareUrl);
                alert("App download link copied to clipboard! Share it on WhatsApp or Instagram.");
            } catch (e) {
                alert("Could not copy link.");
            }
        }
    };

    return (
        <main className="min-h-screen bg-[#0D0E12] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background glowing rings */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(109,93,254,0.08),transparent_70%)] pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: "linear-gradient(135deg, #9B00E8, #FF2A6D)" }}>
                        <span className="text-white font-black text-sm">S</span>
                    </div>
                    <span className="text-white font-black text-base tracking-widest uppercase">SSIM Sync</span>
                </div>

                {/* App Promo Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 mb-6 shadow-2xl text-center">
                    <div className="w-16 h-16 rounded-3xl bg-primary/20 flex items-center justify-center border border-primary/30 shadow-[0_0_30px_rgba(109,93,254,0.3)] mx-auto mb-6">
                        <Download className="w-8 h-8 text-primary" />
                    </div>

                    <h1 className="text-2xl font-black text-white mb-2">Get the App</h1>
                    <p className="text-foreground/60 text-sm leading-relaxed mb-8">
                        Install SSIM Sync directly to your home screen. No app store downloads, fast setup, and native push notifications.
                    </p>

                    {/* Trigger Button */}
                    <button
                        onClick={handleInstallClick}
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-[#9B00E8] to-[#FF2A6D] text-white font-black text-sm text-center uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-102 transition-transform mb-8"
                    >
                        <Download className="w-4 h-4 animate-bounce" />
                        Download & Install App Now
                    </button>

                    {/* Step-by-step instructions based on device */}
                    <div className="bg-black/20 rounded-2xl p-6 text-left border border-white/5 space-y-5">
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">
                            Alternative Guide (If button does not trigger)
                        </p>

                        {deviceType === "ios" && (
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">1</div>
                                    <p className="text-xs text-foreground/80">
                                        Open this page in the <strong className="text-white">Safari</strong> browser.
                                    </p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">2</div>
                                    <p className="text-xs text-foreground/80 flex items-center gap-1.5 wrap">
                                        Tap the <strong className="text-white">Share</strong> button at the bottom of Safari.
                                    </p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">3</div>
                                    <p className="text-xs text-foreground/80">
                                        Scroll down and select <strong className="text-white">"Add to Home Screen"</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {deviceType === "android" && (
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">1</div>
                                    <p className="text-xs text-foreground/80">
                                        Tap Chrome's <strong className="text-white">three-dot menu</strong> next to the URL bar.
                                    </p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">2</div>
                                    <p className="text-xs text-foreground/80">
                                        Select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                                    </p>
                                </div>
                            </div>
                        )}

                        {deviceType === "desktop" && (
                            <div className="space-y-4">
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">1</div>
                                    <p className="text-xs text-foreground/80">
                                        Look at the right side of the address bar at the top of your browser.
                                    </p>
                                </div>
                                <div className="flex gap-4 items-start">
                                    <div className="w-6 h-6 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white/80 shrink-0">2</div>
                                    <p className="text-xs text-foreground/80">
                                        Click the <strong className="text-white">Install</strong> icon (usually a small screen with an arrow).
                                    </p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3">
                    <button
                        onClick={shareApp}
                        className="w-full py-4 rounded-2xl bg-white/5 border border-white/10 text-white font-bold text-sm text-center uppercase tracking-widest shadow-xl flex items-center justify-center gap-2 hover:scale-105 transition-transform"
                    >
                        <Share2 className="w-4 h-4 text-primary" />
                        Share App With Friends 🚀
                    </button>
                    <Link
                        href="/"
                        className="w-full py-4 rounded-2xl text-center text-xs font-bold uppercase tracking-widest block"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                    >
                        Go to Web App →
                    </Link>
                </div>

                {/* Device Switcher (in case auto-detection misses) */}
                <div className="flex justify-center gap-6 mt-8">
                    <button
                        onClick={() => setDeviceType("android")}
                        className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${deviceType === "android" ? "text-primary" : "text-foreground/30 hover:text-foreground/55"}`}
                    >
                        <Smartphone className="w-3.5 h-3.5" /> Android
                    </button>
                    <button
                        onClick={() => setDeviceType("ios")}
                        className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${deviceType === "ios" ? "text-primary" : "text-foreground/30 hover:text-foreground/55"}`}
                    >
                        <Smartphone className="w-3.5 h-3.5" /> iOS
                    </button>
                    <button
                        onClick={() => setDeviceType("desktop")}
                        className={`text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5 transition-colors ${deviceType === "desktop" ? "text-primary" : "text-foreground/30 hover:text-foreground/55"}`}
                    >
                        <Monitor className="w-3.5 h-3.5" /> Desktop
                    </button>
                </div>
            </div>
        </main>
    );
}
