import { useState } from "react";
import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogTitle } from "../ui/dialog";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { cardsUpiService } from "@/services/cardsUpiService";
import { toast } from "sonner";

function AddFundsDialog({
  open,
  onOpenChange,
  userId,
  onSuccess
}: {
  open: boolean;
  onOpenChange: (val: boolean) => void;
  userId: number;
  onSuccess: () => void;
}) {
  const [amount, setAmount] = useState<number>();
  const [loading, setLoading] = useState(false);

  const reloadAccount = async (payload: {
    user_id: number;
    amount: number;
  }) => {
    try {
      setLoading(true);
      await cardsUpiService.reloadAccount(payload);
      toast.success("Successfully reloaded account");
      onSuccess();
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
        onOpenChange(false);
        setAmount(undefined);
        setLoading(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) {
          setAmount(undefined);
        }
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-xl overflow-auto w-full flex flex-col [&>button[aria-label='Close']]:hidden">
        <DialogTitle className="hidden" />
        <div className="space-y-4 flex flex-col flex-1">
          <h1 className="text-xl font-semibold">Reload Account</h1>
          <div className="space-y-6 flex-1">
            <div className="flex items-center gap-4 mb-12">
              <Label>Amount</Label>
              <Input
                type="number"
                value={amount}
                className="h-[31px]"
                onChange={(e) => setAmount(+e.target.value || undefined)}
              />
            </div>
          </div>
        </div>
        <div className="flex justify-end gap-4">
          <Button
            variant="outline"
            className="h-[31px]"
            onClick={() => {
              setAmount(undefined);
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={() => {
                if (amount) {
                    const payload = { user_id: userId, amount };
                    reloadAccount(payload);
                }
            }}
            style={{
              width: "163px",
              height: "31px",
              gap: "8px",
              borderRadius: "4px",
              paddingTop: "8px",
              paddingRight: "12px",
              paddingBottom: "8px",
              paddingLeft: "12px",
              backgroundColor: "#0D9C99",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              border: "none",
              cursor: "pointer",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = "#0b8a87";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = "#0D9C99";
            }}
            disabled={loading}
          >
            {loading ? "Adding..." : "Add Funds"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default AddFundsDialog;
