import { Dispatch, SetStateAction, useState } from "react";
import { Chat, copilotService } from "@/services/copilotService";
import { cn, formatDate } from "@/lib/utils";
import { IconButton, Menu, MenuItem } from "@mui/material";
import { MoreVerticalIcon, TrashIcon } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "../ui/alert-dialog";
import { toast } from "sonner";

function ChatListItem({
  chat,
  selectedChatId,
  setSelectedChatId,
  getChats
}: {
  chat: Chat;
  selectedChatId: string | undefined;
  setSelectedChatId: Dispatch<SetStateAction<string | undefined>>;
  getChats: ({ shouldSetChat }: {shouldSetChat: boolean}) => void
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const open = Boolean(anchorEl);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleDelete = () => {
    handleMenuClose();
    setShowDeleteDialog(true);
  }

  const deleteChatAsync = async (chatId: string) => {
    try {
        setDeleting(true);
        const payload = [{ id: chatId }]
        await copilotService.deleteChat(payload);
        const shouldSetChat = selectedChatId === chatId ? true : false;
        getChats({ shouldSetChat });
        toast.success("Chat deleted successfully");
    } catch (error: any) {
        console.log(error);
        toast.error(error?.response?.data?.message || error?.message);
    } finally {
        setDeleting(false);
    }
  }

  const handleDeleteChat = (event: React.MouseEvent) => {
    event.stopPropagation();
    handleMenuClose();
    deleteChatAsync(chat.id)
  };

  return (
    <>
      <div
        className={cn(
          "group relative flex justify-between items-start capitalize text-sm rounded-md border p-2 w-full transition-colors truncate",
          selectedChatId === chat.id
            ? "bg-[#0d9c9a0b] border-l-[4px] border-[#0D9C99]"
            : "hover:bg-gray-100",
        )}
        onClick={() => setSelectedChatId(chat.id)}
      >
        <div className="space-y-1 truncate">
          <div className="truncate font-medium">{chat.title}</div>
          <div className="text-xs text-gray-500">
            {formatDate(chat.created_at)}
          </div>
        </div>

        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <IconButton size="small" onClick={handleMenuOpen}>
            <MoreVerticalIcon className="h-4 w-4" />
          </IconButton>
        </div>

        <Menu
          anchorEl={anchorEl}
          open={open}
          onClose={handleMenuClose}
          onClick={(e) => e.stopPropagation()}
          className="w-80"
        >
          <MenuItem
            onClick={handleDelete}
            className="w-36"
            sx={{ color: "red" }}
          >
            <TrashIcon className="w-3 h-3 mr-2" /> <span className="text-sm">Delete</span>
          </MenuItem>
        </Menu>
      </div>
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Chat</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this chat? This action cannot be
              undone.
              <span className="block mt-2 font-medium">Chat: {chat.title}</span>
            </AlertDialogDescription>
          </AlertDialogHeader>

          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>

            <AlertDialogAction
              onClick={handleDeleteChat}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default ChatListItem;
