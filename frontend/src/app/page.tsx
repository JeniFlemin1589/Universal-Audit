"use client";

import React, { useState } from "react";
import FileUploader from "@/components/FileUploader";
import ChatInterface from "@/components/ChatInterface";
import { ShieldCheck, BookOpen, FileStack } from "lucide-react";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function Home() {
  const { user, loading } = useAuth();
  const router = useRouter();

  // Use Firebase UID as the secure Session ID
  const sessionId = user?.uid || "";

  const [referenceFiles, setReferenceFiles] = useState<any[]>([]);
  const [targetFiles, setTargetFiles] = useState<any[]>([]);
  const [scenario, setScenario] = useState("Universal Audit");

  React.useEffect(() => {
    if (!loading && !user) {
      router.push("/login");
    }
  }, [user, loading, router]);

  if (loading || !user) return null; // Or a loading spinner

  const uploadFile = async (file: File, type: "reference" | "target") => {
    if (!sessionId) return; // Wait for session

    const formData = new FormData();
    formData.append("file", file);
    formData.append("session_id", sessionId);

    try {
      const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      const res = await fetch(`${API_URL}/upload/${type}`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(`Upload failed (${res.status}): ${err}`);
      }

      const data = await res.json();
      const newFile = { name: data.name, uri: data.uri, type };

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

  return (
    <div className="flex h-screen w-full bg-[#050505] text-white overflow-hidden relative selection:bg-purple-500/30">
      {/* Ambient Background Effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-900/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-900/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="z-10 flex w-full h-full max-w-[1600px] mx-auto p-4 gap-4">
        {/* Left Sidebar */}
        <div className="w-80 bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl flex flex-col pt-6 pb-6 px-4 shrink-0 shadow-2xl">
          {/* Header */}
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="p-2 bg-purple-600/20 rounded-xl border border-purple-500/30">
              <ShieldCheck className="w-6 h-6 text-purple-400" />
            </div>
            <h1 className="font-bold text-lg bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent tracking-tight">
              Audit Analyst
            </h1>
          </div>

          {/* Scrollable Config Area */}
          <div className="flex-1 overflow-y-auto space-y-8 pr-2 custom-scrollbar">
            {/* Scenario Input */}
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 block ml-1">Audit Scenario</label>
              <input
                type="text"
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm focus:border-purple-500 focus:ring-1 focus:ring-purple-500 outline-none text-gray-200 placeholder-gray-600 transition-all"
                placeholder="e.g. Medical Claims"
              />
            </div>

            {/* Reference Files */}
            <div>
              <div className="flex items-center gap-2 mb-3 ml-1">
                <BookOpen className="w-4 h-4 text-purple-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Knowledge Base</span>
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
              <div className="flex items-center gap-2 mb-3 ml-1">
                <FileStack className="w-4 h-4 text-blue-400" />
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Evidence Files</span>
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
          <div className="pt-4 border-t border-white/5 text-center flex flex-col items-center gap-4">
            <Link
              href="/profile"
              className="flex items-center gap-3 px-4 py-3 w-full rounded-xl bg-white/5 hover:bg-white/10 transition-all border border-white/5 group"
            >
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-xs font-bold text-white">
                {user?.displayName?.[0] || "U"}
              </div>
              <div className="text-left flex-1 min-w-0">
                <p className="text-sm font-medium text-white group-hover:text-blue-200 transition-colors truncate">
                  {user?.displayName || "User"}
                </p>
                <p className="text-[10px] text-gray-500">View Profile</p>
              </div>
            </Link>
            <p className="text-[10px] text-gray-600 font-medium">Universal Audit Platform V3.0</p>
          </div>
        </div>

        {/* Main Content (Chat) */}
        <div className="flex-1 flex flex-col h-full">
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
