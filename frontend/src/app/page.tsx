"use client";

import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import ChatInterface from "@/components/ChatInterface";
import { ShieldCheck, BookOpen, FileStack, Menu, X, LogOut } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

export default function Home() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();

  const [referenceFiles, setReferenceFiles] = useState<any[]>([]);
  const [targetFiles, setTargetFiles] = useState<any[]>([]);
  const [scenario, setScenario] = useState("Universal Audit");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Use Firebase UID as the secure Session ID
  const sessionId = user?.uid || "";

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="h-screen w-full flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-purple-500/20 border-t-purple-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500 font-medium animate-pulse">Initializing Audit Analyst...</p>
        </div>
      </div>
    );
  }

  const uploadFile = async (file: File, type: "reference" | "target") => {
    if (!sessionId) return; // Wait for session

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api";
      const token = await user?.getIdToken();
      const res = await fetch(`${API_URL}/upload/${type}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        },
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Upload failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      const newFile = { name: data.name, uri: data.uri, type, local_path: data.local_path };

      if (type === "reference") {
        setReferenceFiles(prev => [...prev, newFile]);
      } else {
        setTargetFiles(prev => [...prev, newFile]);
      }

    } catch (e: any) {
      console.error(e);
      alert(`Failed to upload: ${e.message}`);
    }
  };

  const removeFile = (fileName: string, type: "reference" | "target") => {
    if (type === "reference") {
      setReferenceFiles(prev => prev.filter(f => f.name !== fileName));
    } else {
      setTargetFiles(prev => prev.filter(f => f.name !== fileName));
    }
  };

  const Sidebar = () => (
    <div className="flex flex-col h-full pt-6 pb-6 px-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-8 px-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
            <ShieldCheck className="w-5 h-5 text-purple-400" />
          </div>
          <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
            Audit Analyst
          </h1>
        </div>
        <button
          onClick={() => setIsSidebarOpen(false)}
          className="lg:hidden p-2 text-gray-500 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Config Area */}
      <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
        {/* Scenario Input */}
        <div>
          <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-3 block ml-1 opacity-70">Audit Scenario</label>
          <div className="relative group">
            <div className="absolute -inset-0.5 bg-gradient-to-r from-purple-500/20 to-blue-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500"></div>
            <input
              type="text"
              value={scenario}
              onChange={(e) => setScenario(e.target.value)}
              className="relative w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 outline-none text-gray-200 placeholder-gray-600 transition-all font-medium"
              placeholder="e.g. Clinical Compliance"
            />
          </div>
        </div>

        {/* Reference Files */}
        <div>
          <div className="flex items-center gap-2 mb-4 ml-1">
            <BookOpen className="w-4 h-4 text-purple-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-70">Knowledge Base</span>
          </div>
          <FileUploader
            label="Source of Truth (Ref)"
            files={referenceFiles}
            onUpload={(f) => uploadFile(f, "reference")}
            onRemove={(name) => removeFile(name, "reference")}
            acceptedFileTypes=".pdf,.txt,.md"
          />
        </div>

        {/* Target Files */}
        <div>
          <div className="flex items-center gap-2 mb-4 ml-1">
            <FileStack className="w-4 h-4 text-blue-400" />
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] opacity-70">Evidence Files</span>
          </div>
          <FileUploader
            label="Documents to Audit"
            files={targetFiles}
            onUpload={(f) => uploadFile(f, "target")}
            onRemove={(name) => removeFile(name, "target")}
          />
        </div>
      </div>

      {/* Footer */}
      <div className="pt-4 mt-4 border-t border-white/5 space-y-3">
        <Link
          href="/profile"
          className="flex items-center gap-3 px-4 py-3 w-full rounded-2xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-sm font-bold text-white shadow-lg relative z-10">
            {user?.displayName?.[0] || user?.email?.[0]?.toUpperCase() || "U"}
          </div>
          <div className="text-left flex-1 min-w-0 relative z-10">
            <p className="text-sm font-semibold text-white group-hover:text-blue-200 transition-colors truncate">
              {user?.displayName || user?.email?.split('@')[0] || "User"}
            </p>
            <p className="text-[10px] text-gray-500 font-medium">Platform Analytics</p>
          </div>
        </Link>
        <button onClick={() => signOut()} className="w-full flex items-center justify-center gap-2 p-2 mt-4 text-xs font-medium text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-red-500/20">
          <LogOut className="w-3 h-3" />
          Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden relative selection:bg-purple-500/30 font-sans">
      {/* Ambient Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-purple-900/10 blur-[150px] rounded-full pointer-events-none animate-pulse-soft" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-blue-900/10 blur-[150px] rounded-full pointer-events-none animate-pulse-soft" style={{ animationDelay: '1s' }} />

      {/* Mobile Header */}
      <div className="lg:hidden absolute top-0 left-0 w-full p-4 flex items-center justify-between z-20 bg-black/20 backdrop-blur-md border-b border-white/5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-purple-400" />
          <span className="font-bold text-sm tracking-tight">Audit V3</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="p-2 bg-white/5 rounded-xl border border-white/10 shadow-lg"
        >
          <Menu className="w-5 h-5 text-gray-300" />
        </button>
      </div>

      <div className="z-10 flex w-full h-full max-w-[1920px] mx-auto lg:p-4 gap-4">
        {/* Desktop Sidebar */}
        <div className="hidden lg:flex w-85 bg-gray-900/40 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden shrink-0">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
              />
              <motion.div
                initial={{ x: "-100%" }}
                animate={{ x: 0 }}
                exit={{ x: "-100%" }}
                transition={{ type: "spring", damping: 25, stiffness: 200 }}
                className="lg:hidden fixed inset-y-0 left-0 w-[85%] max-w-sm bg-gray-950 border-r border-white/10 z-50 shadow-2xl"
              >
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content (Chat) */}
        <div className="flex-1 flex flex-col h-full overflow-hidden pt-16 lg:pt-0">
          <ChatInterface
            referenceFiles={referenceFiles}
            targetFiles={targetFiles}
            scenario={scenario}
            sessionId={sessionId}
          />
        </div>
      </div>
    </div>
  );
}

