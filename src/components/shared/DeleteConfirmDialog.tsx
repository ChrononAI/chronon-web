import { useState, ReactNode } from "react"
import {
  AlertDialog,
  AlertDialogTrigger,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from "@/components/ui/alert-dialog"
import { Loader2 } from "lucide-react"
import { useNavigate } from "react-router-dom"

type DeleteConfirmDialogProps = {
  trigger: ReactNode
  title: string
  description: ReactNode
  onConfirm: () => Promise<void> | void
  confirmText?: string
  cancelText?: string
}

export function DeleteConfirmDialog({
  trigger,
  title,
  description,
  onConfirm,
  confirmText = "Delete",
  cancelText = "Cancel",
}: DeleteConfirmDialogProps) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleConfirm = async () => {
    try {
      setIsDeleting(true)
      await onConfirm()
      setOpen(false)
      navigate('/admin-settings/product-config/category-limits');
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (isDeleting) return // prevent close while deleting
        setOpen(nextOpen)
      }}
    >
      <AlertDialogTrigger asChild>
        {trigger}
      </AlertDialogTrigger>

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isDeleting}>
            {cancelText}
          </AlertDialogCancel>

          <AlertDialogAction
            onClick={handleConfirm}
            disabled={isDeleting}
            className="bg-red-600 hover:bg-red-700"
          >
            {isDeleting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Deleting...
              </>
            ) : (
              confirmText
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
