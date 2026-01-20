import { useState, useEffect } from "react";
import { useLocation, NavLink, useNavigate } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  Banknote,
  User,
  ChevronLeft,
  ClipboardCheck,
  Wallet,
  CheckSquare,
  FileBarChart,
  FolderKanban,
  Building2,
  FileSpreadsheet,
  FilePlus,
  SlidersHorizontal,
  Store,
  TicketCheck,
  Receipt,
  FileText,
  LogOut,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";

interface NavigationItem {
  name: string;
  href?: string;
  permissions?: { allowed: boolean; enabled: boolean };
  icon?: LucideIcon;
  isBold?: boolean;
  disabled?: boolean;
  children?: NavigationItem[];
}
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

const hasPermittedChild = (item: NavigationItem): boolean => {
  if (!item.children) return false;

  return item.children.some((child) => {
    if (child.permissions?.enabled === true) return true;
    if (child.children) return hasPermittedChild(child);
    return false;
  });
};

const navigation: NavigationItem[] = [
  {
    name: "Requests",
    href: "/requests/pre-approvals",
    icon: FilePlus,
    children: [
      {
        name: "Trip Request",
        href: "/requests/pre-approvals",
        icon: CheckSquare,
      },
      {
        name: "Advances",
        href: "/requests/advances",
        icon: ClipboardCheck,
      },
      {
        name: "Stores",
        href: "/requests/stores",
        icon: Store,
      },
      {
        name: "Users",
        href: "/requests/users",
        icon: User,
      },
    ],
  },
  { name: "Expenses", href: "/expenses", icon: Banknote },
  { name: "Expense Reports", href: "/reports", icon: FileSpreadsheet },
  { name: "Transactions", href: "/transactions", icon: Receipt },
  {
    name: "Approvals",
    href: "/approvals/reports",
    icon: SlidersHorizontal,
    children: [
      {
        name: "Expenses",
        href: "/approvals/reports",
        icon: CheckSquare,
      },
      {
        name: "Trip Request",
        href: "/approvals/pre-approvals",
        icon: ClipboardCheck,
      },
      {
        name: "Advances",
        href: "/approvals/advances",
        icon: Wallet,
      },
      {
        name: "Stores",
        href: "/approvals/stores",
        icon: Store,
      },
    ],
  },
  {
    name: "Accounts",
    href: "/advance_accounts",
    isBold: false,
    icon: FolderKanban,
  },
  {
    name: "Admin",
    href: "admin/all-reports",
    icon: Building2,
    children: [
      {
        name: "Reports",
        href: "/admin/all-reports",
        isBold: false,
        icon: FileBarChart,
      },
      {
        name: "Settlements",
        href: "/admin/settlements",
        icon: TicketCheck,
      },
    ],
  },
  {
    name: "Admin Settings",
    href: "/admin-settings/entities",
    isBold: false,
    icon: Building2,
  },
];

const permissionMap: any = {
  Advances: "advance_settings",
  Transactions: "mobile_payment_settings",
  Admin: "admin_dashboard_settings",
  Stores: "store_settings",
};

