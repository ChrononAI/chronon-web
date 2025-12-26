import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils";
import { Transaction, transactionService } from "@/services/transactionService";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "sonner";

function Info({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium break-all">{value}</p>
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

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Transaction Details</h1>
      </div>
      <div>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm text-muted-foreground">
                ID: {transaction?.id}
              </p>
            </div>
            <Badge variant="outline">{transaction?.transaction_status}</Badge>
          </div>

          {/* Amount & Merchant */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-2xl font-semibold">
                {formatCurrency(transaction?.amount ? +transaction?.amount : 0)}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Merchant</p>
              <p className="font-medium">{transaction?.merchant_name}</p>
            </div>
          </div>

          {/* Core Info */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <Info label="Type" value={transaction?.transaction_type} />
            <Info label="Entry" value={transaction?.transaction_entry_type} />
            <Info label="Source" value={transaction?.transaction_source} />
          </div>

          {/* Dates */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Info
              label="Transaction Date"
              value={transaction?.transaction_date}
            />
            <Info label="Created At" value={transaction?.created_at} />
          </div>

          {/* Audit */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-muted-foreground">
              Audit Information
            </h3>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <Info label="Created By" value={transaction?.created_by.email} />
              <Info label="Updated By" value={transaction?.updated_by.email} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default TransactionDetailPage;
