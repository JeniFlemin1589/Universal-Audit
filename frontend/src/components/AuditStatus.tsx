"use client";

import React from "react";
import { CheckCircle2, Circle, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface Step {
    id: string;
    name: string;
    status: "pending" | "running" | "completed";
}

interface AuditStatusProps {
    steps: Step[];
}

export default function AuditStatus({ steps }: AuditStatusProps) {
    return (
        <div className="w-full bg-gray-900/50 rounded-xl p-6 border border-gray-800">
            <h3 className="text-lg font-semibold text-white mb-4">Audit Progress</h3>
            <div className="space-y-4">
                {steps.map((step, index) => (
                    <div key={step.id} className="flex items-center gap-4">
                        <div className="relative flex items-center justify-center">
                            {step.status === "completed" ? (
                                <CheckCircle2 className="w-6 h-6 text-green-500" />
                            ) : step.status === "running" ? (
                                <Loader2 className="w-6 h-6 text-blue-500 animate-spin" />
                            ) : (
                                <Circle className="w-6 h-6 text-gray-600" />
                            )}
                            {index < steps.length - 1 && (
                                <div className={`absolute top-6 left-3 w-0.5 h-6 ${steps[index + 1].status !== "pending" ? "bg-blue-500/50" : "bg-gray-800"
                                    }`} />
                            )}
                        </div>
                        <div className={`${step.status === "running" ? "text-blue-400" :
                                step.status === "completed" ? "text-green-400" : "text-gray-500"
                            }`}>
                            <p className="text-sm font-medium">{step.name}</p>
                            {step.status === "running" && (
                                <p className="text-xs animate-pulse">Processing...</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
