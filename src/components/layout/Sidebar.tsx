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
            const active =
              isActive || (item.name === "Admin Settings" && isAdminActive);

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
        "bg-card border-r h-screen overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-12" : "w-64"
      )}
    >
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
          "px-2 space-y-2 flex-1 overflow-auto transition-all duration-300",
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