import { Button } from "../ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog";

function FinalisedFileAlert({
  showActionDialog,
  setShowActionDialog,
  handleConfirm
}: {
  showActionDialog: boolean;
  setShowActionDialog: (data: boolean) => void;
  handleConfirm: () => void;
}) {
  return (
    <Dialog open={showActionDialog} onOpenChange={setShowActionDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            File Finalised
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-muted/30 rounded-lg p-4">
            <div className="space-y-2">
              Your file has been finalised. Please wait for some time while we process your file on our end.
            </div>
            <div className="flex flex-col-reverse sm:flex-row gap-3 pt-6 w-full text-center">
              <div className="flex flex-row gap-3 justify-center w-full">
                <Button onClick={handleConfirm}>Okay</Button>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FinalisedFileAlert;
