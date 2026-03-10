import { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";
import {
  Building2,
  Users,
  FileText,
  Settings,
  Shield,
  FolderTree,
  ChevronRight,
  ChevronDown,
  LayoutDashboard,
  Receipt,
  FileCheck,
  CreditCard,
  UserCog,
  FolderKanban,
  FileBarChart,
  DollarSign,
  Workflow,
  Store,
  CloudUpload,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";

interface NavigationItem {
  name: string;
  href?: string;
  icon?: React.ElementType;
  isBold?: boolean;
  disabled?: boolean;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: "Organization",
    icon: Building2,
    children: [
      {
        name: "Entities",
        href: "/admin-settings/entities",
        icon: FolderTree,
      },
      {
        name: "Users",
        href: "/admin-settings/users",
        icon: Users,
      },
    ],
  },
  {
    name: "Masters",
    icon: Settings,
    children: [
      {
        name: "Expense Masters",
        href: "/admin-settings/expense-masters",
        icon: Receipt,
      },
      {
        name: "Expense Reports Masters",
        href: "/admin-settings/masters/expense-reports-masters",
        icon: FileBarChart,
      },
      {
        name: "Advance Masters",
        href: "/admin-settings/masters/advance-masters",
        icon: DollarSign,
      },
      {
        name: "Expense Request Masters",
        href: "/admin-settings/masters/expense-request-masters",
        icon: FileCheck,
      },
      {
        name: "User Masters",
        href: "/admin-settings/masters/users-masters",
        icon: UserCog,
      },
      {
        name: "Store Masters",
        href: "/admin-settings/masters/store-masters",
        icon: Store,
      },
    ],
  },
  {
    name: "Product Config",
    icon: Shield,
    children: [
      {
        name: "Expense Categories",
        href: "/admin-settings/product-config/expense-categories",
        icon: FolderKanban,
      },
      {
        name: "Expense Policies",
        href: "/admin-settings/product-config/expense-policies",
        icon: FileText,
      },
      {
        name: "Category Limits",
        href: "/admin-settings/product-config/category-limits",
        icon: CreditCard,
      },
      {
        name: "Workflow",
        href: "/admin-settings/product-config/workflow",
        icon: Workflow,
      },
      {
        name: "Auto Reports",
        href: "/admin-settings/product-config/auto-reports",
        icon: FileBarChart,
      },
      {
        name: "Bulk Uploads",
        href: "/admin-settings/product-config/bulk-uploads",
        icon: CloudUpload,
      },
    ],
  },
];

export default function AdminSidebar() {
  const location = useLocation();
  const [openItems, setOpenItems] = useState<string[]>(() => {
    // Load from localStorage on initial render
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarOpenItems");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  // Save to localStorage whenever openItems changes
  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarOpenItems", JSON.stringify(openItems));
    }
  }, [openItems]);

  // Update open items based on current route (only on initial load and route change)
  useEffect(() => {
    const path = location.pathname;
    const newOpenItems = new Set<string>(openItems);
    let hasChanges = false;

    // Check each navigation item with children
    navigation.forEach((item) => {
      if (item.children) {
        const hasActiveChild = item.children.some(
          (child) => child.href && path.startsWith(child.href)
        );

        if (hasActiveChild && !newOpenItems.has(item.name)) {
          newOpenItems.add(item.name);
          hasChanges = true;
        }
      }
    });

    if (hasChanges) {
      setOpenItems(Array.from(newOpenItems));
    }
  }, [location.pathname, openItems]);

  const toggleItem = (name: string) => {
    setOpenItems((prev) =>
      prev.includes(name)
        ? prev.filter((item) => item !== name)
        : [...prev, name]
    );
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const isDisabled = item.disabled;

    if (item.children) {
      const isOpen = openItems.includes(item.name);
      const IconComponent = item.icon || Building2;

      // Check if any child is active
      const hasActiveChild = item.children.some(
        (child) => child.href && location.pathname.startsWith(child.href)
      );

      return (
        <Collapsible
          key={item.name}
          open={isOpen}
          onOpenChange={(isOpen) => {
            // 👇 prevent closing if hasActiveChild is true
            if (hasActiveChild && !isOpen) return;
            toggleItem(item.name);
          }}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-between h-auto transition-all duration-200",
                isDisabled && "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
              style={{ 
                padding: "12px",
                height: "41px",
                borderRadius: "8px",
                backgroundColor: hasActiveChild ? "transparent" : "transparent",
              }}
              disabled={isDisabled}
            >
              <div 
                className="flex items-center gap-2.5"
                style={{
                  fontFamily: "Inter",
                  fontWeight: 500,
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  color: "#47536C",
                }}
              >
                <IconComponent className="h-4 w-4 shrink-0" style={{ color: "#47536C" }} />
                <span>{item.name}</span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 shrink-0 transition-transform duration-200" style={{ color: "#47536C" }} />
              ) : (
                <ChevronRight className="h-4 w-4 shrink-0 transition-transform duration-200" style={{ color: "#47536C" }} />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-0.5 mt-0.5 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {item.children.map((child: NavigationItem) =>
              renderNavigationItem(child, level + 1)
            )}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    if (item.href) {
      if (isDisabled || item.href === "#") {
        const IconComponent = item.icon;
        return (
          <div
            key={item.name}
            className="flex items-center gap-2.5 rounded-md transition-colors"
            style={{ 
              padding: "12px",
              height: "41px",
              borderRadius: "8px",
              marginLeft: level > 0 ? "16px" : "0px",
              opacity: 0.5,
              cursor: "not-allowed",
              fontFamily: "Inter",
              fontWeight: 500,
              fontSize: "14px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: "#47536C",
            }}
          >
            {IconComponent && <IconComponent className="h-4 w-4 shrink-0" style={{ color: "#47536C" }} />}
            <span>{item.name}</span>
          </div>
        );
      }

      const IconComponent = item.icon;
      const isActive =
        location.pathname === item.href ||
        location.pathname.startsWith(item.href + "/");

      return (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive: navIsActive }) => {
            const active = navIsActive || isActive;
            return cn(
              "flex items-center gap-2.5 rounded-md transition-all duration-200 group",
              active && "bg-[#0D9C99] hover:bg-[#0b8a87]"
            );
          }}
          style={{ 
            padding: "12px",
            height: "41px",
            borderRadius: "8px",
            marginLeft: level > 0 ? "16px" : "0px",
            fontFamily: "Inter",
            fontWeight: 500,
            fontSize: "14px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: isActive ? "#FFFFFF" : "#47536C",
            backgroundColor: isActive ? "#0D9C99" : "transparent",
          }}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "#f5f5f5";
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          {IconComponent && (
            <IconComponent
              className="h-4 w-4 shrink-0 transition-transform duration-200"
              style={{ 
                color: isActive ? "#FFFFFF" : "#47536C"
              }}
            />
          )}
          <span>{item.name}</span>
        </NavLink>
      );
    }

    // Handle items without href (just labels)
    const IconComponent = item.icon;
    return (
      <div
        key={item.name}
        className="flex items-center gap-2.5"
        style={{ 
          padding: "12px",
          height: "41px",
          marginLeft: level > 0 ? "16px" : "0px",
          fontFamily: "Inter",
          fontWeight: 500,
          fontSize: "14px",
          lineHeight: "100%",
          letterSpacing: "0%",
          color: "#47536C",
        }}
      >
        {IconComponent && <IconComponent className="h-4 w-4 shrink-0" style={{ color: "#47536C" }} />}
        <span>{item.name}</span>
      </div>
    );
  };

  return (
    <div className="w-[17rem] bg-white border-r border-[#EBEBEB] h-screen overflow-y-auto flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-[#EBEBEB] bg-white">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-[#0D9C99]/10">
            <LayoutDashboard className="h-4 w-4" style={{ color: "#0D9C99" }} />
          </div>
          <div>
            <h2 
              className="text-sm tracking-tight"
              style={{
                fontFamily: "Inter",
                fontWeight: 600,
                fontSize: "14px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#1A1A1A",
              }}
            >
              Admin Settings
            </h2>
            <p 
              className="text-xs"
              style={{
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#64748B",
                marginTop: "4px",
              }}
            >
              Configuration & Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-auto">
        <nav className="px-2 py-4 space-y-1">
          {navigation.map((item) => renderNavigationItem(item))}
        </nav>
      </div>
    </div>
  );
}
