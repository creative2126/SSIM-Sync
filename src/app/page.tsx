"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase/client";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight,
  ShieldCheck,
  EyeOff,
  CheckCircle2,
  Unlock,
  Sparkles,
  MessageCircle,
  Users,
  GraduationCap,
} from "lucide-react";
import Link from "next/link";

/* ─── Data ─── */

const CHAT_MESSAGES = [
  { from: "them", text: "Okay wait, you also think flea markets at 7am hit differently?" },
  { from: "me", text: "Yes!! No one gets that. Who are you 😭" },
  { from: "them", text: "Someone who stress-eats shawarma before every exam lol" },
];

const VIBE_POSTS = [
  {
    alias: "StardustN7",
    avatar: "S",
    color: "from-violet-500 to-indigo-500",
    time: "2m ago",
    text: "Why does the library feel like a different dimension after 11pm? More productive and more unhinged simultaneously 🌙",
    vibes: ["📚", "🌙", "☕"],
    likes: 24,
  },
  {
    alias: "CosmicR42",
    avatar: "C",
    color: "from-pink-500 to-rose-500",
    time: "8m ago",
    text: "Hot take: the canteen's cutting chai at 4pm is the only thing keeping this campus alive. Whoever you are, save me a seat sometime 🫶",
    vibes: ["☕", "🔥", "💛"],
    likes: 61,
  },
  {
    alias: "NebulaMX",
    avatar: "N",
    color: "from-teal-500 to-cyan-500",
    time: "15m ago",
    text: "Looking for someone to watch sunsets from the rooftop with. No names yet — just good vibes first ✨",
    vibes: ["🌅", "✨", "💬"],
    likes: 38,
  },
];

const STEPS = [
  {
    icon: <Sparkles className="w-5 h-5" />,
    num: "01",
    title: "Set your vibe",
    desc: "Share what makes you you — interests, energy, campus spots you love.",
  },
  {
    icon: <MessageCircle className="w-5 h-5" />,
    num: "02",
    title: "Connect anonymously",
    desc: "Chat as an alias. No photos, no names — just real conversations.",
  },
  {
    icon: <Unlock className="w-5 h-5" />,
    num: "03",
    title: "Reveal when it's right",
    desc: "Both feel the spark? Tap reveal together and find out who you've been talking to.",
  },
  {
    icon: <Users className="w-5 h-5" />,
    num: "04",
    title: "Make it real",
    desc: "Walk the same corridors, finally knowing who your person is.",
  },
];

/* ─── Component ─── */

