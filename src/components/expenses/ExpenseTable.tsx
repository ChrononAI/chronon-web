import { useNavigate } from 'react-router-dom';
import { Eye } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Expense } from '@/types/expense';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';

interface ExpenseTableProps {
  expenses: Expense[];
}

export function ExpenseTable({ expenses }: ExpenseTableProps) {
  const navigate = useNavigate();
  
  return (
    <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-100">
              <TableHead>Invoice Number</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Report</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((expense) => (
              <TableRow 
                key={expense.id}
                className="group cursor-pointer hover:bg-muted/50"
                onClick={() => navigate(`/expenses/${expense.id}`)}
              >
                <TableCell className="font-medium">
                  {expense.invoice_number || '-'}
                </TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>
                  {formatCurrency(expense.amount, 'INR')}
                </TableCell>
                <TableCell>
                  {formatDate(expense.expense_date)}
                </TableCell>
                <TableCell>{expense.vendor}</TableCell>
                <TableCell>
                  <Badge className={getStatusColor(expense.status)}>
                    {expense.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>
                  {expense.report_id && (
                    <span 
                      className="text-blue-600 hover:underline"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/reports/${expense.report_id}`);
                      }}
                    >
                      {expense.report_id}
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/expenses/${expense.id}`);
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