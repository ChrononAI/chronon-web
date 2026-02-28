import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

interface Agent {
  name: string;
  description: string;
  imageUrl: string;
  href: string;
  is_active: boolean;
}

type AgentAvatarCardProps = {
  name: string;
  description: string;
  imageUrl: string;
  href: string;
  is_active: boolean;
};

const AGENTS: Agent[] = [
  {
    name: "Finance Agent",
    description:
      "Streamline financial processes including expense management and report creation",
    imageUrl: "public/avatar1.jpg",
    href: "/ai-copilot/finance-agent",
    is_active: true
  },
  {
    name: "Onboarding Agent",
    description:
      "Helps in user onboarding by guiding new users through setup, feature discovery with intelligence",
    imageUrl: "public/avatar2.jpg",
    href: "/ai-copilot/onboarding-agent",
    is_active: false
  },
  {
    name: "Approver Agent",
    description:
      "Assists users in approving pending requests including reports, advances and trip requests",
    imageUrl: "public/avatar3.jpg",
    href: "/ai-copilot/approver-agent",
    is_active: false
  },
  {
    name: "Spender Agent",
    description:
      "Tracks expense for spenders with smart capture, real-time insights, and automated categorization",
    imageUrl: "public/avatar4.jpg",
    href: "/ai-copilot/spender-agent",
    is_active: false
  },
];

function AgentAvatarCard({
  name,
  description,
  imageUrl,
  href,
  is_active,
}: AgentAvatarCardProps) {
  const navigate = useNavigate();

  const handleClick = () => {
    if (!is_active) return;
    navigate(href);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "relative p-4 space-y-4 bg-white rounded-2xl w-60 h-72 shadow-sm border border-gray-100 transition-all duration-200",
        is_active
          ? "cursor-pointer hover:shadow-md"
          : "cursor-not-allowed"
      )}
    >
      {!is_active && (
        <div className="absolute inset-0 rounded-2xl bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
          <span className="text-white text-sm font-semibold bg-black/70 px-3 py-1 rounded-full">
            Coming Soon
          </span>
        </div>
      )}

      <div className="w-28 h-28 rounded-full overflow-hidden border border-gray-200 mx-auto">
        <img
          src={imageUrl}
          alt={name}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex flex-col text-center">
        <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
    </div>
  );
}

function CopilotHome() {
  return (
    <div>
      <div className="flex justify-between items-center overflow-hidden shrink-0 mb-6">
        <h1 className="text-2xl font-bold">AI Copilot</h1>
      </div>
      <div className="flex items-center gap-3">
        {AGENTS.map((agent) => (
          <AgentAvatarCard
            key={agent.name}
            name={agent.name}
            description={agent.description}
            imageUrl={agent.imageUrl}
            href={agent.href}
            is_active={agent.is_active}
          />
        ))}
      </div>
    </div>
  );
}

export default CopilotHome;
