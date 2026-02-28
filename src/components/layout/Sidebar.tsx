import { useState, useEffect } from "react";
import { useLocation, NavLink } from "react-router-dom";
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
import newLogo from "@/assets/NewLogo.png";

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
        name: "Pre Approval",
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
        name: "Expense Reports",
        href: "/approvals/reports",
        icon: CheckSquare,
      },
      {
        name: "Pre Approval",
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
      {
        name: "Expense Reports",
        href: "/admin/admin-reports",
        icon: CheckSquare,
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
  "Pre Approval": "pre_approval_settings",
  Advances: "advance_settings",
  Transactions: "mobile_payment_settings",
  Admin: "admin_dashboard_settings",
  Stores: "store_settings",
};

export function Sidebar() {
  const location = useLocation();
  const { user, orgSettings, logout, sidebarCollapsed, setSidebarCollapsed } =
    useAuthStore();
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
      } else if (item?.href === "/admin/admin-reports") {
        const permission = {
          enabled: orgSettings?.admin_approval_settings?.enabled && user?.role === "SUPER_ADMIN",
          allowed: orgSettings?.admin_approval_settings?.enabled && user?.role === "SUPER_ADMIN"
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
      } else if (item.name === "Pre Approval" || item.name === "Advances") {
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
    const newNav: NavigationItem[] = mergePermissions(navigation, orgSettings);
    setNewNavItems(newNav);
  }, [orgSettings]);

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
              className="transition-all duration-200"
              style={{
                width: sidebarCollapsed ? "36px" : "224px",
                height: sidebarCollapsed ? "36px" : "41px",
                justifyContent: sidebarCollapsed ? "center" : "space-between",
                borderRadius: sidebarCollapsed ? "6px" : "8px",
                padding: sidebarCollapsed ? "6px" : "12px",
                opacity: isDisabled ? 0.5 : 1,
                cursor: isDisabled ? "not-allowed" : "pointer",
              }}
              disabled={isDisabled}
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
      if (isDisabled || item.href === "#") {
        return (
          <div
            key={item.name}
            className="flex items-center transition-colors"
            style={{
              width: sidebarCollapsed ? "36px" : "224px",
              height: sidebarCollapsed ? "36px" : "41px",
              justifyContent: sidebarCollapsed ? "center" : "flex-start",
              borderRadius: sidebarCollapsed ? "6px" : "8px",
              padding: sidebarCollapsed ? "6px" : "12px",
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
            {item.icon && (
              <item.icon 
                className={cn("h-4 w-4", !sidebarCollapsed && "mr-3")} 
                style={{ color: "#47536C" }} 
              />
            )}
            {!sidebarCollapsed && item.name}
          </div>
        );
      }

      const currentPath = location.pathname;
      const isActive = currentPath.startsWith(item.href) || (item.name === "Admin Settings" && isAdminActive);

      return (
        <NavLink
          key={item.name}
          to={item.href}
          className={({ isActive: navIsActive }) => {
            const active = navIsActive || isActive;

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

    // Handle items without href (just labels)
    return (
      <div
        key={item.name}
        className="flex items-center"
        style={{
          width: sidebarCollapsed ? "36px" : "224px",
          height: sidebarCollapsed ? "36px" : "41px",
          justifyContent: sidebarCollapsed ? "center" : "flex-start",
          borderRadius: sidebarCollapsed ? "6px" : "8px",
          padding: sidebarCollapsed ? "6px" : "12px",
          fontFamily: "Inter",
          fontWeight: 500,
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
    );
  };

  return (
    <div
      className={cn(
        "bg-card border-r h-full flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-12 overflow-hidden" : "w-[240px] overflow-y-auto"
      )}
    >
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
            to="/" 
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
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={sidebarCollapsed ? "" : "ml-auto"}
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
        {newNavItems.length > 0 &&
          newNavItems.map((item) => (
            <div key={item.name}>
              {renderNavigationItem(item, 0)}
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