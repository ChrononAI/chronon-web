import { Link, useNavigate } from "react-router-dom";
import { Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Report } from "@/types/expense";
import { formatDate, getStatusColor } from "@/lib/utils";

interface ReportTableProps {
  reports: Report[];
}

export function ReportTable({ reports }: ReportTableProps) {
  const navigate = useNavigate();

  const handleReportClick = (report: Report) => {
    if (report.status === 'DRAFT') {
      // For draft reports, navigate to create page in edit mode
      navigate('/reports/create', {
        state: {
          editMode: true,
          reportData: {
            id: report.id,
            title: report.title,
            description: report.description,
            custom_attributes: report.custom_attributes,
            expenses: report.expenses || []
          }
        }
      });
    } else {
      // For other reports, navigate to report detail page
      navigate(`/reports/${report.id}`);
    }
  };

  return (
    <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead>Title</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Total Amount</TableHead>
              <TableHead>Created By</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reports.map((report) => (
              <TableRow 
                key={report.id} 
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => handleReportClick(report)}
              >
                <TableCell className="font-medium">
                  <span className="hover:underline">
                    {report.title}
                  </span>
                </TableCell>
                <TableCell>{report.description}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(report.status)}>
                    {report.status}
                  </Badge>
                </TableCell>
                <TableCell>₹{Number(report.total_amount).toFixed(2)}</TableCell>
                <TableCell>{report.created_by.email}</TableCell>
                <TableCell>{formatDate(report.created_at)}</TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (report.status === 'DRAFT') {
                        handleReportClick(report);
                      } else {
                        navigate(`/reports/${report.id}`);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}
