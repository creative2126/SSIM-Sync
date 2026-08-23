"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, BellOff, X } from "lucide-react";

const VAPID_PUBLIC_KEY = "BGE1BpYyWIAGEq4dyHQoVYY4JZ-3ZYr2z28kEpq0Brsnkt9uS0it5IHuLXGkZBs71dJQhSqgVZH05P7fdEUFuGw";

const urlB64ToUint8Array = (base64String: string) => {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding).replace(/\-/g, '+').replace(/_/g, '/');
    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);
    for (let i = 0; i < rawData.length; ++i) {
        outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
};

export default function PushInitializer() {
    const [showPrompt, setShowPrompt] = useState(false);
    const [status, setStatus] = useState<"idle" | "loading" | "done" | "denied">("idle");

    useEffect(() => {
        // Only show the prompt if:
        // 1. Service workers and push are supported
        // 2. Permission hasn't been granted yet
        // 3. User hasn't dismissed before
        if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
        if (localStorage.getItem("push_prompt_dismissed")) return;

        const checkPermission = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            if (Notification.permission === "granted") {
                // Already granted — silently register in background
                await registerAndSubscribe();
            } else if (Notification.permission === "default") {
                // Not yet asked — show our friendly prompt after 3 seconds
                setTimeout(() => setShowPrompt(true), 3000);
            }
            // If "denied", do nothing
        };

        checkPermission();
    }, []);

    const registerAndSubscribe = async () => {
        try {
            // Register SW and wait for it to be fully active
            const registration = await navigator.serviceWorker.register("/sw.js");
            await navigator.serviceWorker.ready;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Get or create push subscription
            let subscription = await registration.pushManager.getSubscription();
            if (!subscription) {
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
                });
            }

            // Save subscription to Supabase
            const { error } = await supabase.from("push_subscriptions").upsert({
                user_id: session.user.id,
                subscription: JSON.parse(JSON.stringify(subscription))
            }, { onConflict: "user_id" });

            if (error) {
                console.error("Failed to save push subscription:", error.message);
            } else {
                console.log("✅ Push subscription saved successfully");
            }
        } catch (err) {
            console.error("Push setup failed:", err);
        }
    };

    const handleAllow = async () => {
        setStatus("loading");
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            setStatus("done");
            await registerAndSubscribe();
            setTimeout(() => setShowPrompt(false), 1500);
        } else {
            setStatus("denied");
            localStorage.setItem("push_prompt_dismissed", "true");
            setTimeout(() => setShowPrompt(false), 1500);
        }
    };

    const handleDismiss = () => {
        localStorage.setItem("push_prompt_dismissed", "true");
        setShowPrompt(false);
    };

    return (
        <AnimatePresence>
            {showPrompt && (
                <motion.div
                    initial={{ opacity: 0, y: 80 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 80 }}
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                    className="fixed bottom-28 left-4 right-4 z-[500] md:left-auto md:right-6 md:max-w-sm"
                >
                    <div className="bg-[#1a1b22] border border-white/10 rounded-3xl p-5 shadow-2xl shadow-black/60">
                        <div className="flex items-start gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-primary/20 border border-primary/30 flex items-center justify-center shrink-0">
                                <Bell className="w-6 h-6 text-primary" />
                            </div>
                            <div className="flex-1">
                                <h3 className="font-bold text-white text-sm mb-1">Stay in the loop 🔔</h3>
                                <p className="text-foreground/50 text-xs leading-relaxed">
                                    Get notified instantly when someone matches with you or sends a message.
                                </p>
                            </div>
                            <button onClick={handleDismiss} className="text-foreground/30 hover:text-white transition-colors shrink-0">
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="flex gap-2 mt-4">
                            {status === "done" ? (
                                <div className="flex-1 py-3 rounded-xl bg-emerald-500/20 text-emerald-400 text-xs font-bold text-center border border-emerald-500/20">
                                    ✅ Notifications Enabled!
                                </div>
                            ) : status === "denied" ? (
                                <div className="flex-1 py-3 rounded-xl bg-red-500/20 text-red-400 text-xs font-bold text-center border border-red-500/20">
                                    Notifications blocked in settings
                                </div>
                            ) : (
                                <>
                                    <button
                                        onClick={handleAllow}
                                        disabled={status === "loading"}
                                        className="flex-1 py-3 rounded-xl bg-primary text-white text-xs font-bold uppercase tracking-widest hover:bg-primary/90 transition-all disabled:opacity-70 shadow-lg shadow-primary/20"
                                    >
                                        {status === "loading" ? "Enabling..." : "Enable Notifications"}
                                    </button>
                                    <button
                                        onClick={handleDismiss}
                                        className="px-4 py-3 rounded-xl bg-white/5 text-foreground/40 text-xs font-bold border border-white/5"
                                    >
                                        Later
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
