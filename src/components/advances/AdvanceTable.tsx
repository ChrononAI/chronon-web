import { Plus } from 'lucide-react';
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
import { Advance } from '@/types/expense';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';

interface AdvanceTableProps {
  advances: Advance[];
  onCreateNew: () => void;
}

export function AdvanceTable({ advances, onCreateNew }: AdvanceTableProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Advances</h2>
        <Button onClick={onCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Advance
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Description</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Updated Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {advances.map((advance) => (
              <TableRow key={advance.id}>
                <TableCell className="font-medium">
                  {advance.description}
                </TableCell>
                <TableCell>
                  {formatCurrency(advance.amount, advance.currency)}
                </TableCell>
                <TableCell>
                  <Badge className={getStatusColor(advance.status)}>
                    {advance.status.replace('_', ' ')}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(advance.createdOn)}</TableCell>
                <TableCell>{formatDate(advance.updatedAt)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}