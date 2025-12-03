import { useState } from 'react';
import { 
  CreditCard, 
  IndianRupee, 
  TrendingUp, 
  Calendar,
  Download,
  Filter,
  Search,
  Eye,
  MoreHorizontal,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { formatCurrency } from '@/lib/utils';

interface Payment {
  id: string;
  paymentId: string;
  vendor: string;
  amount: number;
  currency: string;
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  method: string;
  date: string;
  description: string;
  reference: string;
}

const mockPayments: Payment[] = [
  {
    id: '1',
    paymentId: 'PAY-001',
    vendor: 'Office Supplies Co.',
    amount: 15000,
    currency: 'INR',
    status: 'COMPLETED',
    method: 'Bank Transfer',
    date: '2024-01-15',
    description: 'Office supplies and stationery',
    reference: 'REF-2024-001'
  },
  {
    id: '2',
    paymentId: 'PAY-002',
    vendor: 'Tech Solutions Ltd.',
    amount: 250000,
    currency: 'INR',
    status: 'PROCESSING',
    method: 'Wire Transfer',
    date: '2024-01-14',
    description: 'Software licensing and support',
    reference: 'REF-2024-002'
  },
  {
    id: '3',
    paymentId: 'PAY-003',
    vendor: 'Travel Agency',
    amount: 45000,
    currency: 'INR',
    status: 'PENDING',
    method: 'Credit Card',
    date: '2024-01-13',
    description: 'Business travel expenses',
    reference: 'REF-2024-003'
  },
  {
    id: '4',
    paymentId: 'PAY-004',
    vendor: 'Catering Services',
    amount: 8500,
    currency: 'INR',
    status: 'COMPLETED',
    method: 'Bank Transfer',
    date: '2024-01-12',
    description: 'Team lunch and meeting catering',
    reference: 'REF-2024-004'
  },
  {
    id: '5',
    paymentId: 'PAY-005',
    vendor: 'Marketing Agency',
    amount: 125000,
    currency: 'INR',
    status: 'FAILED',
    method: 'Wire Transfer',
    date: '2024-01-11',
    description: 'Digital marketing campaign',
    reference: 'REF-2024-005'
  }
];

export function PaymentPage() {
  const [payments] = useState<Payment[]>(mockPayments);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'PROCESSING':
        return <Clock className="h-4 w-4 text-green-600" />;
      case 'PENDING':
        return <Clock className="h-4 w-4 text-yellow-600" />;
      case 'FAILED':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800  ';
      case 'PROCESSING':
        return 'bg-green-100 text-green-800  ';
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800  ';
      case 'FAILED':
        return 'bg-red-100 text-red-800  ';
      default:
        return 'bg-gray-100 text-gray-800  ';
    }
  };

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = payment.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.paymentId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         payment.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || payment.status.toLowerCase() === statusFilter.toLowerCase();
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const totalPayments = payments.length;
  const completedPayments = payments.filter(p => p.status === 'COMPLETED').length;
  const pendingPayments = payments.filter(p => p.status === 'PENDING' || p.status === 'PROCESSING').length;
  const totalAmount = payments.reduce((sum, payment) => sum + payment.amount, 0);

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-lg p-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <CreditCard className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold">Payment Management</h1>
              <p className="text-muted-foreground">Track and manage all payment transactions</p>
            </div>
          </div>
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-green-50 to-green-100   border-green-200 ">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 ">Total Payments</p>
                  <p className="text-3xl font-bold text-green-900 ">{totalPayments}</p>
                </div>
                <div className="p-3 bg-green-100  rounded-full">
                  <CreditCard className="h-6 w-6 text-green-600 " />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100   border-green-200 ">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-700 ">Completed</p>
                  <p className="text-3xl font-bold text-green-900 ">{completedPayments}</p>
                </div>
                <div className="p-3 bg-green-100  rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600 " />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100   border-yellow-200 ">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-yellow-700 ">Pending</p>
                  <p className="text-3xl font-bold text-yellow-900 ">{pendingPayments}</p>
                </div>
                <div className="p-3 bg-yellow-100  rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600 " />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-purple-100   border-purple-200 ">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-700 ">Total Value</p>
                  <p className="text-2xl font-bold text-purple-900 ">
                    {formatCurrency(totalAmount)}
                  </p>
                </div>
                <div className="p-3 bg-purple-100  rounded-full">
                  <IndianRupee className="h-6 w-6 text-purple-600 " />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Payments Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Payment Transactions</CardTitle>
              </div>
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search payments..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-64"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="processing">Processing</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {filteredPayments.length === 0 ? (
              <div className="text-center py-12">
                <CreditCard className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">No Payments Found</h3>
                <p className="text-muted-foreground">
                  {searchTerm || statusFilter !== 'all' 
                    ? 'No payments match your current filters.' 
                    : 'There are currently no payment transactions.'}
                </p>
              </div>
            ) : (
              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow style={{ backgroundColor: '#EAF0EE' }}>
                      <TableHead className="font-semibold">Payment ID</TableHead>
                      <TableHead className="font-semibold">Vendor</TableHead>
                      <TableHead className="font-semibold">Amount</TableHead>
                      <TableHead className="font-semibold">Method</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold">Date</TableHead>
                      <TableHead className="font-semibold">Reference</TableHead>
                      <TableHead className="text-right font-semibold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPayments.map((payment) => (
                      <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell className="font-medium">
                          {payment.paymentId}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium">{payment.vendor}</p>
                            <p className="text-sm text-muted-foreground truncate max-w-xs">
                              {payment.description}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4 text-muted-foreground" />
                            {payment.method}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(payment.status)}
                            <Badge className={getStatusColor(payment.status)}>
                              {payment.status}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            {new Date(payment.date).toLocaleDateString()}
                          </div>
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {payment.reference}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem>View Details</DropdownMenuItem>
                                <DropdownMenuItem>Download Receipt</DropdownMenuItem>
                                <DropdownMenuItem>Resend Payment</DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}