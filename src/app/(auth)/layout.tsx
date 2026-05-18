export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <div className="h-screen overflow-hidden bg-black text-white">
            {children}
        </div>
    )
}
