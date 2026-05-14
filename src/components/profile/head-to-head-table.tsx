import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table'
import { getUserById } from '@/lib/dummy/users'
import type { HeadToHead } from '@/lib/stats'

type HeadToHeadTableProps = {
    records: HeadToHead[]
}

export function HeadToHeadTable({ records }: HeadToHeadTableProps) {
    if (records.length === 0) {
        return (
            <p className="text-sm text-muted-foreground text-center py-6 border rounded-lg">
                상대 전적이 없습니다.
            </p>
        )
    }

    return (
        <div className="border rounded-lg overflow-hidden">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>상대</TableHead>
                        <TableHead className="text-center">승</TableHead>
                        <TableHead className="text-center">패</TableHead>
                        <TableHead className="text-center">승률</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {records.map((r) => {
                        const opponent = getUserById(r.opponentId)
                        const total = r.wins + r.losses
                        const rate = total === 0 ? 0 : Math.round((r.wins / total) * 100)
                        return (
                            <TableRow key={r.opponentId}>
                                <TableCell className="font-medium">
                                    {opponent?.nickname ?? r.opponentId}
                                </TableCell>
                                <TableCell className="text-center text-emerald-600 font-medium">
                                    {r.wins}
                                </TableCell>
                                <TableCell className="text-center text-muted-foreground">
                                    {r.losses}
                                </TableCell>
                                <TableCell className="text-center text-sm">
                                    {rate}%
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    )
}