export function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, orgSettings, logout, sidebarCollapsed, setSidebarCollapsed, activeAccount, setActiveAccount } =
    useAuthStore();
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitioningTo, setTransitioningTo] = useState<"expenses" | "flow">("expenses");
  const [openItems, setOpenItems] = useState<string[]>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("sidebarOpenItems");
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [newNavItems, setNewNavItems] = useState<NavigationItem[]>([]);
  const isAdminActive = location.pathname.startsWith("/admin-settings");

  const mergePermissions = (items: any[], permissions: any): any[] => {
    return items.map((item) => {
      if (item?.name === "Admin Settings") {
        const permission = {
          enabled:
            (orgSettings?.admin_dashboard_settings?.enabled === true &&
              user?.role === "SUPER_ADMIN") ||
            false,
          allowed:
            (orgSettings?.admin_dashboard_settings?.allowed === true &&
              user?.role === "SUPER_ADMIN") ||
            false,
        };
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;
        return {
          ...item,
          permissions: permission,
          children,
        };
      } else if (item?.name === "Admin") {
        const permission = {
          enabled: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
          allowed: user?.role === "ADMIN" || user?.role === "SUPER_ADMIN",
        };
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;
        return {
          ...item,
          permissions: permission,
          children,
        };
      } else if (item.name === "Accounts") {
        const permission = {
          enabled: orgSettings?.advance_settings?.enabled || false,
          allowed: orgSettings?.advance_settings?.allowed || false,
        };
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;
        return {
          ...item,
          permissions: permission,
          children,
        };
      } else if (item.name === "Trip Request") {
        // Trip Request always enabled, no permission check
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;

        return {
          ...item,
          permissions: { enabled: true, allowed: true },
          children,
        };
      } else if (item.name === "Advances") {
        const key = permissionMap[item.name];
        const permission =
          key && permissions
            ? permissions[key]
            : { enabled: false, allowed: false };

        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;

        return {
          ...item,
          permissions: permission,
          children,
        };
      } else if (item.name === "Stores") {
        const permission = {
          enabled: orgSettings?.store_settings?.enabled || false,
          allowed: orgSettings?.store_settings?.allowed || false,
        };
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;
        return {
          ...item,
          permissions: permission,
          children,
        };
      } else if (item.name === "Users") {
        const permission = {
          enabled: orgSettings?.store_settings?.enabled || false,
          allowed: orgSettings?.store_settings?.allowed || false,
        };
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;
        return {
          ...item,
          permissions: permission,
          children,
        };
      } else {
        const key = permissionMap[item.name];
        const permission = key && permissions ? permissions[key] : undefined;

        // Recursively apply to children
        const children = item.children
          ? mergePermissions(item.children, permissions)
          : undefined;

        return {
          ...item,
          permissions: permission,
          children,
        };
      }
    });
  };

  useEffect(() => {
    // In Account 2 (flow mode), show the same navigation items as Account 1
    // The routes will work in both modes since they're accessible from both layouts
    let navToUse = navigation;
    
    const newNav: NavigationItem[] = mergePermissions(navToUse, orgSettings);
    setNewNavItems(newNav);
  }, [orgSettings]);

  // Note: Browser back button prevention removed since both accounts use the same routes

  const handleLogout = () => {
    trackEvent("Logout Button Clicked", {
      button_name: "Logout",
    });
    logout();
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("sidebarOpenItems", JSON.stringify(openItems));
    }
  }, [openItems]);

  useEffect(() => {
    const path = location.pathname;
    const newOpenItems = new Set<string>(openItems);
    let hasChanges = false;

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
    if (item.permissions && item.permissions?.enabled === false) {
      return null;
    }

    const paddingLeft = level * 12 + 12;
    const isDisabled = item.disabled;

    if (item.children) {
      const hasAllowedChild = item.name === "Requests" ? hasPermittedChild(item) : true;

      if (!hasAllowedChild) return null;

      const isOpen =
        !isDisabled &&
        !sidebarCollapsed &&
        openItems.includes(item.name);
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
              onClick={() => setSidebarCollapsed(false)}
              className={cn(
                "w-full justify-between h-auto font-normal transition-all duration-200",
                isDisabled &&
                "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
              style={{ paddingLeft: `${paddingLeft}px` }}
              disabled={isDisabled}
            >
              <div className="flex items-center text-muted-foreground">
                {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                {item.name}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground transition-transform duration-200" />
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
      if (isDisabled || item.href === "#") {
        return (
          <div
            key={item.name}
            className={cn(
              "flex items-center py-2 text-sm rounded-md transition-colors",
              item.isBold && "font-bold",
              "opacity-50 cursor-not-allowed text-muted-foreground"
            )}
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {item.icon && <item.icon className="mr-3 h-4 w-4" />}
            {item.name}
          </div>
        );
      }

      return (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive }) => {
            // For Approval tab, also check if we're on approval detail pages
            const isApprovalActive = item.name === "Approval" && location.pathname.startsWith("/flow/approvals");
            const active = isActive || isApprovalActive || (item.name === "Admin Settings" && isAdminActive);

            return cn(
              "flex items-center py-2 text-sm rounded-md transition-colors",
              item.isBold && "font-bold",
              active
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "text-muted-foreground hover:text-foreground hover:bg-muted"
            );
          }}
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {item.icon && <item.icon className="mr-3 h-4 w-4" />}
          {item.name}
        </NavLink>
      );
    }

    // Handle items without href (just labels)
    return (
      <div
        key={item.name}
        className="flex items-center py-2 text-sm text-muted-foreground font-medium"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {item.icon && <item.icon className="mr-3 h-4 w-4" />}
        {item.name}
      </div>
    );
  };

  return (
    <div
      className={cn(
        "bg-card border-r h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-12" : "w-64"
      )}
    >
      {/* Futuristic Workspace Transition Overlay */}
      {isTransitioning && (
        <div 
          className="fixed inset-0 z-[9999] pointer-events-none overflow-hidden animate-[workspaceFadeIn_0.3s_ease-out]"
          style={{ 
            animation: 'workspaceFadeIn 0.3s ease-out',
          }}
        >
          {/* Animated gradient background with blur */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50/98 via-purple-50/95 to-indigo-50/98 backdrop-blur-xl" />
          
          {/* Animated floating orbs/particles */}
          <div className="absolute inset-0 overflow-hidden">
            <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-400/20 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-400/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '0.5s' }} />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-indigo-300/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
          </div>

          {/* Main Content Container */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="relative z-10 text-center animate-[workspaceSlideUp_0.5s_ease-out]">
              {/* Icon container with morphing rings */}
              <div className="relative w-32 h-32 flex items-center justify-center mb-8 mx-auto">
                {/* Outer animated rings */}
                <div className="absolute inset-0 border-2 border-blue-300/30 rounded-full animate-spin" style={{ animationDuration: '8s' }} />
                <div className="absolute inset-2 border-2 border-purple-300/30 rounded-full animate-spin" style={{ animationDuration: '6s', animationDirection: 'reverse' }} />
                <div className="absolute inset-4 border border-indigo-300/20 rounded-full animate-spin" style={{ animationDuration: '10s' }} />
                
                {/* Main icon with glow */}
                <div className="relative w-24 h-24 flex items-center justify-center">
                  {/* Glow effect */}
                  <div className="absolute inset-0 bg-gradient-to-br from-blue-400/40 to-purple-400/40 rounded-full blur-xl animate-pulse" />
                  
                  {/* Icon background with glassmorphism */}
                  <div className="relative w-20 h-20 flex items-center justify-center bg-white/90 backdrop-blur-xl rounded-full border-2 border-white/60 shadow-2xl transform transition-all duration-500 hover:scale-110">
                    {transitioningTo === "expenses" ? (
                      <Wallet className="h-10 w-10 text-blue-600 animate-[workspaceFadeIn_0.4s_ease-out]" />
                    ) : (
                      <FileText className="h-10 w-10 text-purple-600 animate-[workspaceFadeIn_0.4s_ease-out]" />
                    )}
                  </div>
                </div>
              </div>

              {/* Workspace name with smooth animation */}
              <div className="space-y-3 animate-[workspaceSlideUp_0.6s_ease-out]">
                <div>
                  <div className="text-gray-800 text-3xl font-bold tracking-tight bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                    Pradeep Chhabria
                  </div>
                  <div className="text-gray-600 text-sm font-medium mt-1">
                    {transitioningTo === "expenses" ? "Keelnex PVT Limited" : "Chronon PVT Limited"}
                  </div>
                </div>
                <div className="flex items-center justify-center gap-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse" />
                  <div className="text-gray-600 text-sm font-medium">Switching workspace</div>
                  <div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }} />
                </div>
              </div>
            </div>
          </div>

          {/* Animated progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-gradient-to-r from-blue-500 via-purple-500 to-indigo-500 overflow-hidden">
            <div className="h-full w-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[workspaceProgress_1.2s_ease-in-out_infinite]" style={{ transform: 'translateX(-100%)' }} />
          </div>
        </div>
      )}

      {/* Header Section */}
      <div className="flex items-center justify-between p-4">
        {!sidebarCollapsed && (
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-primary truncate">
              CHRONON
            </h1>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className="ml-auto"
        >
          {sidebarCollapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav
        className={cn(
          "px-2 space-y-2 flex-1 transition-all duration-300",
          sidebarCollapsed && "px-1"
        )}
      >
        {newNavItems.length > 0 &&
          newNavItems.map((item) => (
            <div key={item.name}>
              {renderNavigationItem(
                {
                  ...item,
                  name: sidebarCollapsed ? "" : item.name, // Hide text if collapsed
                },
                0
              )}
            </div>
          ))}
      </nav>

      {/* Footer (User Menu) */}
      <div className="p-4 mt-auto">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <div className="flex items-center justify-between cursor-pointer">
              <div
                className={cn(
                  "flex items-center space-x-2 transition-all duration-300",
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
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">
                      {user?.firstName} {user?.lastName}
                    </p>
                    <p className="text-xs leading-none text-muted-foreground">
                      {user?.email}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </DropdownMenuTrigger>

          {!sidebarCollapsed && (
            <DropdownMenuContent
              className="w-64 ml-4 p-0"
              side="right"
              align="end"
              forceMount
            >
              {/* Workspaces Section */}
              <div className="px-3 pt-2.5 pb-2">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Workspaces
                </p>
                <div className="space-y-0.5">
                  {/* Account 1 */}
                  <div
                    onClick={() => {
                      if (activeAccount !== "account1") {
                        setActiveAccount("account1");
                        setTransitioningTo("expenses");
                        setIsTransitioning(true);
                        setTimeout(() => {
                          window.history.replaceState(null, "", "/expenses");
                          navigate("/expenses", { replace: true });
                          setTimeout(() => setIsTransitioning(false), 1200);
                        }, 1000);
                      }
                    }}
                    className={cn(
                      "relative flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-all",
                      activeAccount === "account1"
                        ? "bg-blue-50 border-l-4 border-blue-600"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-blue-600 text-white">
                        <Wallet className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        Pradeep Chhabria
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        Keelnex PVT Limited
                      </p>
                    </div>
                  </div>

                  {/* Account 2 */}
                  <div
                    onClick={() => {
                      if (activeAccount !== "account2") {
                        setActiveAccount("account2");
                        // Account 2 uses the same routes as Account 1
                        setTransitioningTo("flow");
                        setIsTransitioning(true);
                        setTimeout(() => {
                          window.history.replaceState(null, "", "/expenses");
                          navigate("/expenses", { replace: true });
                          setTimeout(() => setIsTransitioning(false), 1200);
                        }, 1000);
                      }
                    }}
                    className={cn(
                      "relative flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition-all",
                      activeAccount === "account2"
                        ? "bg-blue-50 border-l-4 border-blue-600"
                        : "hover:bg-muted/50"
                    )}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="bg-purple-600 text-white">
                        <FileText className="h-3.5 w-3.5" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground leading-tight">
                        Pradeep Chhabria
                      </p>
                      <p className="text-xs text-muted-foreground leading-tight mt-0.5">
                        Chronon PVT Limited
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <DropdownMenuSeparator />

              {/* Account Section */}
              <div className="px-3 pt-2 pb-2.5">
                <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wide">
                  Account
                </p>
                <div className="space-y-0.5">
                  <DropdownMenuItem asChild className="cursor-pointer px-2 py-1.5">
                    <Link to="/profile" className="flex items-center">
                      <User className="mr-2 h-4 w-4" />
                      Profile
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    className="cursor-pointer text-red-600 focus:text-red-600 focus:bg-red-50 px-2 py-1.5"
                    onClick={handleLogout}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    Log out
                  </DropdownMenuItem>
                </div>
              </div>
            </DropdownMenuContent>
          )}
        </DropdownMenu>
      </div>
    </div>
  );
}
