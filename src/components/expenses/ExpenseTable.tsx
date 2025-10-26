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

function getExpenseType(type: string) {
  if (type === "RECEIPT_BASED") return "Expense";
  if (type === "MILEAGE_BASED") return "Mileage";
  if (type === "PER_DIEM") return "Per Diem";
  return type;
}

export function ExpenseTable({ expenses }: ExpenseTableProps) {
  const navigate = useNavigate();
  
  return (
    <div className="border rounded-lg bg-white">
        <Table>
          <TableHeader className='text-[#64748B]'>
            <TableRow className="bg-gray-100">
              <TableHead>EXPENSE ID</TableHead>
              <TableHead>TYPE</TableHead>
              <TableHead>POLICY</TableHead>
              <TableHead>CATEGORY</TableHead>
              <TableHead>VENDOR</TableHead>
              <TableHead>DATE</TableHead>
              <TableHead className='text-right'>AMOUNT</TableHead>
              <TableHead>CURRENCY</TableHead>
              <TableHead>STATUS</TableHead>
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
                  {expense.sequence_number}
                </TableCell>
                <TableCell>{getExpenseType(expense.expense_type)}</TableCell>
                <TableCell className="font-medium whitespace-nowrap">
                  {expense.policy?.name || 'No Policy'}
                </TableCell>
                <TableCell className="whitespace-nowrap">{expense.category}</TableCell>
                <TableCell className="whitespace-nowrap">{expense.vendor || (expense.expense_type === "RECEIPT_BASED" ? <span className='text-gray-600 italic'>Unknown Vendor</span> : 'NA')}</TableCell>
                 <TableCell className="whitespace-nowrap">
                  {formatDate(expense.expense_date)}
                </TableCell>
                <TableCell className='text-right'>
                  {formatCurrency(expense.amount, 'INR')}
                </TableCell>
               <TableCell>
                  INR
                </TableCell>
                <TableCell className="whitespace-nowrap">
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