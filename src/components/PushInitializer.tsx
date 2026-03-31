"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

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
    useEffect(() => {
        if ("serviceWorker" in navigator && "PushManager" in window) {
            registerServiceWorker();
        }
    }, []);

    const registerServiceWorker = async () => {
        try {
            const registration = await navigator.serviceWorker.register("/sw.js");
            console.log("Service Worker registered. Current scope:", registration.scope);

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            // Request permission silently
            const permission = await window.Notification.requestPermission();
            if (permission !== "granted") {
                console.log("Notification permission not granted.");
                return;
            }

            // Check if already subscribed
            let subscription = await registration.pushManager.getSubscription();

            if (!subscription) {
                // Subscribe mathematically
                subscription = await registration.pushManager.subscribe({
                    userVisibleOnly: true,
                    applicationServerKey: urlB64ToUint8Array(VAPID_PUBLIC_KEY)
                });
                console.log("New Push Subscription created.");
            }

            // Upsert subscription payload into Supabase
            const { error: upsertErr } = await supabase.from("push_subscriptions").upsert({
                user_id: session.user.id,
                subscription: JSON.parse(JSON.stringify(subscription)) // Converts PushSubscription object to pure JSON
            });

            if (upsertErr) {
                console.error("Failed to save push subscription to DB:", upsertErr);
            } else {
                console.log("Push notifications active and saved to DB");
            }
        } catch (error) {
            console.error("Service Worker registration/subscription failed:", error);
        }
    };

    return null;
}
