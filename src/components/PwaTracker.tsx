"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabase/client";

export default function PwaTracker() {
    useEffect(() => {
        const track = async () => {
            // Avoid duplicate DB writes — only run once per device
            if (localStorage.getItem("pwa_tracked")) return;

            // Check if user is running in standalone (installed PWA) mode
            const isStandalone =
                window.matchMedia("(display-mode: standalone)").matches ||
                (window.navigator as any).standalone === true ||
                new URLSearchParams(window.location.search).get("source") === "pwa";

            if (!isStandalone) return;

            // Mark as tracked locally so we do not spam the DB
            localStorage.setItem("pwa_tracked", "true");

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;

            await supabase
                .from("profiles_public")
                .update({ is_pwa_installed: true })
                .eq("id", session.user.id);
        };

        track();
    }, []);

    return null;
}
