import React, { useRef } from "react";
import { CheckCircle2, AlertTriangle, Info, FileText, Download, ShieldCheck, ExternalLink, Loader2 } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

interface ProfessionalReportProps {
    report: string;
}

export default function ProfessionalReport({ report }: ProfessionalReportProps) {
    const reportRef = useRef<HTMLDivElement>(null);
    const [isExporting, setIsExporting] = React.useState(false);

    if (!report) return null;

    // Simple parser to extract potential risk level if present in markdown
    const isHighRisk = report.toLowerCase().includes("high risk") || report.toLowerCase().includes("risk detected");
    const isMediumRisk = report.toLowerCase().includes("medium risk");

    const riskColor = isHighRisk ? "text-red-400" : isMediumRisk ? "text-amber-400" : "text-emerald-400";
    const riskBg = isHighRisk ? "bg-red-500/10" : isMediumRisk ? "bg-amber-500/10" : "bg-emerald-500/10";
    const riskBorder = isHighRisk ? "border-red-500/20" : isMediumRisk ? "border-amber-500/20" : "border-emerald-500/20";

    const handleExportPDF = async () => {
        if (!reportRef.current || isExporting) return;

        try {
            setIsExporting(true);
            console.log("Starting PDF export...");

            const element = reportRef.current;

            // Capture the entire report as a high-quality image
            const canvas = await html2canvas(element, {
                scale: 2, // Higher scale for Retina/High-DPI look
                backgroundColor: "#0a0a0a", // Dark background matching the theme
                useCORS: true,
                logging: true, // Enable logging for debugging
                allowTaint: true,
                scrollX: 0,
                scrollY: 0,
                windowWidth: element.scrollWidth,
                windowHeight: element.scrollHeight
            });

            console.log("Canvas captured:", canvas.width, "x", canvas.height);

            const imgData = canvas.toDataURL("image/png");

            // Use A4 dimensions for professional look
            const pdf = new jsPDF({
                orientation: "portrait",
                unit: "mm",
                format: "a4"
            });

            const pageWidth = pdf.internal.pageSize.getWidth();
            const pageHeight = pdf.internal.pageSize.getHeight();

            // Calculate the image dimensions to fit the page width
            const imgWidth = pageWidth - 20; // 10mm margin on each side
            const imgHeight = (canvas.height * imgWidth) / canvas.width;

            // Handle multi-page documents
            let heightLeft = imgHeight;
            let position = 10; // Top margin

            // Add first page
            pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
            heightLeft -= (pageHeight - 20); // Account for margins

            // Add subsequent pages if needed
            while (heightLeft > 0) {
                position = heightLeft - imgHeight + 10;
                pdf.addPage();
                pdf.addImage(imgData, "PNG", 10, position, imgWidth, imgHeight);
                heightLeft -= (pageHeight - 20);
            }

            const filename = `Audit_Report_${new Date().toISOString().split('T')[0]}_${Date.now()}.pdf`;
            pdf.save(filename);
            console.log("PDF saved:", filename);

        } catch (error) {
            console.error("PDF Export failed:", error);
            alert("Failed to generate PDF. Please check the console for details.");
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-4xl mx-auto space-y-6"
        >
            <div ref={reportRef} className="space-y-6 p-1"> {/* Wrapper for export */}
                {/* Report Hero/Certificate */}
                <div className={`relative overflow-hidden rounded-3xl border ${riskBorder} ${riskBg} p-8 shadow-2xl backdrop-blur-md`}>
                    <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                        <ShieldCheck className="w-32 h-32" />
                    </div>

                    <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                        <div>
                            <div className="flex items-center gap-2 mb-2">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest ${isHighRisk ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white'}`}>
                                    {isHighRisk ? 'Action Required' : 'Certified Audit'}
                                </span>
                                <span className="text-white/40 text-[10px] font-medium tracking-wider uppercase">ID: AUD-{Math.floor(Math.random() * 10000)}</span>
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-2">Audit Certificate</h1>
                            <p className="text-white/60 text-sm max-w-lg leading-relaxed">
                                This document authenticates that the provided Target Evidence has been cross-referenced against the Source of Truth policies using Neural Audit V5.
                            </p>
                        </div>

                        <div className="flex flex-col items-center justify-center p-6 bg-black/30 rounded-2xl border border-white/10 shrink-0 w-full md:w-auto">
                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mb-1">Risk Assessment</p>
                            <span className={`text-2xl font-black ${riskColor}`}>
                                {isHighRisk ? 'CRITICAL' : isMediumRisk ? 'MODERATE' : 'OPTIMAL'}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Main Content Sections */}
                <div className="grid grid-cols-1 gap-6">
                    <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-3xl overflow-hidden shadow-lg">
                        <div className="px-6 py-4 bg-white/5 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText className="w-5 h-5 text-blue-400" />
                                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Formal Findings</h2>
                            </div>
                            <button
                                onClick={handleExportPDF}
                                disabled={isExporting}
                                className="text-[10px] text-blue-400 hover:text-blue-300 flex items-center gap-1 transition-colors font-bold uppercase tracking-widest disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                                {isExporting ? 'Exporting...' : 'Export PDF'}
                            </button>
                        </div>

                        <div className="p-8 prose prose-invert max-w-none 
                prose-p:text-gray-300 prose-p:leading-8 prose-p:text-[15px]
                prose-headings:text-white prose-headings:font-bold
                prose-h2:text-xl prose-h2:mt-8 prose-h2:mb-4 prose-h2:border-b prose-h2:border-white/10 prose-h2:pb-2
                prose-h3:text-lg prose-h3:mt-6 prose-h3:text-blue-400
                prose-strong:text-white prose-strong:font-bold
                prose-li:text-gray-300 prose-li:my-1
                prose-code:text-blue-300 prose-code:bg-blue-500/10 prose-code:px-1 prose-code:rounded
                prose-blockquote:border-l-4 prose-blockquote:border-blue-500/40 prose-blockquote:bg-blue-500/5 prose-blockquote:py-1 prose-blockquote:px-4 prose-blockquote:rounded-r-lg
              ">
                            <ReactMarkdown>
                                {report}
                            </ReactMarkdown>
                        </div>
                    </div>

                    {/* Footer info */}
                    <div className="flex justify-between items-center px-6 py-4 bg-white/2 rounded-2xl border border-white/5">
                        <div className="flex items-center gap-2 text-white/40 text-[10px] font-medium tracking-wider">
                            <ShieldCheck className="w-3 h-3" />
                            DETERMINISTIC AI VERIFICATION ACTIVE
                        </div>
                        <div className="text-[10px] text-white/20 italic">
                            Timestamp: {new Date().toLocaleString()}
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}
