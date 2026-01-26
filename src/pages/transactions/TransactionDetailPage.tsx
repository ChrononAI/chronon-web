import { Badge } from "@/components/ui/badge";
import { formatCurrency, getStatusColor } from "@/lib/utils";
import { Transaction, transactionService } from "@/services/transactionService";
import { format } from "date-fns";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

function Info({ label, value }: { label: string; value?: string | number | Date | null }) {
  if (!value) return null;
  return (
    <div className="flex itemx-center justify-between">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="font-medium break-all">{value.toString()}</p>
    </div>
  );
}

function TransactionDetailPage() {
  const { id } = useParams();

  const [transaction, setTransaction] = useState<Transaction | null>(null);

  const getTransactionDetails = async (id: string) => {
    try {
      const res = await transactionService.getTransactionById(id);
      setTransaction(res.data.data);
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error.message);
    }
  };

  useEffect(() => {
    if (id) {
      getTransactionDetails(id);
    }
  }, []);

  console.log(transaction);

  return (
    <>
      <div>
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Transaction Details</h1>
        </div>
        <div className="flex flex-col items-center gap-6">
          <div className="rounded-md text-center bg-gray-50 w-1/3 space-y-2 p-8">
            <p className="text-sm text-center text-muted-foreground">Amount</p>
            {transaction?.amount && <p className="text-5xl text-center font-semibold">
              {formatCurrency(+transaction.amount)}
            </p>}
            {transaction?.transaction_status && <Badge className={`${getStatusColor(transaction?.transaction_status)}`}>
              {transaction?.transaction_status}
            </Badge>}
          </div>
          <div className="w-1/3 space-y-6">
            <Info label="Transaction ID" value={transaction?.id} />
            <Info label="Merchant" value={transaction?.merchant_name} />
            <Info label="Type" value={transaction?.transaction_type} />
            <Info label="Entry" value={transaction?.transaction_entry_type} />
            {transaction?.transaction_date && <Info label="Date" value={format(new Date(transaction?.transaction_date), "yyyy-MM-dd")} />}
          </div>
        </div>
      </div>
    </>
  );
}

export default TransactionDetailPage;
