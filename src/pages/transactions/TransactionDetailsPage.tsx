import { FormFooter } from "@/components/layout/FormFooter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";
import {
  Transaction,
  transactionService,
} from "@/services/transactionsService";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";

function Info({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="font-medium">
        {value || <span className="text-muted-foreground">—</span>}
      </p>
    </div>
  );
}

const Divider = () => <div className="border-t border-muted" />;

function TransactionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();

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
    <>
      <div className="w-full mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Transaction Details</h1>
          <Badge variant="outline" className="text-sm">
            {transaction?.transaction_status}
          </Badge>
        </div>

        {/* Main Card */}
        <div className="bg-white space-y-6">
          {/* ID */}
          <p className="text-xs text-muted-foreground">
            Transaction ID: {transaction?.id}
          </p>

          {/* Amount + Merchant */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
            <div>
              <p className="text-sm text-muted-foreground">Amount</p>
              <p className="text-3xl font-semibold tracking-tight">
                {formatCurrency(
                  transaction?.amount ? Number(transaction.amount) : 0
                )}
              </p>
            </div>

            <div>
              <p className="text-sm text-muted-foreground">Merchant</p>
              <p className="text-lg font-medium">
                {transaction?.merchant_name || "-"}
              </p>
            </div>
          </div>

          <Divider />

          {/* Core Info */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
            <Info label="Type" value={transaction?.transaction_type} />
            <Info
              label="Entry Type"
              value={transaction?.transaction_entry_type}
            />

            <Info
              label="Transaction Date"
              value={transaction?.transaction_date}
            />
            <Info label="Created At" value={transaction?.created_at} />
          </div>
        </div>

        {/* Audit Card */}
        <div className="rounded-lg border bg-muted/30 p-6 space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Audit Information
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Info label="Created By" value={transaction?.created_by?.email} />
            <Info label="Updated By" value={transaction?.updated_by?.email} />
          </div>
        </div>
      </div>
      <FormFooter>
        <Button variant="outline" onClick={() => navigate(-1)}>
            Back
        </Button>
      </FormFooter>
    </>
  );
}

export default TransactionDetailPage;
