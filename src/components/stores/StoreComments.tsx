import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { storesService } from "@/services/storeService";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const formatDateOnly = (dateString: string | undefined | null): string => {
  if (!dateString) return "Invalid date";
  const datePart = dateString.split("T")[0];
  if (!datePart) return "Invalid date";
  const date = new Date(datePart);
  if (isNaN(date.getTime())) {
    return "Invalid date";
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  });
  const parts = formatter.formatToParts(date);
  const month = parts.find((p) => p.type === "month")?.value || "";
  const day = parts.find((p) => p.type === "day")?.value || "";
  return `${month} ${day}`;
};

interface StoreComment {
  id: string;
  comment: string;
  created_at: string;
  creator_user_id?: string;
  creator_user?: {
    full_name?: string;
    email?: string;
  };
}

interface StoreCommentsProps {
  storeId: string | undefined;
  readOnly?: boolean;
  className?: string;
}

export function StoreComments({
  storeId,
  readOnly = false,
  className,
}: StoreCommentsProps) {
  const { user } = useAuthStore();
  const [comments, setComments] = useState<StoreComment[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [postingComment, setPostingComment] = useState(false);
  const [commentError, setCommentError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState("");

  useEffect(() => {
    const fetchComments = async () => {
      if (storeId) {
        setLoadingComments(true);
        setCommentError(null);
        try {
          const fetchedComments = await storesService.getStoreComments(storeId);
          const sortedComments = [...fetchedComments].sort((a, b) => {
            const dateA = new Date(a.created_at).getTime();
            const dateB = new Date(b.created_at).getTime();
            return dateA - dateB;
          });
          setComments(sortedComments);
        } catch (error: any) {
          console.error("Error fetching comments:", error);
          setCommentError(
            error.response?.data?.message || "Failed to load comments"
          );
        } finally {
          setLoadingComments(false);
        }
      }
    };
    fetchComments();
  }, [storeId]);

  const handlePostComment = async () => {
    if (!storeId || !newComment.trim() || postingComment) return;
    setPostingComment(true);
    setCommentError(null);
    try {
      await storesService.postStoreComment(storeId, newComment.trim(), false);
      const fetchedComments = await storesService.getStoreComments(storeId);
      const sortedComments = [...fetchedComments].sort((a, b) => {
        const dateA = new Date(a.created_at).getTime();
        const dateB = new Date(b.created_at).getTime();
        return dateA - dateB;
      });
      setComments(sortedComments);
      setNewComment("");
      toast.success("Comment posted successfully");
    } catch (error: any) {
      console.error("Error posting comment:", error);
      const errorMessage =
        error.response?.data?.message || "Failed to post comment";
      setCommentError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setPostingComment(false);
    }
  };

  return (
    <div className={cn("flex flex-col h-full", className)}>
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-4 min-h-0">
        {loadingComments ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
          </div>
        ) : commentError ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-red-500">{commentError}</p>
          </div>
        ) : comments.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-gray-500">No comments yet</p>
          </div>
        ) : (
          comments.map((comment) => {
            const isCurrentUser =
              comment.creator_user_id === user?.id?.toString();
            return (
              <div
                key={comment.id}
                className={cn(
                  "flex animate-in fade-in slide-in-from-bottom-2 m-1",
                  isCurrentUser ? "justify-end" : "justify-start"
                )}
              >
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-4 py-2.5",
                    isCurrentUser ? "bg-primary/10" : "bg-gray-100"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[12px] text-gray-700 font-medium">
                      {isCurrentUser
                        ? "You"
                        : comment.creator_user?.full_name ||
                          comment.creator_user?.email ||
                          "Unknown"}
                    </span>
                    <span className="text-[12px] text-gray-500">
                      {formatDateOnly(comment.created_at)}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">
                    {comment.comment}
                  </p>
                </div>
              </div>
            );
          })
        )}
      </div>
      <div className="flex-none bg-white border-t border-gray-200 p-4 mt-auto">
        {storeId ? (
          <div className="flex items-end gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type a message..."
              disabled={readOnly || postingComment}
              rows={1}
              className="flex-1 resize-none rounded-md border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newComment.trim() && !postingComment) handlePostComment();
                }
              }}
            />
            {!readOnly && (
              <Button
                type="button"
                size="icon"
                className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
                disabled={!newComment.trim() || postingComment}
                onClick={handlePostComment}
              >
                {postingComment ? (
                  <Loader2 className="h-5 w-5 text-white animate-spin" />
                ) : (
                  <Send className="h-5 w-5 text-white" />
                )}
              </Button>
            )}
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-500">Store ID required</p>
          </div>
        )}
      </div>
    </div>
  );
}

