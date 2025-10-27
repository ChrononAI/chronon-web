import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { GeneratedReport } from '@/services/reportService';
import { Button } from '../ui/button';
import { Download } from 'lucide-react';

interface AllReportTableProps {
    reports: GeneratedReport[];
    handleDownloadGeneratedReport: (id: number) => void;
}

const parseCriteria = (criteria: string) => {
    try {
        const parsed = JSON.parse(criteria);
        return {
            start_date: parsed.start_date || 'N/A',
            end_date: parsed.end_date || 'N/A',
        };
    } catch {
        return {
            start_date: 'N/A',
            end_date: 'N/A',
        };
    }
};

const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export function AllReportsTable({ reports, handleDownloadGeneratedReport }: AllReportTableProps) {
    return (
        <div className="border rounded-lg bg-white">
            <Table>
                <TableHeader>
                    <TableRow className="bg-gray-100">
                        <TableHead>TITLE</TableHead>
                        <TableHead>DATE RANGE</TableHead>
                        <TableHead>RECORDS</TableHead>
                        <TableHead>SIZE</TableHead>
                        <TableHead>STATUS</TableHead>
                        <TableHead>CREATED ON</TableHead>
                        <TableHead>ACTION</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {reports.map((report) => {
                        const criteria = parseCriteria(report.criteria);
                        return (
                            <TableRow
                                key={report.id}
                                className="group cursor-pointer hover:bg-muted/50"
                            >
                                <TableCell className="font-medium whitespace-nowrap">
                                    {report.report_name}
                                </TableCell>
                                <TableCell>{criteria.start_date} to {criteria.end_date}</TableCell>
                                <TableCell className="font-medium whitespace-nowrap">
                                    {report.number_of_records}
                                </TableCell>
                                <TableCell className="whitespace-nowrap">{formatFileSize(report.report_size)}</TableCell>
                                <TableCell className="whitespace-nowrap"><span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${report.status === 'GENERATED'
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                    {report.status}
                                </span></TableCell>
                                <TableCell className="whitespace-nowrap">
                                    {report.created_at ? new Date(report.created_at).toLocaleDateString() : 'N/A'}
                                </TableCell>
                                <TableCell className='text-center'>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDownloadGeneratedReport(report.id)}
                                        title="Download report"
                                    >
                                        <Download className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        )
                    })}
                </TableBody>
            </Table>
        </div>
    );
}