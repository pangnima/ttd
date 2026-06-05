export default function ClubDashboardLoading() {
    return (
        <div className="space-y-6 animate-pulse">
            <div className="space-y-1">
                <div className="h-6 w-40 bg-foreground/10 rounded" />
                <div className="h-4 w-24 bg-foreground/8 rounded" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="h-40 bg-foreground/6 rounded-xl" />
                <div className="h-40 bg-foreground/6 rounded-xl" />
            </div>
            <div className="h-64 bg-foreground/6 rounded-xl" />
        </div>
    )
}
