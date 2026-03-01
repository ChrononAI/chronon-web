import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import {
  Chat,
  ChatMessage,
  copilotService,
  LineGraphMetadata,
} from "@/services/copilotService";
import { Paperclip, SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import BotChatBubble from "../../components/copilot/BotChatBubble";
import UserChatBubble from "../../components/copilot/UserChatBubble";
import { useLocation } from "react-router-dom";
import { toast } from "sonner";
import ChatListItem from "@/components/copilot/ChatListItem";

function TypingBubble() {
  return (
    <div className="flex w-full">
      <div className="bg-gray-500 px-4 py-2 h-10 rounded-xl inline-flex items-center space-x-1">
        <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.3s]" />
        <span className="w-2 h-2 bg-white rounded-full animate-bounce [animation-delay:-0.15s]" />
        <span className="w-2 h-2 bg-white rounded-full animate-bounce" />
      </div>
    </div>
  );
}

function AgentChat() {
  const { pathname } = useLocation();
  const agent = pathname.includes("finance-agent")
    ? "finance"
    : pathname.includes("onboarding")
      ? "onboarding"
      : pathname.includes("spender")
        ? "spender"
        : "approver";
  const [chats, setChats] = useState<Chat[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [selectedChatId, setSelectedChatId] = useState<string>();
  const [message, setMessage] = useState<string>("");
  const [msgLoading, setMsgLoading] = useState(false);

  const getChats = async ({ shouldSetChat }: { shouldSetChat: boolean }) => {
    try {
      let res;
      if (agent === "finance") {
        res = await copilotService.getChats();
      }
      if (res) {
        setChats(res.data.data);
        if (shouldSetChat) {
          setSelectedChatId(res.data.data[0].id);
        }
      }
    } catch (error) {
      console.log(error);
    }
  };

  const getMessages = async (chatId: string) => {
    try {
      const res = await copilotService.getMessages(chatId);
      setMessages(res.data.data.reverse());
    } catch (error) {
      console.log(error);
    }
  };

  const sendMessage = async (payload: Record<string, string | undefined>) => {
    try {
      setMsgLoading(true);
      const res = await copilotService.sendMessage(payload);
      setMessages((prev) => [...prev, res.data.data]);
      if (payload.title) {
        getChats({ shouldSetChat: true });
      }
      setMessage("");
    } catch (error: any) {
      console.log(error);
      toast.error(error?.response?.data?.message || error?.message);
    } finally {
      setMsgLoading(false);
    }
  };

  const onMessageSend = async () => {
    const newMsg: ChatMessage = {
      id: crypto.randomUUID(),
      chat_id: selectedChatId || "random id",
      author: "USER",
      message,
      metadata: {} as LineGraphMetadata,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, newMsg]);
    const payload = {
      message,
      chat_id: selectedChatId || undefined,
      title: !selectedChatId ? message : undefined,
    };
    await sendMessage(payload);
  };

  const handleNewChat = () => {
    setMessages([]);
    setSelectedChatId(undefined);
  };

  useEffect(() => {
    getChats({ shouldSetChat: true });
  }, []);

  useEffect(() => {
    if (selectedChatId) getMessages(selectedChatId);
  }, [selectedChatId]);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const isFirstLoad = useRef(true);

  useEffect(() => {
    if (!containerRef.current) return;

    const container = containerRef.current;

    container.scrollTo({
      top: container.scrollHeight,
      behavior: isFirstLoad.current ? "auto" : "smooth",
    });

    isFirstLoad.current = false;
  }, [messages]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex justify-between items-center overflow-hidden shrink-0 mb-6">
        <h1 className="text-2xl font-bold">AI Copilot</h1>
      </div>

      <div className="flex flex-1 shrink-0 min-h-0">
        <div className="w-64 border-r flex flex-col">
          <div className="py-2 pr-2 shrink-0">
            <Button
              variant="outline"
              onClick={handleNewChat}
              className="w-full"
            >
              Add New Chat
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 pb-2 pr-2">
            <div className="text-sm mb-2 text-gray-500 p-2">Your Chats</div>
            <div className="space-y-2">
              {chats.map((chat) => (
                <ChatListItem
                  key={chat.id}
                  chat={chat}
                  selectedChatId={selectedChatId}
                  setSelectedChatId={setSelectedChatId}
                  getChats={getChats}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={containerRef}
            className={cn(
              "flex-1 overflow-y-auto px-3 py-4 space-y-4 scroll-smooth",
              messages.length === 0 ? "flex items-center justify-between" : "",
            )}
          >
            {messages.length > 0 ? (
              messages.map((message) => {
                if (message.author === "SYSTEM") {
                  return <BotChatBubble key={message.id} message={message} />;
                } else if (message.author === "USER" && message.message) {
                  return <UserChatBubble key={message.id} message={message} />;
                }
              })
            ) : (
              <div className="flex items-center text-center justify-center w-full h-full text-xl">
                I’m ready to analyze your expenses. Ask me something to see your
                insights.
              </div>
            )}
            {msgLoading && <TypingBubble />}
          </div>

          <div className="border-t pl-3 py-3 shrink-0 bg-background">
            <div className="flex items-center gap-2">
              <Button variant="outline" className="h-11 w-11 p-0">
                <Paperclip className="h-5 w-5" />
              </Button>

              <Input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Type your message..."
                className="h-11"
              />

              <Button
                onClick={onMessageSend}
                disabled={!message.trim()}
                className="h-11 w-11 p-0 bg-[#0D9C99] hover:bg-[#0D9C99]"
              >
                <SendHorizonal className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AgentChat;
