"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import { FileText } from "lucide-react";

interface ReportViewerProps {
    report: string;
}

export default function ReportViewer({ report }: ReportViewerProps) {
    if (!report) return null;

    return (
        <div className="w-full bg-gray-900/50 rounded-xl border border-gray-800 overflow-hidden">
            <div className="bg-gray-800/50 px-6 py-4 border-b border-gray-700 flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-semibold text-white">Audit Report</h2>
            </div>
            <div className="p-8 prose prose-invert max-w-none text-gray-300">
                <ReactMarkdown>{report}</ReactMarkdown>
            </div>
        </div>
    );
}
