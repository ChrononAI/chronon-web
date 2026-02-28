import { useNavigate } from "react-router-dom";

interface Agent {
  name: string;
  description: string;
  imageUrl: string;
  href: string;
}

type AgentAvatarCardProps = {
  name: string;
  description: string;
  imageUrl: string;
  href: string
};

const AGENTS: Agent[] = [
  {
    name: "Finance Agent",
    description:
      "Streamline financial processes including expense management and report creation",
    imageUrl: "public/avatar1.jpg",
    href: "/ai-copilot/finance-agent",
  },
  {
    name: "Onboarding Agent",
    description:
      "Helps in user onboarding by guiding new users through setup, feature discovery with intelligence",
    imageUrl: "public/avatar2.jpg",
    href: "/ai-copilot/onboarding-agent",
  },
  {
    name: "Approver Agent",
    description:
      "Assists users in approving pending requests including reports, advances and trip requests",
    imageUrl: "public/avatar3.jpg",
    href: "/ai-copilot/approver-agent",
  },
  {
    name: "Spender Agent",
    description:
      "Tracks expense for spenders with smart capture, real-time insights, and automated categorization",
    imageUrl: "public/avatar4.jpg",
    href: "/ai-copilot/spender-agent",
  },
];

function AgentAvatarCard({
  name,
  description,
  imageUrl,
  href
}: AgentAvatarCardProps) {
    const navigate = useNavigate();
  return (
    <div onClick={() => navigate(href)} className="p-4 space-y-4 bg-white rounded-2xl w-60 shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-200 cursor-pointer">
      <div className="w-28 h-28 rounded-full overflow-hidden border border-gray-200 mx-auto">
        <img src={imageUrl} alt={name} className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col text-center">
        <h3 className="text-lg font-semibold text-gray-800">{name}</h3>
        <p className="text-sm text-gray-500 mt-1 max-w-md">{description}</p>
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
          />
        ))}
      </div>
    </div>
  );
}

export default CopilotHome;
