import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Universal Audit",
    description: "Secure access to Universal Audit",
};

export default function LoginLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return <>{children}</>;
}
