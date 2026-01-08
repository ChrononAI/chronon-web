import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { ExpenseComment } from "@/types/expense";
import { useAuthStore } from "@/store/authStore";
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

interface ExpenseCommentsProps {
  expenseId: string | undefined;
  readOnly?: boolean;
  className?: string;
  autoFetch?: boolean; // Whether to automatically fetch comments when expenseId changes
  comments: ExpenseComment[];
  commentError: string | null;
  loadingComments: boolean;
  postComment: any;
  postingComment: boolean;
  newComment: string;
  setNewComment: any;
}

export function ExpenseComments({
  expenseId,
  readOnly = false,
  className,
  comments,
  commentError,
  loadingComments,
  postComment,
  postingComment,
  newComment,
  setNewComment
}: ExpenseCommentsProps) {
  const { user } = useAuthStore();

  return (
    <div className={cn("flex flex-col h-full", className)}>
      {/* Scrollable Comments Area */}
      <div
        className="flex-1 overflow-y-auto p-4 space-y-3 pb-4"
        id="comments-scroll"
      >
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

      {/* Sticky Footer - Input Area */}
      <div className="flex-none sticky bottom-0 z-10 bg-white border-t border-gray-200 p-3">
        {expenseId ? (
          <div className="flex items-end gap-2">
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Type a message..."
              disabled={readOnly || postingComment}
              rows={1}
              className="flex-1 resize-none overflow-hidden rounded-md border border-gray-200 bg-white px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary max-h-32"
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = "auto";
                t.style.height = `${Math.min(t.scrollHeight, 128)}px`;
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  if (newComment.trim() && !postingComment) postComment();
                }
              }}
            />
            {!readOnly && (
              <Button
                type="button"
                size="icon"
                className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90"
                disabled={!newComment.trim() || postingComment}
                onClick={postComment}
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
            <p className="text-sm text-gray-500">
              Save expense to add comments
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