export default function Home() {
  const router = useRouter();
  const [visibleMessages, setVisibleMessages] = useState(0);
  const [typing, setTyping] = useState(false);
  const [showReveal, setShowReveal] = useState(false);
  const [revealClicked, setRevealClicked] = useState(false);

  /* Auth redirect */
  useEffect(() => {
    const checkSession = async () => {
      const { data } = await supabase.auth.getSession();
      if (data.session) {
        const { data: profile } = await supabase
          .from("profiles_public")
          .select("alias")
          .eq("id", data.session.user.id)
          .single();
        router.push(
          profile?.alias && !profile.alias.startsWith("User_") ? "/feed" : "/onboarding"
        );
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
        router.push(
          profile?.alias && !profile.alias.startsWith("User_") ? "/feed" : "/onboarding"
        );
      }
    });
    return () => authListener.subscription.unsubscribe();
  }, [router]);

  /* Animate chat bubbles */
  useEffect(() => {
    if (visibleMessages >= CHAT_MESSAGES.length) {
      setTimeout(() => setShowReveal(true), 700);
      return;
    }
    const next = CHAT_MESSAGES[visibleMessages];
    const isTheirTurn = next?.from === "them";
    if (isTheirTurn) setTyping(true);
    const t = setTimeout(() => {
      setTyping(false);
      setVisibleMessages((v) => v + 1);
    }, isTheirTurn ? 1500 : 1000);
    return () => clearTimeout(t);
  }, [visibleMessages]);

  return (
    <main className="min-h-screen flex flex-col items-center relative overflow-hidden bg-midnight">

      {/* Background orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo/40 rounded-full blur-[120px] pointer-events-none" />

      {/* ───────── HERO ───────── */}
      <section className="relative z-10 w-full max-w-5xl px-6 flex flex-col items-center text-center mt-24">

        {/* Pill badge */}
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

        {/* Headline — implies romance, never says "dating" */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
          className="text-5xl md:text-7xl font-bold tracking-tight mb-6"
        >
          Find your{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-300">
            person
          </span>
          ,<br />
          not their <span className="text-foreground/50">photo.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="text-lg md:text-xl text-foreground/70 mb-10 max-w-2xl leading-relaxed"
        >
          Chat, vibe, connect — all without knowing who's on the other side.
          When the spark is real, you'll both know it's time to reveal.
        </motion.p>

        {/* ★ SSIM-exclusive gate banner */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.28 }}
          className="w-full max-w-lg mb-10 flex items-center gap-4 bg-white/[0.04] border border-white/10 border-l-[3px] border-l-primary rounded-r-2xl px-5 py-4 text-left"
        >
          <GraduationCap className="w-6 h-6 text-primary flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-foreground leading-snug">
              Exclusively for SSIM students
            </p>
            <p className="text-xs text-foreground/45 mt-0.5">
              AI-verified college ID required · No outsiders, ever
            </p>
          </div>
          <span className="flex-shrink-0 text-xs font-semibold bg-primary/20 text-primary border border-primary/30 px-3 py-1 rounded-full">
            SSIM only
          </span>
        </motion.div>

        {/* CTAs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.35, ease: "easeOut" }}
          className="flex flex-col sm:flex-row items-center gap-4 w-full sm:w-auto"
        >
          <Link
            href="/signup"
            className="w-full sm:w-auto px-8 py-4 rounded-full bg-primary text-white font-medium hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(109,93,254,0.3)]"
          >
            Join with SSIM ID <ArrowRight className="w-4 h-4" />
          </Link>
          <a
            href="#how-it-works"
            className="w-full sm:w-auto px-8 py-4 rounded-full glass-panel text-white font-medium hover:bg-white/5 transition-all text-center"
          >
            See how it works
          </a>
        </motion.div>
      </section>

      {/* ───────── LIVE DEMO: CHAT + VIBE FEED ───────── */}
      <section className="relative z-10 w-full max-w-5xl px-6 mt-28">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-center mb-10"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary/70 mb-3">
            See it in action
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            Every great story starts with{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-300">
              a vibe
            </span>
          </h2>
          <p className="text-foreground/50 mt-3 max-w-xl mx-auto text-sm">
            No photos. No filters. Just two SSIM students figuring out they might be
            each other&apos;s person.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          {/* Chat preview */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="glass-panel rounded-3xl p-6 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center gap-3 pb-4 border-b border-white/10 mb-4">
              <div className="flex -space-x-2">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-xs font-bold ring-2 ring-midnight">
                  V1
                </div>
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-teal-500 to-cyan-400 flex items-center justify-center text-white text-xs font-bold ring-2 ring-midnight">
                  V2
                </div>
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Vibe #1 &amp; Vibe #2</p>
                <p className="text-xs text-foreground/50">
                  Matched on: indie music · street food · late nights
                </p>
              </div>
              <span className="ml-auto text-xs bg-primary/20 text-primary px-3 py-1 rounded-full font-medium whitespace-nowrap">
                3 vibes
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 flex flex-col gap-3 min-h-[190px]">
              <AnimatePresence>
                {CHAT_MESSAGES.slice(0, visibleMessages).map((msg, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35 }}
                    className={`flex items-end gap-2 ${msg.from === "me" ? "flex-row-reverse" : ""}`}
                  >
                    {msg.from === "them" && (
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                        V1
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${msg.from === "me"
                        ? "bg-primary text-white rounded-br-sm"
                        : "bg-white/10 text-foreground/90 rounded-bl-sm"
                        }`}
                    >
                      {msg.text}
                    </div>
                  </motion.div>
                ))}

                {typing && (
                  <motion.div
                    key="typing"
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="flex items-end gap-2"
                  >
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-indigo-500 flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                      V1
                    </div>
                    <div className="bg-white/10 px-4 py-3 rounded-2xl rounded-bl-sm flex gap-1.5 items-center">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="w-1.5 h-1.5 rounded-full bg-foreground/40 animate-bounce"
                          style={{ animationDelay: `${i * 0.15}s` }}
                        />
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Reveal strip */}
            <AnimatePresence>
              {showReveal && !revealClicked && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="mt-4 p-3 rounded-2xl bg-gradient-to-r from-primary/20 to-indigo-500/20 border border-primary/30 flex items-center justify-between gap-3"
                >
                  <div>
                    <p className="text-xs font-semibold text-foreground/90">
                      Both ready to reveal? 🎭
                    </p>
                    <p className="text-xs text-foreground/50">
                      Mutual reveal unlocks your real identities
                    </p>
                  </div>
                  <button
                    onClick={() => setRevealClicked(true)}
                    className="shrink-0 px-4 py-2 rounded-full bg-primary text-white text-xs font-semibold hover:bg-primary/90 transition-all flex items-center gap-1.5"
                  >
                    <Unlock className="w-3 h-3" /> Reveal
                  </button>
                </motion.div>
              )}
              {revealClicked && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="mt-4 p-4 rounded-2xl bg-gradient-to-r from-primary/30 to-indigo-500/30 border border-primary/40 text-center"
                >
                  <p className="text-sm font-bold text-white mb-1">✨ You found each other!</p>
                  <p className="text-xs text-foreground/60">
                    You&apos;re now connected as real people on campus.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Vibe feed — posts hint at romance naturally */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.6 }}
            className="glass-panel rounded-3xl p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-foreground">Campus Vibe Feed</p>
              <span className="text-xs text-foreground/40">Anonymous · SSIM only</span>
            </div>

            {VIBE_POSTS.map((post, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.7 + i * 0.12 }}
                className="bg-white/5 rounded-2xl p-4 border border-white/[0.08]"
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br ${post.color} flex items-center justify-center text-white text-xs font-bold`}
                  >
                    {post.avatar}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground/90">{post.alias}</p>
                    <p className="text-[10px] text-foreground/40">SSIM · {post.time}</p>
                  </div>
                  <div className="ml-auto flex gap-1">
                    {post.vibes.map((v, j) => (
                      <span key={j} className="text-sm">{v}</span>
                    ))}
                  </div>
                </div>
                <p className="text-xs text-foreground/70 leading-relaxed">{post.text}</p>
                <div className="flex items-center gap-3 mt-2 pt-2 border-t border-white/[0.08]">
                  <button className="text-[10px] text-foreground/40 hover:text-pink-400 transition-colors flex items-center gap-1">
                    ♥ {post.likes}
                  </button>
                  <button className="text-[10px] text-foreground/40 hover:text-primary transition-colors">
                    💬 Reply
                  </button>
                  <span className="ml-auto text-[10px] text-foreground/30">Identity hidden</span>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ───────── HOW IT WORKS ───────── */}
      <section id="how-it-works" className="relative z-10 w-full max-w-5xl px-6 mt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-12"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary/70 mb-3">
            The journey
          </p>
          <h2 className="text-3xl md:text-4xl font-bold">
            How you find{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-300">
              your person
            </span>
          </h2>
        </motion.div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {STEPS.map((step, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -4 }}
              className="glass-panel rounded-2xl p-6 flex flex-col gap-3 relative overflow-hidden"
            >
              <div className="absolute top-4 right-4 text-2xl font-black text-white/5 select-none">
                {step.num}
              </div>
              <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                {step.icon}
              </div>
              <h3 className="font-semibold text-base text-foreground">{step.title}</h3>
              <p className="text-sm text-foreground/55 leading-relaxed">{step.desc}</p>
              {i < STEPS.length - 1 && (
                <div className="hidden md:block absolute -right-2 top-1/2 -translate-y-1/2 z-10 text-foreground/20 text-lg">
                  →
                </div>
              )}
            </motion.div>
          ))}
        </div>
      </section>

      {/* ───────── STATS ───────── */}
      <section className="relative z-10 w-full max-w-5xl px-6 mt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="glass-panel rounded-3xl p-8"
        >
          <p className="text-center text-xs font-semibold tracking-[0.18em] uppercase text-primary/70 mb-8">
            SSIM campus · live numbers
          </p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { num: "36", label: "SSIM students joined" },
              { num: "84%", label: "Reveal within 3 days" },
              { num: "120+", label: "Vibes posted" },
              { num: "AI", label: "Verified profiles only" },
            ].map((stat, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.08 }}
                className="text-center"
              >
                <p className="text-4xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white to-foreground/50 mb-2">
                  {stat.num}
                </p>
                <p className="text-xs text-foreground/50 leading-snug">{stat.label}</p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </section>

      {/* ───────── TRUST / SSIM EXCLUSIVITY ───────── */}
      <section className="relative z-10 w-full max-w-5xl px-6 mt-16 mb-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="text-center mb-10"
        >
          <p className="text-xs font-semibold tracking-[0.18em] uppercase text-primary/70 mb-3">
            Built for your campus
          </p>
          <h2 className="text-3xl font-bold">
            Only for{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-300">
              SSIM
            </span>{" "}
            — and that&apos;s the point
          </h2>
          <p className="text-foreground/50 mt-3 max-w-lg mx-auto text-sm">
            A closed campus means every person you meet here walks the same
            corridors, eats at the same canteen, and lives in the same bubble as you.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: <ShieldCheck className="w-6 h-6 text-primary" />,
              title: "AI-verified SSIM IDs",
              desc: "Every profile is verified against your college ID by AI. If you didn't get into SSIM, you don't get in here.",
            },
            {
              icon: <EyeOff className="w-6 h-6 text-primary" />,
              title: "Anonymous until you choose",
              desc: "Your name, face, and identity stay hidden. You're in control of when — and who — gets to know you.",
            },
            {
              icon: <CheckCircle2 className="w-6 h-6 text-primary" />,
              title: "Mutual reveal, always",
              desc: "No surprises. No one-sided exposure. Identities unlock only when both people are ready.",
            },
          ].map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              whileHover={{ y: -5 }}
              className="glass-panel p-6 rounded-2xl flex flex-col items-center text-center gap-4"
            >
              <div className="p-3 bg-white/5 rounded-xl">{card.icon}</div>
              <h3 className="font-semibold text-lg">{card.title}</h3>
              <p className="text-sm text-foreground/60 leading-relaxed">{card.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA — reinforces SSIM exclusivity one final time */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="mt-16 text-center"
        >
          <p className="text-foreground/40 text-sm mb-6">
            Got an SSIM email? You&apos;re already on the list.
          </p>
          <Link
            href="/signup"
            className="inline-flex items-center gap-2 px-10 py-4 rounded-full bg-primary text-white font-semibold hover:bg-primary/90 transition-all shadow-[0_0_30px_rgba(109,93,254,0.25)]"
          >
            <GraduationCap className="w-4 h-4" />
            Claim your spot — SSIM only
          </Link>
        </motion.div>
      </section>
    </main>
  );
}