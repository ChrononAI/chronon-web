import { ChatMessage } from "@/services/copilotService"

function UserChatBubble({message}: {message: ChatMessage}) {
  return (
    <div className="flex justify-end w-full">
        <div className="bg-[#0D9C99] text-white text-sm p-2 rounded-xl max-w-[80%]">{message.message}</div>
    </div>
  )
}

export default UserChatBubble