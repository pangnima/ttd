export default function MainLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="h-8 w-48 rounded-md bg-muted" />
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 rounded-xl bg-muted" />
                ))}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-40 rounded-xl bg-muted" />
                <div className="h-40 rounded-xl bg-muted" />
            </div>
            <div className="h-64 rounded-xl bg-muted" />
        </div>
    )
}
