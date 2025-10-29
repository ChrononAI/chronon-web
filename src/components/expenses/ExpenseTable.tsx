import { useNavigate } from 'react-router-dom';
import { AlertTriangle } from 'lucide-react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
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
                className={`group cursor-pointer hover:bg-muted/50 ${
                  expense.original_expense_id ? 'bg-yellow-50' : ''
                }`}
                onClick={() => navigate(`/expenses/${expense.id}`)}
              >
                <TableCell className="font-medium whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {expense.original_expense_id && (
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="relative cursor-help">
                              <AlertTriangle className="h-4 w-4 text-yellow-400" fill="currentColor" stroke="none" />
                              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 text-yellow-800 text-[8px] font-bold">!</span>
                            </div>
                          </TooltipTrigger>
                          <TooltipContent className="bg-yellow-100 border-yellow-300 text-yellow-800">
                            <p>Duplicate expense</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    )}
                    <span>{expense.sequence_number}</span>
                  </div>
                </TableCell>
                <TableCell className="whitespace-nowrap">{getExpenseType(expense.expense_type)}</TableCell>
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