"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck, EyeOff, CheckCircle2 } from "lucide-react";
import Link from "next/link";

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        // Check if onboarding is complete
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("alias")
          .eq("id", data.session.user.id)
          .single();

        if (profile?.alias && !profile.alias.startsWith("User_")) {
          router.push("/feed");
        } else {
          router.push("/onboarding");
        }
      }
    };

    checkSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("alias")
          .eq("id", session.user.id)
          .single();

        if (profile?.alias && !profile.alias.startsWith("User_")) {
          router.push("/feed");
        } else {
          router.push("/onboarding");
        }
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  return (
    <main className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden bg-midnight">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo/40 rounded-full blur-[120px] pointer-events-none" />

      {/* Hero Content */}
      <div className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center mt-20">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="glass-panel px-6 py-2 rounded-full mb-8 flex items-center gap-2"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="font-medium text-sm text-foreground/80 tracking-wide">
            Private. Verified. Vibe-first.
          </span>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Meet by <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-300">vibe</span>,<br />
          not by <span className="text-foreground/50">looks.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-foreground/70 mb-12 max-w-2xl leading-relaxed"
        >
          A private campus connection platform where students discover each other through personality, interests, and conversation before revealing identity.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link href="/signup" className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,93,254,0.3)]">
            Get Started <ArrowRight className="w-4 h-4" />
          </Link>
          <a href="#how-it-works" className="w-full sm:w-auto px-8 py-4 rounded-full glass-panel text-white font-medium hover:bg-white/5 transition-all text-center">
            Learn How It Works
          </a>
        </motion.div>
      </div>

      {/* Floating Trust Cards */}
      <motion.div
        id="how-it-works"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 1, delay: 0.5, ease: "easeOut" }}
        className="mt-20 mb-20 grid grid-cols-1 md:grid-cols-3 gap-6 w-full max-w-4xl px-6 relative z-10"
      >
        {[
          { icon: <ShieldCheck className="w-6 h-6 text-primary" />, title: "Verified Students Only", desc: "Every profile checked for safety." },
          { icon: <EyeOff className="w-6 h-6 text-primary" />, title: "Hidden Identity", desc: "Real name and face stay private." },
          { icon: <CheckCircle2 className="w-6 h-6 text-primary" />, title: "Meaningful Chats", desc: "Interact beyond the superficial." }
        ].map((card, idx) => (
          <motion.div
            key={idx}
            whileHover={{ y: -5 }}
            className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center gap-4"
          >
            <div className="p-3 bg-white/5 rounded-xl">
              {card.icon}
            </div>
            <h3 className="font-semibold text-lg">{card.title}</h3>
            <p className="text-sm text-foreground/60">{card.desc}</p>
          </motion.div>
        ))}
      </motion.div>
    </main>
  );
}
