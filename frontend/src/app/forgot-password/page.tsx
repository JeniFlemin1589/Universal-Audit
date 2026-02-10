"use client";

import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ShieldCheck, ArrowLeft, Mail, Loader2, CheckCircle } from "lucide-react";
import Link from "next/link";

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [message, setMessage] = useState("");
    const [error, setError] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");
        setMessage("");
        setIsSubmitting(true);
        try {
            console.log("Sending password reset email to:", email);
            await resetPassword(email);
            console.log("Password reset email sent successfully!");
            setMessage(`Password reset email sent to ${email}! Check your inbox and spam folder.`);
        } catch (err: any) {
            console.error("Password reset error:", err.code, err.message);
            if (err.code === 'auth/user-not-found') {
                setError("No account found with this email. Please sign up first.");
            } else if (err.code === 'auth/invalid-email') {
                setError("Invalid email address.");
            } else if (err.code === 'auth/too-many-requests') {
                setError("Too many requests. Please wait a few minutes and try again.");
            } else if (err.code === 'auth/network-request-failed') {
                setError("Network error. Please check your internet connection.");
            } else {
                setError(`Error (${err.code}): ${err.message}`);
            }
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex min-h-screen items-center justify-center bg-[#050505] text-white relative overflow-hidden font-sans">
            {/* Ambient Effects */}
            <div className="absolute top-[-20%] right-[-10%] w-[60%] h-[60%] bg-purple-900/20 blur-[150px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-900/20 blur-[150px] rounded-full pointer-events-none" />

            <div className="z-10 w-full max-w-md p-8">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4 }}
                    className="flex flex-col items-center text-center space-y-6"
                >
                    {/* Logo */}
                    <div className="relative group mb-2">
                        <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative w-16 h-16 bg-gray-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-2xl">
                            <ShieldCheck className="w-8 h-8 text-blue-400" />
                        </div>
                    </div>

                    {/* Title */}
                    <div className="space-y-2">
                        <h1 className="text-2xl font-bold tracking-tight text-white">
                            Reset Password
                        </h1>
                        <p className="text-gray-500 text-sm">
                            Enter your email to receive recovery instructions.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="w-full space-y-4 text-left mt-6">

                        {error && (
                            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-red-400 text-xs text-center">
                                {error}
                            </div>
                        )}

                        {message && (
                            <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-lg text-green-400 text-xs text-center flex items-center justify-center gap-2">
                                <CheckCircle className="w-4 h-4" />
                                {message}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3 w-5 h-5 text-gray-500" />
                                <input
                                    type="email"
                                    placeholder="Enter your email"
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-10 py-3 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !!message}
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-purple-900/20 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Send Reset Link"}
                        </button>
                    </form>

                    {/* Back Link */}
                    <Link
                        href="/login"
                        className="flex items-center gap-2 text-sm text-gray-500 hover:text-white transition-colors mt-4"
                    >
                        <ArrowLeft className="w-4 h-4" />
                        Back to Login
                    </Link>

                </motion.div>
            </div>
        </div>
    );
}
