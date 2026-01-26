import { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  ChevronLeft,
  FileText,
  Store,
  SlidersHorizontal,
  Building2,
  User,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAuthStore } from "@/store/authStore";
import { trackEvent } from "@/mixpanel";
import { Link } from "react-router-dom";
import newLogo from "@/assets/NewLogo.png";

interface NavigationItem {
  name: string;
  href?: string;
  icon?: any;
  children?: NavigationItem[];
}

const flowNavigation: NavigationItem[] = [
  {
    name: "Master",
    icon: Building2,
    children: [
      { name: "Vendor", href: "/flow/vendors", icon: Store },
    ],
  },
  { name: "Invoice", href: "/flow/invoice", icon: FileText },
  { name: "Approval", href: "/flow/approvals", icon: SlidersHorizontal },
  {
    name: "Items",
    icon: FileText,
    children: [
      {
        name: "TDS Code",
        href: "/flow/items/tds-code",
        icon: FileText,
      },
      {
        name: "Tax Code",
        href: "/flow/items/tax-code",
        icon: FileText,
      },
    ],
  },
];

export function FlowSidebar() {
  const location = useLocation();
  const { user, logout, sidebarCollapsed, setSidebarCollapsed } = useAuthStore();
  // Disable sidebar expansion on invoice detail pages (but allow on AllInvoicesPage)
  // Invoice detail pages: /flow/invoice/:id or /flow/approvals/:id
  // AllInvoicesPage: /flow/invoice (exact match)
  const isInvoiceDetailPage = 
    (location.pathname.startsWith("/flow/invoice/") && location.pathname !== "/flow/invoice") ||
    location.pathname.startsWith("/flow/approvals/");
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("flowSidebarOpenItems");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("flowSidebarOpenItems", JSON.stringify(openItems));
    }
  }, [openItems]);

  useEffect(() => {
    const path = location.pathname;
    const newOpenItems = new Set<string>(openItems);
    let hasChanges = false;

    flowNavigation.forEach((item) => {
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

  const handleLogout = () => {
    trackEvent("Logout Button Clicked", {
      button_name: "Logout",
    });
    logout();
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    if (item.children) {
      const isOpen = !sidebarCollapsed && openItems.includes(item.name);
      return (
        <Collapsible
          key={item.name}
          open={isOpen}
          onOpenChange={() => {
            toggleItem(item.name);
          }}
        >
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              onClick={() => {
                if (!isInvoiceDetailPage) {
                  setSidebarCollapsed(false);
                }
              }}
              className="transition-all duration-200"
              style={{
                width: sidebarCollapsed ? "36px" : "224px",
                height: sidebarCollapsed ? "36px" : "41px",
                justifyContent: sidebarCollapsed ? "center" : "space-between",
                borderRadius: sidebarCollapsed ? "6px" : "8px",
                padding: sidebarCollapsed ? "6px" : "12px",
              }}
            >
              <div 
                className="flex items-center"
                style={{
                  fontFamily: "Inter",
                  fontWeight: 500,
                  fontStyle: "normal",
                  fontSize: "14px",
                  lineHeight: "100%",
                  letterSpacing: "0%",
                  color: "#47536C",
                }}
              >
                {item.icon && (
                  <item.icon 
                    className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")} 
                    style={{ color: "#47536C" }} 
                  />
                )}
                {!sidebarCollapsed && item.name}
              </div>
              {!sidebarCollapsed && (
                isOpen ? (
                  <ChevronDown className="h-4 w-4" style={{ color: "#47536C" }} />
                ) : (
                  <ChevronRight className="h-4 w-4" style={{ color: "#47536C" }} />
                )
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1 overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
            {item.children.map((child: NavigationItem) =>
              renderNavigationItem(child, level + 1)
            )}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    if (item.href) {
      const isApprovalActive = item.name === "Approval" && location.pathname.startsWith("/flow/approvals");
      const isActive = location.pathname.startsWith(item.href) || isApprovalActive;
      
      return (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive: navIsActive }) => {
            const active = navIsActive || isApprovalActive;

            return cn(
              "flex items-center transition-colors",
              active
                ? "bg-[#0D9C99] hover:bg-[#0b8a87]"
                : "hover:bg-muted"
            );
          }}
          style={{
            width: sidebarCollapsed ? "36px" : "224px",
            height: sidebarCollapsed ? "36px" : "41px",
            justifyContent: sidebarCollapsed ? "center" : "flex-start",
            borderRadius: sidebarCollapsed ? "6px" : "8px",
            padding: sidebarCollapsed ? "6px" : "12px",
          }}
        >
          <div 
            className="flex items-center"
            style={{
              fontFamily: "Inter",
              fontWeight: 500,
              fontStyle: "normal",
              fontSize: "14px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: isActive
                ? "#FFFFFF"
                : "#47536C",
            }}
          >
            {item.icon && (
              <item.icon 
                className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")} 
                style={{ 
                  color: isActive
                    ? "#FFFFFF"
                    : "#47536C"
                }} 
              />
            )}
            {!sidebarCollapsed && item.name}
          </div>
        </NavLink>
      );
    }

    return null;
  };

  return (
    <div
      className={cn(
        "bg-card border-r h-full flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-12 overflow-hidden" : "w-[240px] overflow-y-auto"
      )}
    >
      {/* Header Section - Logo Container */}
      <div 
        className={cn(
          "flex items-center",
          sidebarCollapsed ? "justify-center" : "justify-between"
        )}
        style={{
          width: sidebarCollapsed ? "48px" : "240px",
          height: "56px",
          padding: "12px",
          gap: "10px",
        }}
      >
        {!sidebarCollapsed && (
          <Link 
            to="/flow" 
            className="flex items-center"
            style={{ gap: "10px" }}
          >
            <img 
              src={newLogo} 
              alt="CHRONON" 
              className="h-8 w-auto"
            />
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => {
            if (!isInvoiceDetailPage) {
              setSidebarCollapsed(!sidebarCollapsed);
            }
          }}
          disabled={isInvoiceDetailPage}
          className={sidebarCollapsed ? "" : "ml-auto"}
          title={isInvoiceDetailPage ? "Sidebar cannot be expanded on invoice detail pages" : ""}
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation - Routes Container */}
      <nav
        className="flex-1"
        style={{
          width: sidebarCollapsed ? "48px" : "224px",
          marginTop: "10px",
          marginLeft: sidebarCollapsed ? "0px" : "8px",
          marginRight: sidebarCollapsed ? "0px" : "0px",
          display: "flex",
          flexDirection: "column",
          gap: "4px",
          alignItems: sidebarCollapsed ? "center" : "flex-start",
        }}
      >
        {flowNavigation.map((item) => renderNavigationItem(item, 0))}
      </nav>

      {/* Footer (User Menu) */}
      <div className="p-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div
                className={cn(
                  "flex items-center space-x-2 transition-all duration-300 min-w-0",
                  sidebarCollapsed && "justify-center w-full"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={user?.firstName} />
                  <AvatarFallback>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                {!sidebarCollapsed && (
                  <div className="flex flex-col space-y-1 min-w-0 flex-1">
                    <p className="text-sm font-medium leading-none truncate" title={`${user?.firstName} ${user?.lastName}`}>
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground truncate" title={user?.email}>
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuTrigger>

          {!sidebarCollapsed && (
            <DropdownMenuContent
              className="w-56 ml-4"
              side="right"
              align="end"
              forceMount
            >
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild className="cursor-pointer">
                <Link to="/profile" className="flex items-center">
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="cursor-pointer text-red-600 focus:text-red-600"
                onClick={handleLogout}
              >
                <span>Log out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
}
