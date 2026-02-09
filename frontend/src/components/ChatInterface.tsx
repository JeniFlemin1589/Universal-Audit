"use client";

import ProfessionalReport from "@/components/ProfessionalReport";

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
    const [isThoughtExpanded, setIsThoughtExpanded] = useState(true);
    const scrollRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
        }
    }, [messages, isLoading]);

    const sendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg: Message = { role: "user", content: input };
        setMessages((prev) => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        // Initial assistant message placeholder
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

            let buffer = ""; // Buffer to hold incomplete lines

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                buffer += chunk;

                const lines = buffer.split("\n");
                // Keep the last line (potentially incomplete) in the buffer
                buffer = lines.pop() || "";

                for (const line of lines) {
                    if (!line.trim()) continue;

                    if (line.startsWith("data: ")) {
                        const dataStr = line.slice(6);
                        if (dataStr === "[DONE]") break;

                        try {
                            const data = JSON.parse(dataStr);

                            if (data.error) {
                                // If it's a specific overload error, beautify it
                                if (data.error.includes("503") || data.error.includes("overloaded")) {
                                    throw new Error("System is currently overloaded. Please wait a moment and try again.");
                                }
                                throw new Error(data.error);
                            }

                            setMessages((prev) => {
                                const newMsgs = [...prev];
                                const lastMsg = newMsgs[newMsgs.length - 1];

                                if (data.step === "strategist" || data.step === "auditor" || data.step === "verifier") {
                                    const stepNameMap: Record<string, string> = {
                                        strategist: "Analyzing Strategy & Guidelines",
                                        auditor: "Cross-Referencing Evidence",
                                        verifier: "Synthesizing Final Audit Report"
                                    };

                                    const stepName = stepNameMap[data.step];
                                    const steps = lastMsg.steps || [];
                                    const existingIdx = steps.findIndex(s => s.name === stepName);

                                    if (existingIdx !== -1) {
                                        steps[existingIdx] = { ...steps[existingIdx], status: data.status };
                                    } else {
                                        steps.push({ name: stepName, status: data.status });
                                    }
                                    lastMsg.steps = steps;
                                }

                                if (data.step === "final") {
                                    lastMsg.content = data.content;
                                }

                                return newMsgs;
                            });

                        } catch (e) {
                            // Ignore parse errors for incomplete chunks (though buffer logic should prevent this usually)
                            // But handle our thrown errors
                            if (e instanceof Error && (e.message.includes("overloaded") || e.message.includes("System"))) {
                                console.error("Critical Stream Error", e);
                                setMessages(prev => {
                                    const newMsgs = [...prev];
                                    const lastMsg = newMsgs[newMsgs.length - 1];
                                    lastMsg.content = `⚠️ **System Alert**: ${e.message}`;
                                    return newMsgs;
                                });
                                return; // Stop processing
                            }
                            console.warn("Non-critical stream parse error", e);
                        }
                    }
                }
            }

        } catch (e: any) {
            console.error(e);
            setMessages(prev => {
                const newMsgs = [...prev];
                const lastMsg = newMsgs[newMsgs.length - 1];
                lastMsg.content = `### ⚠️ Connection Interrupted\n\n${e.message.includes("503") ? "The AI Audit Cluster is currently experiencing high traffic. Please try again in 30 seconds." : e.message}`;
                return newMsgs;
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-950/20 backdrop-blur-2xl lg:border lg:border-white/10 lg:rounded-[2.5rem] overflow-hidden lg:shadow-3xl lg:m-4 relative group">
            {/* Visual Identity */}
            <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-1000" />

            {/* Messages Area */}
            <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 lg:p-8 space-y-10 scroll-smooth custom-scrollbar">
                {messages.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center text-center px-6">
                        <motion.div
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="w-24 h-24 bg-gradient-to-tr from-blue-600/20 to-purple-600/20 rounded-[2rem] flex items-center justify-center mb-8 shadow-2xl border border-white/5 relative"
                        >
                            <div className="absolute inset-0 bg-blue-500/10 blur-2xl rounded-full" />
                            <Bot className="w-12 h-12 text-blue-400 relative z-10" />
                        </motion.div>
                        <h3 className="text-2xl font-bold text-white mb-3 tracking-tight">System Ready for Audit</h3>
                        <p className="text-gray-400 text-sm max-w-sm leading-relaxed">
                            Upload your **Source of Truth** and **Evidence** files to start the automated compliance check.
                        </p>
                    </div>
                )}

                <AnimatePresence>
                    {messages.map((msg, idx) => (
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            key={idx}
                            className={`flex gap-4 lg:gap-6 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                        >
                            {/* Avatar */}
                            <div className={`w-9 h-9 lg:w-11 lg:h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-lg border ${msg.role === "assistant"
                                ? "bg-gradient-to-br from-indigo-600 to-blue-600 border-indigo-400/30"
                                : "bg-gray-800 border-white/10"
                                }`}>
                                {msg.role === "assistant" ? <Bot className="w-5 h-5 lg:w-6 lg:h-6 text-white" /> : <User className="w-5 h-5 text-gray-400" />}
                            </div>

                            <div className={`max-w-[90%] lg:max-w-[85%] space-y-4`}>
                                {/* AI Thought Process (Professional Visualization) */}
                                {msg.role === "assistant" && msg.steps && msg.steps.length > 0 && (
                                    <motion.div
                                        className="bg-white/[0.03] border border-white/5 rounded-3xl overflow-hidden mb-2"
                                    >
                                        <button
                                            onClick={() => setIsThoughtExpanded(!isThoughtExpanded)}
                                            className="w-full flex items-center justify-between px-5 py-3 text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] hover:bg-white/5 transition-colors"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                                                Audit Log Pipeline
                                            </div>
                                            {isThoughtExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                        </button>

                                        <AnimatePresence>
                                            {isThoughtExpanded && (
                                                <motion.div
                                                    initial={{ height: 0 }}
                                                    animate={{ height: "auto" }}
                                                    exit={{ height: 0 }}
                                                    className="px-5 pb-5 space-y-4"
                                                >
                                                    {msg.steps.map((step, sIdx) => (
                                                        <div key={sIdx} className="flex items-start gap-3">
                                                            <div className="mt-0.5">
                                                                {step.status === "completed" ? (
                                                                    <div className="bg-emerald-500/20 p-0.5 rounded-full"><CheckCircle2 className="w-3 h-3 text-emerald-400" /></div>
                                                                ) : (
                                                                    <div className="bg-blue-500/20 p-0.5 rounded-full"><Loader2 className="w-3 h-3 text-blue-400 animate-spin" /></div>
                                                                )}
                                                            </div>
                                                            <div className="flex flex-col gap-0.5">
                                                                <span className={`text-[11px] font-bold tracking-wide ${step.status === "completed" ? "text-emerald-400" : "text-blue-400"}`}>
                                                                    {step.name}
                                                                </span>
                                                                <span className="text-[9px] text-white/30 uppercase tracking-widest font-medium">
                                                                    {step.status === "completed" ? "Execution successful" : "Neural processing active..."}
                                                                </span>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </motion.div>
                                )}

                                {/* Message Bubble/Report */}
                                <div className={`relative ${msg.role === "user" ? "text-right" : "text-left"}`}>
                                    {msg.role === "assistant" && msg.content && (msg.content.includes("# ") || msg.content.includes("**Outcome**")) ? (
                                        <ProfessionalReport report={msg.content} />
                                    ) : (
                                        <div className={`p-4 lg:p-6 rounded-[2rem] backdrop-blur-md shadow-2xl inline-block text-left ${msg.role === "user"
                                            ? "bg-gradient-to-br from-blue-600 to-indigo-700 text-white rounded-tr-none border border-blue-400/30"
                                            : "bg-white/[0.04] text-gray-100 rounded-tl-none border border-white/10"
                                            }`}>
                                            <div className="prose prose-invert prose-p:leading-relaxed prose-strong:text-white max-w-none text-sm lg:text-[15px]">
                                                <ReactMarkdown>{msg.content || (isLoading && !msg.steps ? "..." : "")}</ReactMarkdown>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Input Area */}
            <div className="p-4 lg:p-8 bg-black/10 backdrop-blur-3xl border-t border-white/5 relative z-20">
                <div className="w-full max-w-4xl mx-auto">
                    <div className="relative group">
                        {/* Glow effect on focus */}
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/30 to-purple-600/30 rounded-[2.5rem] opacity-0 group-focus-within:opacity-100 blur-xl transition duration-1000" />

                        <div className="relative flex items-center bg-gray-900/40 rounded-[2rem] border border-white/10 group-focus-within:bg-gray-900/80 group-focus-within:border-white/20 transition-all duration-300 backdrop-blur-xl pr-2">
                            <input
                                type="text"
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                onKeyDown={(e) => e.key === "Enter" && sendMessage()}
                                placeholder={referenceFiles.length === 0 ? "Upload guidelines to begin..." : "What would you like the Senior Auditor to check?"}
                                disabled={isLoading}
                                className="w-full bg-transparent text-white py-4 lg:py-5 px-6 lg:px-7 outline-none placeholder:text-gray-600 font-medium text-sm lg:text-base"
                            />
                            <button
                                onClick={sendMessage}
                                disabled={!input.trim() || isLoading}
                                className="p-3 lg:p-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-2xl hover:shadow-[0_0_20px_rgba(37,99,235,0.4)] disabled:opacity-20 disabled:grayscale transition-all hover:scale-105 active:scale-95"
                            >
                                <Send className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <p className="text-center text-[9px] text-gray-600 mt-4 font-bold tracking-[0.3em] uppercase opacity-50">
                        Neuro-Audit Synthetic Intelligence • v5.24.1 (Stable)
                    </p>
                </div>
            </div>
        </div>
    );
}

