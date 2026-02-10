"use client";

import React, { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { ArrowLeft, LogOut, FileText, CheckCircle, Clock, RefreshCw, BookOpen, FileStack, ShieldCheck, AlertCircle } from "lucide-react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

export default function ProfilePage() {
    const { user, loading, signOut } = useAuth();
    const router = useRouter();
    const [sessionData, setSessionData] = useState<any>(null);
    const [isLoadingData, setIsLoadingData] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);

    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        } else if (user) {
            fetchSessionData(user.uid);
        }
    }, [user, loading, router]);

    const fetchSessionData = async (uid: string) => {
        if (!user) return;
        try {
            setIsLoadingData(true);
            setFetchError(null);

            // Primary: Fetch via backend API (uses Firebase Admin SDK, bypasses security rules)
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
            const token = await user.getIdToken();
            const res = await fetch(`${API_URL}/session/${uid}`, {
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            });

            if (res.ok) {
                const data = await res.json();
                console.log("Session data loaded via API:", data);

                // Normalize data: API returns UploadedFile objects, ensure we have arrays
                const normalized = {
                    reference: Array.isArray(data.reference) ? data.reference : [],
                    target: Array.isArray(data.target) ? data.target : [],
                    summary: data.summary || null,
                    history: data.history || [],
                };
                setSessionData(normalized);
                return;
            }

            // API returned an error
            console.warn(`API fetch failed with status ${res.status}`);
            setSessionData(null);
        } catch (e: any) {
            console.error("Failed to fetch session data:", e);
            setFetchError(e.message || "Failed to load data. Please try refreshing.");
            setSessionData(null);
        } finally {
            setIsLoadingData(false);
        }
    };

    const handleSignOut = async () => {
        await signOut();
        router.push("/login");
    };

    // Helper to safely get files array
    const getFiles = (type: string): any[] => {
        if (!sessionData) return [];
        const files = sessionData[type];
        if (!files) return [];
        if (Array.isArray(files)) return files;
        return [];
    };

    const referenceFiles = getFiles("reference");
    const targetFiles = getFiles("target");
    const totalFiles = referenceFiles.length + targetFiles.length;

    if (loading || !user) return null;

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans">
            {/* Ambient Background */}
            <div className="fixed top-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none" />
            <div className="fixed bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none" />

            <div className="max-w-5xl mx-auto p-6 md:p-8 relative z-10">
                {/* Header */}
                <header className="flex items-center justify-between mb-10">
                    <Link href="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors group">
                        <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                        <span className="text-sm font-medium">Back to Audit</span>
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
                <div className="bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl p-8 mb-8 shadow-2xl">
                    <div className="flex items-center gap-6">
                        <div className="relative shrink-0">
                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full blur opacity-40"></div>
                            <img
                                src={user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=7c3aed&color=fff&bold=true`}
                                alt="Profile"
                                className="relative w-20 h-20 md:w-24 md:h-24 rounded-full border-2 border-white/10 shadow-lg object-cover"
                            />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h1 className="text-2xl md:text-3xl font-bold tracking-tight mb-1 truncate">{user.displayName || user.email?.split("@")[0] || "Auditor"}</h1>
                            <p className="text-gray-400 text-sm font-medium truncate">{user.email}</p>
                            <div className="flex items-center flex-wrap gap-2 mt-3">
                                <div className="flex items-center gap-1.5 text-xs text-green-400 bg-green-400/10 px-3 py-1 rounded-full border border-green-400/20">
                                    <CheckCircle className="w-3 h-3" />
                                    Active Session
                                </div>
                                {totalFiles > 0 && (
                                    <div className="flex items-center gap-1.5 text-xs text-blue-400 bg-blue-400/10 px-3 py-1 rounded-full border border-blue-400/20">
                                        <FileText className="w-3 h-3" />
                                        {totalFiles} Document{totalFiles !== 1 ? 's' : ''} Processed
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Error Banner */}
                {fetchError && (
                    <div className="bg-red-500/10 border border-red-500/20 rounded-2xl p-4 mb-6 flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-sm text-red-300">{fetchError}</p>
                        <button onClick={() => user && fetchSessionData(user.uid)} className="ml-auto text-xs text-red-400 underline hover:text-red-300">Retry</button>
                    </div>
                )}

                {/* Refresh Bar */}
                <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold flex items-center gap-2">
                        <Clock className="w-5 h-5 text-blue-400" />
                        Your Audit Dashboard
                    </h2>
                    <button
                        onClick={() => user && fetchSessionData(user.uid)}
                        disabled={isLoadingData}
                        className="flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-xl hover:bg-blue-500/20 transition-all disabled:opacity-50"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${isLoadingData ? 'animate-spin' : ''}`} />
                        {isLoadingData ? 'Loading...' : 'Refresh Data'}
                    </button>
                </div>

                {/* Loading State */}
                {isLoadingData && !sessionData && (
                    <div className="flex flex-col items-center justify-center py-20 text-gray-500">
                        <div className="w-10 h-10 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin mb-4" />
                        <p className="text-sm">Loading your audit data...</p>
                    </div>
                )}

                {/* No Data State */}
                {!isLoadingData && !sessionData && !fetchError && (
                    <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center">
                        <ShieldCheck className="w-16 h-16 text-gray-700 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-400 mb-2">No Audit Data Yet</h3>
                        <p className="text-gray-600 text-sm max-w-md mx-auto">Upload reference and target documents on the main page, then run an audit to see your results here.</p>
                        <Link href="/" className="inline-flex items-center gap-2 mt-6 px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-sm font-medium rounded-xl transition-colors">
                            <ShieldCheck className="w-4 h-4" />
                            Start Your First Audit
                        </Link>
                    </div>
                )}

                {/* Content Grid - shown when data exists */}
                {sessionData && (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

                        {/* Left Column - Documents (2/5 width) */}
                        <div className="lg:col-span-2 space-y-5">
                            {/* Reference Files */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-purple-500/20 rounded-lg">
                                        <BookOpen className="w-4 h-4 text-purple-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-300">Reference Documents</h3>
                                    {referenceFiles.length > 0 && (
                                        <span className="ml-auto text-[10px] font-bold text-purple-400 bg-purple-500/15 px-2 py-0.5 rounded-full">{referenceFiles.length}</span>
                                    )}
                                </div>
                                {referenceFiles.length === 0 ? (
                                    <p className="text-gray-600 text-xs italic">No reference documents uploaded.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {referenceFiles.map((f: any, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-gray-300 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
                                                <div className="p-1.5 bg-purple-500/20 rounded-lg shrink-0">
                                                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium truncate" title={f.name}>{f.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Source of Truth</p>
                                                </div>
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Target Files */}
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-5">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className="p-1.5 bg-blue-500/20 rounded-lg">
                                        <FileStack className="w-4 h-4 text-blue-400" />
                                    </div>
                                    <h3 className="text-sm font-semibold text-gray-300">Audited Documents</h3>
                                    {targetFiles.length > 0 && (
                                        <span className="ml-auto text-[10px] font-bold text-blue-400 bg-blue-500/15 px-2 py-0.5 rounded-full">{targetFiles.length}</span>
                                    )}
                                </div>
                                {targetFiles.length === 0 ? (
                                    <p className="text-gray-600 text-xs italic">No documents audited yet.</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {targetFiles.map((f: any, i: number) => (
                                            <li key={i} className="flex items-center gap-3 text-sm text-gray-300 bg-white/5 rounded-xl px-3 py-2.5 border border-white/5">
                                                <div className="p-1.5 bg-blue-500/20 rounded-lg shrink-0">
                                                    <FileText className="w-3.5 h-3.5 text-blue-400" />
                                                </div>
                                                <div className="min-w-0 flex-1">
                                                    <p className="text-xs font-medium truncate" title={f.name}>{f.name}</p>
                                                    <p className="text-[10px] text-gray-500 mt-0.5">Evidence File</p>
                                                </div>
                                                <CheckCircle className="w-3.5 h-3.5 text-green-500 shrink-0" />
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>

                            {/* Stats Card */}
                            <div className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border border-white/10 rounded-2xl p-5">
                                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Session Stats</h3>
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-purple-400">{referenceFiles.length}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">References</p>
                                    </div>
                                    <div className="bg-white/5 rounded-xl p-3 text-center">
                                        <p className="text-2xl font-bold text-blue-400">{targetFiles.length}</p>
                                        <p className="text-[10px] text-gray-500 mt-1">Targets</p>
                                    </div>
                                </div>
                                <div className="mt-3 bg-white/5 rounded-xl p-3 text-center">
                                    <p className="text-2xl font-bold text-green-400">{sessionData?.summary ? '✓' : '—'}</p>
                                    <p className="text-[10px] text-gray-500 mt-1">Audit Report</p>
                                </div>
                            </div>
                        </div>

                        {/* Right Column - Latest Audit Summary (3/5 width) */}
                        <div className="lg:col-span-3 space-y-4">
                            <div className="flex items-center gap-2">
                                <ShieldCheck className="w-5 h-5 text-purple-400" />
                                <h2 className="text-lg font-bold">Latest Audit Report</h2>
                            </div>
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-6 md:p-8 min-h-[300px] max-h-[700px] overflow-y-auto custom-scrollbar">
                                {!sessionData?.summary ? (
                                    <div className="flex flex-col items-center justify-center h-64 text-gray-500 text-center space-y-4">
                                        <ShieldCheck className="w-14 h-14 opacity-15" />
                                        <div>
                                            <p className="font-medium text-gray-400 mb-1">No audit report yet</p>
                                            <p className="text-xs text-gray-600">Upload documents and run an audit from the main page.<br />Your latest report will appear here automatically.</p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="prose prose-invert prose-sm max-w-none
                                        prose-headings:text-white prose-headings:font-bold
                                        prose-h1:text-xl prose-h1:border-b prose-h1:border-white/10 prose-h1:pb-3 prose-h1:mb-4
                                        prose-h2:text-lg prose-h2:mt-6
                                        prose-h3:text-base prose-h3:text-purple-300
                                        prose-h4:text-sm prose-h4:text-blue-300
                                        prose-p:text-gray-300 prose-p:leading-relaxed
                                        prose-strong:text-white
                                        prose-li:text-gray-300
                                        prose-code:text-purple-300 prose-code:bg-purple-500/10 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
                                        prose-table:text-xs
                                        prose-th:bg-white/10 prose-th:text-gray-200 prose-th:font-semibold
                                        prose-td:border-white/5
                                    ">
                                        <ReactMarkdown>{sessionData.summary}</ReactMarkdown>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
