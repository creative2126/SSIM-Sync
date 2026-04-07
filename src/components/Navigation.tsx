"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, MessageSquare, User, Shield, Zap, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useNotifications } from "@/hooks/useNotifications";

export default function Navigation() {
    const pathname = usePathname();
    const { unreadCount } = useNotifications();

    // Hide navigation on landing, login, and signup pages
    if (pathname === "/" || pathname === "/login" || pathname === "/signup") return null;

    const tabs = [
        { name: "Discover", icon: <Search className="w-5 h-5" />, path: "/feed" },
        { name: "Vibes", icon: <Zap className="w-5 h-5" />, path: "/vibes" },
        { name: "Chats", icon: <MessageSquare className="w-5 h-5" />, path: "/matches", badge: unreadCount },
        { name: "Profile", icon: <User className="w-5 h-5" />, path: "/profile" },
    ];

    return (
        <nav className="fixed bottom-0 left-0 right-0 z-[100] px-4 pb-[calc(env(safe-area-inset-bottom,1.5rem)+0.5rem)] pt-2 bg-midnight/80 backdrop-blur-xl border-t border-white/5 md:bg-midnight/20 md:border-none md:top-0 md:bottom-auto md:pt-6 md:pb-6">
            <div className="max-w-md mx-auto flex items-center justify-between px-6 py-3 bg-white/5 rounded-[2rem] border border-white/10 md:max-w-4xl md:bg-transparent md:border-none">

                {/* Desktop Logo */}
                <div className="hidden md:flex items-center gap-3 mr-auto">
                    <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
                        <Shield className="w-6 h-6 text-white" />
                    </div>
                    <span className="font-bold text-xl tracking-tight text-white">SSIM Sync</span>
                </div>

                <div className="flex flex-1 justify-around md:justify-end md:gap-10">
                    {tabs.map((tab) => {
                        const isActive = pathname === tab.path;
                        return (
                            <Link
                                key={tab.name}
                                href={tab.path}
                                className="relative flex flex-col items-center gap-1 group"
                            >
                                <motion.div
                                    animate={isActive ? { scale: 1.1, y: -2 } : { scale: 1, y: 0 }}
                                    className={`transition-colors duration-300 relative ${isActive ? "text-primary drop-shadow-[0_0_8px_rgba(109,93,254,0.5)]" : "text-foreground/40 group-hover:text-foreground/70"}`}
                                >
                                    {tab.icon}
                                    {tab.badge !== undefined && tab.badge > 0 && (
                                        <motion.div
                                            initial={{ scale: 0 }}
                                            animate={{ scale: 1 }}
                                            className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full flex items-center justify-center text-[8px] font-black text-white border-2 border-midnight"
                                        >
                                            {tab.badge > 9 ? "9+" : tab.badge}
                                        </motion.div>
                                    )}
                                </motion.div>
                                <span className={`text-[9px] font-bold uppercase tracking-widest transition-colors duration-300 ${isActive ? "text-primary" : "text-foreground/20"}`}>
                                    {tab.name}
                                </span>

                                {isActive && (
                                    <motion.div
                                        layoutId="nav-glow"
                                        className="absolute -inset-3 bg-primary/10 blur-xl rounded-full -z-10"
                                    />
                                )}

                                <AnimatePresence>
                                    {isActive && (
                                        <motion.div
                                            layoutId="nav-indicator"
                                            className="absolute -bottom-1 w-1 h-1 bg-primary rounded-full shadow-[0_0_10px_rgba(109,93,254,0.8)]"
                                            initial={{ opacity: 0, scale: 0 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0 }}
                                        />
                                    )}
                                </AnimatePresence>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </nav>
    );
}

