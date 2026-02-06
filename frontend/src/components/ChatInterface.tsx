"use client";

import React, { useState, useRef, useEffect } from "react";
import { Send, Bot, User, ChevronDown, ChevronRight, Loader2, CheckCircle2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";

interface Message {
    role: "user" | "assistant";
    content: string;
    steps?: AgentStep[];
}

interface AgentStep {
    name: string;
    status: "running" | "completed";
}

interface ChatInterfaceProps {
    referenceFiles: any[];
    targetFiles: any[];
    scenario: string;
    sessionId: string;
}

export default function ChatInterface({ referenceFiles, targetFiles, scenario, sessionId }: ChatInterfaceProps) {
    const [input, setInput] = useState("");
    const [messages, setMessages] = useState<Message[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // Initial assistant message placeholder
        const botMsgId = Date.now();
        setMessages((prev) => [
            ...prev,
            { role: "assistant", content: "", steps: [] }
        ]);

        try {
            const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
            const res = await fetch(`${API_URL}/chat/stream`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    message: userMsg.content,
                    scenario: scenario,
                    session_id: sessionId,
                    reference_files: referenceFiles,
                    target_files: targetFiles,
                    history: messages.map(m => ({ role: m.role, content: m.content }))
                })
            });

            if (!res.ok) {
                const errText = await res.text();
                throw new Error(`Server Error (${res.status}): ${errText}`);
            }

            const reader = res.body?.getReader();
            const decoder = new TextDecoder();

            if (!reader) throw new Error("No reader");

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value);
                const lines = chunk.split("\n");

                for (const line of lines) {
                    if (!line.trim()) continue;

                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6);
                        if (dataStr === "[DONE]") break;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.error) {
                                throw new Error(data.error);
                            }

                            setMessages((prev) => {
                                const newMsgs = [...prev];
                                const lastMsg = newMsgs[newMsgs.length - 1];

                                if (data.step === "strategist" || data.step === "auditor" || data.step === "verifier") {
                                    // Update steps
                                    const stepNameMap: Record<string, string> = {
                                        strategist: "Analyzing Strategy & Rules",
                                        auditor: "Auditing Targets",
                                        verifier: "Verifying Findings"
                                    };

                                    const stepName = stepNameMap[data.step];

                                    const steps = lastMsg.steps || [];

                                    const existingIdx = steps.findIndex(s => s.name === stepName);

                                    if (existingIdx !== -1) {
                                        // Update existing step status
                                        steps[existingIdx] = { ...steps[existingIdx], status: data.status };
                                    } else {
                                        // Add new step
                                        steps.push({ name: stepName, status: data.status });
                                    }

                                    lastMsg.steps = steps;
                                }

                                if (data.step === "final") {
                                    lastMsg.content += data.content; // In reality verify if chunked or full
                                    // Our backend sends full final response at once currently, but if needed we can chunk it
                                    // The current main.py sends 'content' once at the end. 
                                    // To make it look like streaming text, we might just set it.
                                    lastMsg.content = data.content;
                                }

                                return newMsgs;
                            });

                        } catch (e) {
                            console.error("Parse error", e);
                            setMessages(prev => {
                                const newMsgs = [...prev];
                                const lastMsg = newMsgs[newMsgs.length - 1];
                                lastMsg.content = `**Error**: ${e instanceof Error ? e.message : "Failed to parse agent response."}`;
                                return newMsgs;
                            });
                        }
                    }
                }
            }

        } catch (e: any) {
            console.error(e);
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                lastMsg.content = `**Error**: ${e.message || "Could not connect to audit agent."}`;
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/40 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden shadow-2xl relative">
            {/* Header / Info */}
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 opacity-50" />

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8 scroll-smooth">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-gray-500/50">
                        <div className="w-20 h-20 bg-gray-800/50 rounded-3xl flex items-center justify-center mb-6 shadow-lg border border-white/5">
                            <Bot className="w-10 h-10 text-blue-400" />
                        </div>
                        <h3 className="text-xl font-medium text-white/80 mb-2">Universal Audit V3</h3>
                        <p className="text-sm">Upload evidence & reference files to begin a deep audit.</p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, ease: "easeOut" }}
                            key={idx}
                            className={`flex gap-5 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                        >

                            {msg.role === "assistant" && (
                                <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center shrink-0 shadow-lg shadow-purple-900/20">
                                    <Bot className="w-6 h-6 text-white" />
                                </div>
                            )}

                            <div className={`max-w-[85%] space-y-3`}>
                                {/* Thought Process (Assistant Only) */}
                                {msg.role === "assistant" && msg.steps && msg.steps.length > 0 && (
                                    <motion.div
                                        initial={{ opacity: 0, height: 0 }}
                                        animate={{ opacity: 1, height: "auto" }}
                                        className="bg-black/20 backdrop-blur-md border border-white/5 rounded-xl p-4 text-sm"
                                    >
                                        <p className="text-white/40 font-bold mb-3 text-[10px] uppercase tracking-[0.2em]">Audit Intelligence</p>
                                        <div className="space-y-3">
                                            {msg.steps.map((step, sIdx) => (
                                                <div key={sIdx} className={`flex items-center gap-3 ${step.status === "completed" ? "text-emerald-400" : "text-blue-400"}`}>
                                                    {step.status === "completed" ? (
                                                        <CheckCircle2 className="w-4 h-4" />
                                                    ) : (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    )}
                                                    <span className="font-medium tracking-wide text-xs">{step.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </motion.div>
                                )}

                                <div className={`p-6 rounded-3xl backdrop-blur-sm shadow-xl ${msg.role === "user"
                                    ? "bg-blue-600 text-white rounded-br-none bg-gradient-to-br from-blue-600 to-blue-700 border border-blue-500/50"
                                    : "bg-white/5 text-gray-100 rounded-tl-none border border-white/10"
                                    }`}>
                                    <div className="prose prose-invert prose-p:leading-relaxed prose-headings:text-white/90 prose-strong:text-white prose-table:border-white/10 prose-th:bg-white/5 prose-td:border-white/10 max-w-none text-sm">
                                        <ReactMarkdown>
                                            {msg.content || (isLoading ? "..." : "")}
                                        </ReactMarkdown>
                                    </div>
                                </div>
                            </div>

                            {msg.role === "user" && (
                                <div className="w-10 h-10 rounded-2xl bg-gray-800 flex items-center justify-center shrink-0 border border-white/10">
                                    <User className="w-5 h-5 text-gray-400" />
                                </div>
                            )}
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-6 bg-black/20 backdrop-blur-md border-t border-white/5">
                <div className="relative group">
                    <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl opacity-20 group-hover:opacity-40 transition duration-500 blur"></div>
                    <div className="relative flex items-center bg-gray-950 rounded-2xl border border-white/10 focus-within:border-white/20 transition-colors">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                            placeholder={referenceFiles.length === 0 ? "Upload reference files to activate Neural Audit..." : "Ask the Senior Auditor..."}
                            disabled={isLoading}
                            className="w-full bg-transparent text-white py-4 pl-5 pr-14 outline-none placeholder:text-gray-600"
                        />
                        <button
                            onClick={sendMessage}
                            disabled={!input.trim() || isLoading}
                            className="absolute right-2 p-2 bg-white/10 text-white rounded-xl hover:bg-white/20 disabled:opacity-30 disabled:cursor-not-allowed transition-all hover:scale-105 active:scale-95"
                        >
                            <Send className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <p className="text-center text-[10px] text-gray-600 mt-3 font-medium tracking-wider uppercase">
                    Powered by Gemini 2.5 Flash Lite • Universal Audit V3
                </p>
            </div>
        </div>
    );
}
