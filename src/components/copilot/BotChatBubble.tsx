import CustomChart from "@/components/copilot/CustomChart";
import { ChatMessage } from "@/services/copilotService";

function BotChatBubble({ message }: { message: ChatMessage }) {
  return (
    <>
      <div className="flex items-start">
        {message.message && (
          <div className="bg-gray-500 text-white p-2 rounded-xl max-w-[80%]">
            {message.message}
          </div>
        )}
      </div>
      {Object.keys(message.metadata).filter(key => key !== "query_params").length > 0 && (
        <div>
          <div className="bg-gray-500 text-white p-2 rounded-xl max-w-[80%]">
            <div className="font-semibold">{message?.metadata?.summary?.heading}</div>
            <div>
              {message?.metadata?.summary?.content?.map((cont, idx) => <div key={idx}>{cont}</div>)}
            </div>
          </div>
          <CustomChart data={message.metadata} />
        </div>
      )}
    </>
  );
}

export default BotChatBubble;
