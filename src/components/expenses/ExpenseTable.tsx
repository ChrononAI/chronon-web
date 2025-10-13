import { useNavigate } from 'react-router-dom';
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
              <TableHead>Expense ID</TableHead>
              {/* <TableHead>Invoice Number</TableHead> */}
              <TableHead>Policy</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Vendor</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className='text-right'>Amount</TableHead>
              <TableHead>Currency</TableHead>
              <TableHead>Status</TableHead>
              {/* <TableHead>Report</TableHead>
              <TableHead className="text-right">Actions</TableHead> */}
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
                  {expense.id}
                </TableCell>
                <TableCell className="font-medium">
                  {expense.expense_policy_id}
                </TableCell>
                <TableCell>{expense.category}</TableCell>
                <TableCell>{expense.vendor || (expense.expense_type === "RECEIPT_BASED" ? <span className='text-gray-600 italic'>Unknown Vendor</span> : 'NA')}</TableCell>
                 <TableCell>
                  {formatDate(expense.expense_date)}
                </TableCell>
                <TableCell className='text-right'>
                  {formatCurrency(expense.amount, 'INR')}
                </TableCell>
               <TableCell>
                  INR
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(expense.status)}>
                    {expense.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
    </div>
  );
}