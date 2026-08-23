import { createClient } from "@supabase/supabase-js";
import { notFound } from "next/navigation";
import Link from "next/link";

const supabasePublic = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const { data: vibe } = await supabasePublic
        .from("vibes")
        .select("content")
        .eq("id", id)
        .single();

    const snippet = vibe?.content?.slice(0, 80) || "";
    return {
        title: snippet ? `"${snippet}..." — SSIM Sync` : "SSIM Sync",
        description: vibe?.content || "A private, anonymous campus social app for SSIM students.",
        openGraph: {
            title: "Campus Vibe — SSIM Sync",
            description: vibe?.content || "See what SSIM students are saying anonymously.",
            images: ["/icon.png"],
        },
    };
}

export default async function VibeDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;

    const { data: vibe } = await supabasePublic
        .from("vibes")
        .select("*, profiles_public(alias, gender, verification_status)")
        .eq("id", id)
        .single();

    if (!vibe) notFound();

    const gender = vibe.profiles_public?.gender;
    const isFemine = gender === "Female";

    const timeAgo = (dateStr: string) => {
        const diff = (Date.now() - new Date(dateStr).getTime()) / 1000;
        if (diff < 60) return "just now";
        if (diff < 3600) return Math.floor(diff / 60) + "m ago";
        if (diff < 86400) return Math.floor(diff / 3600) + "h ago";
        return Math.floor(diff / 86400) + "d ago";
    };

    return (
        <main className="min-h-screen bg-[#0D0E12] flex flex-col items-center justify-center p-6 relative overflow-hidden">
            {/* Background glow */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(109,93,254,0.08),transparent_70%)] pointer-events-none" />

            <div className="relative w-full max-w-md">
                {/* Logo */}
                <div className="flex items-center justify-center gap-2 mb-10">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center shadow-lg"
                        style={{ background: "linear-gradient(135deg, #9B00E8, #FF2A6D)" }}>
                        <span className="text-white font-black text-xs">S</span>
                    </div>
                    <span className="text-white font-black text-sm tracking-widest uppercase">SSIM Sync</span>
                </div>

                {/* Vibe Card */}
                <div className="bg-white/[0.03] backdrop-blur-xl border border-white/10 rounded-[2.5rem] p-8 mb-6 shadow-2xl">
                    <p className="text-[10px] font-black uppercase tracking-[0.25em] mb-6"
                        style={{ color: "rgba(255,255,255,0.25)" }}>
                        📣 Campus Vibe
                    </p>

                    <p className="text-white text-2xl font-bold italic leading-relaxed mb-8">
                        &ldquo;{vibe.content}&rdquo;
                    </p>

                    <div className="flex items-center gap-3 pt-6 border-t border-white/5">
                        <div
                            className="w-9 h-9 rounded-full flex items-center justify-center shadow-lg shrink-0"
                            style={{
                                background: isFemine
                                    ? "linear-gradient(135deg, #FF2A6D, #fb7185)"
                                    : "linear-gradient(135deg, #9B00E8, #22d3ee)"
                            }}
                        >
                            <span className="text-white text-xs font-black">⚡</span>
                        </div>
                        <div>
                            <p className="text-white/60 text-sm font-bold">
                                {vibe.profiles_public?.alias || "Anonymous"}
                                {vibe.profiles_public?.verification_status === "verified" && (
                                    <span className="ml-2 text-emerald-400 text-[9px] font-black uppercase tracking-widest">✓ verified</span>
                                )}
                            </p>
                            <p className="text-[10px] uppercase tracking-widest font-bold mt-0.5"
                                style={{ color: "rgba(255,255,255,0.2)" }}>
                                {gender} · {timeAgo(vibe.created_at)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* CTA Buttons */}
                <div className="flex flex-col gap-3">
                    <Link
                        href="/signup"
                        className="w-full py-4 rounded-2xl text-white font-black text-sm text-center uppercase tracking-widest shadow-xl block"
                        style={{ background: "linear-gradient(135deg, #9B00E8, #FF2A6D)" }}
                    >
                        Join SSIM Sync 🔥
                    </Link>
                    <Link
                        href="/vibes"
                        className="w-full py-4 rounded-2xl text-center text-xs font-bold uppercase tracking-widest block"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}
                    >
                        See all campus vibes →
                    </Link>
                </div>

                <p className="text-center text-[10px] uppercase tracking-widest font-bold mt-8"
                    style={{ color: "rgba(255,255,255,0.15)" }}>
                    Anonymous · Verified SSIM Students Only
                </p>
            </div>
        </main>
    );
}
