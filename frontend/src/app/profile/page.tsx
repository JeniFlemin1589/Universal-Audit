"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, FileText, CheckCircle, Clock } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function ProfilePage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [sessionData, setSessionData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        } else if (user) {
            fetchSessionData(user.uid);
        }
    }, [user, loading, router]);

    const fetchSessionData = async (uid: string) => {
        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/session/${uid}`);
            if (res.ok) {
                const data = await res.json();
                setSessionData(data);
            }
        } catch (e) {
            console.error("Failed to fetch session data", e);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/login"); // Redirect handled by AuthContext but forcing helps
    };

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto p-8 relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between mb-12">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span>Back to Audit</span>
                    </Link>
                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-500/20 transition-all text-sm font-medium"
                    >
                        <LogOut className="w-4 h-4" />
                        Sign Out
                    </button>
                </header>

                {/* Profile Card */}
                <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8 flex items-center gap-6 shadow-2xl">
                    <div className="relative">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-40"></div>
                        <img
                            src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`}
                            alt="Profile"
                            className="relative w-24 h-24 rounded-full border-2 border-white/10 shadow-lg object-cover"
                        />
                    </div>
                    <div>
                        <h1 className="text-3xl font-bold tracking-tight mb-1">{user.displayName || "Auditor"}</h1>
                        <p className="text-gray-400 text-sm font-medium">{user.email}</p>
                        <div className="flex items-center gap-2 mt-3 text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full w-fit border border-green-400/20">
                            <CheckCircle className="w-3 h-3" />
                            Verified Session
                        </div>
                    </div>
                </div>

                {/* Content Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

                    {/* Activity / Files */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <Clock className="w-5 h-5 text-blue-400" />
                            Recent Activity
                        </h2>

                        <div className="space-y-4">
                            {/* Reference Files */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Processed References</h3>
                                {!sessionData?.reference?.length ? (
                                    <p className="text-gray-600 text-sm">No reference documents uploaded.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {sessionData.reference.map((f: any, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                                <div className="p-2 bg-purple-500/20 rounded-lg">
                                                    <FileText className="w-4 h-4 text-purple-400" />
                                                </div>
                                                <span className="truncate max-w-[200px]" title={f.name}>{f.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Target Files */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <h3 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Audited Documents</h3>
                                {!sessionData?.target?.length ? (
                                    <p className="text-gray-600 text-sm">No documents audited yet.</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {sessionData.target.map((f: any, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-gray-300">
                                                <div className="p-2 bg-blue-500/20 rounded-lg">
                                                    <FileText className="w-4 h-4 text-blue-400" />
                                                </div>
                                                <span className="truncate max-w-[200px]" title={f.name}>{f.name}</span>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Latest Summary */}
                    <div className="space-y-6">
                        <h2 className="text-xl font-bold flex items-center gap-2">
                            <FileText className="w-5 h-5 text-purple-400" />
                            Latest Audit Summary
                        </h2>
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-8 h-[500px] overflow-y-auto custom-scrollbar">
                            {!sessionData?.summary ? (
                                <div className="flex flex-col items-center justify-center h-full text-gray-500 text-center space-y-4">
                                    <FileText className="w-12 h-12 opacity-20" />
                                    <p>No audit summary available.<br />Complete a chat session to see results here.</p>
                                </div>
                            ) : (
                                <div className="prose prose-invert prose-sm max-w-none">
                                    <ReactMarkdown>{sessionData.summary}</ReactMarkdown>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
