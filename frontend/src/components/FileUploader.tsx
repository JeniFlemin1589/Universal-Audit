"use client";

import React, { useRef, useState } from "react";
import { Upload, FileText, X, CheckCircle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface UploadedFile {
    name: string;
    uri: string;
}

interface FileUploaderProps {
    label: string;
    files: UploadedFile[];
    onUpload: (file: File) => Promise<void>;
    onRemove: (fileName: string) => void;
    acceptedFileTypes?: string;
}

export default function FileUploader({ label, files, onUpload, onRemove, acceptedFileTypes = ".pdf" }: FileUploaderProps) {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = () => {
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            setIsUploading(true);
            try {
                const uploadPromises = Array.from(e.dataTransfer.files).map(file => onUpload(file));
                await Promise.all(uploadPromises);
            } catch (error) {
                console.error("Batch upload failed", error);
            } finally {
                setIsUploading(false);
            }
        }
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setIsUploading(true);
            try {
                const uploadPromises = Array.from(e.target.files).map(file => onUpload(file));
                await Promise.all(uploadPromises);
            } catch (error) {
                console.error("Batch upload failed", error);
            } finally {
                setIsUploading(false);
                // Reset input so same files can be selected again if needed
                if (fileInputRef.current) fileInputRef.current.value = "";
            }
        }
    };

    // Removed single processFile to avoid state conflicts

    return (
        <div className="w-full space-y-3">
            <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-300">{label}</label>
                <span className="text-xs text-gray-500">{files.length} files</span>
            </div>

            {/* Upload Zone */}
            <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center w-full h-24 rounded-xl border-2 border-dashed transition-all cursor-pointer overflow-hidden
          ${isDragging ? "border-blue-500 bg-blue-500/10" : "border-gray-700 bg-gray-900/50 hover:bg-gray-800"}
        `}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept={acceptedFileTypes}
                    multiple
                    onChange={handleFileSelect}
                />

                {isUploading ? (
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-400" />
                ) : (
                    <div className="flex flex-col items-center text-gray-400">
                        <Upload className="w-6 h-6 mb-1" />
                        <span className="text-xs">Click or Drag PDF</span>
                    </div>
                )}
            </div>

            {/* File List */}
            <div className="space-y-2">
                <AnimatePresence>
                    {files.map((file) => (
                        <motion.div
                            key={file.name}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            className="flex items-center justify-between p-2 rounded-lg bg-gray-800 border border-gray-700"
                        >
                            <div className="flex items-center gap-2 overflow-hidden">
                                <FileText className="w-4 h-4 text-blue-400 shrink-0" />
                                <span className="text-xs text-gray-300 truncate max-w-[150px]">{file.name}</span>
                            </div>
                            <button
                                onClick={() => onRemove(file.name)}
                                className="text-gray-500 hover:text-red-400 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
