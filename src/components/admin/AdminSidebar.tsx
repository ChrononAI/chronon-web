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
  Lock,
  FolderKanban,
  FileBarChart,
  DollarSign,
  Workflow,
} from "lucide-react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

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
        name: 'Organization',
        icon: Building2,
        children: [
            {
                name: 'Entities',
                href: '/admin/entities',
                icon: FolderTree
            },
            {
                name: 'Org',
                href: '/admin/org',
                icon: Building2,
                disabled: true,
            },
            {
                name: 'Users',
                href: '/admin/users',
                icon: Users
            }
        ]
    },
    {
        name: 'Masters',
        icon: Settings,
        children: [
            {
                name: 'Expense Masters',
                href: '/admin/expense-masters',
                icon: Receipt
            },
            {
                name: 'Expense Reports Masters',
                href: '/admin/masters/expense-reports-masters',
                icon: FileBarChart
            },
            {
                name: 'Advance Masters',
                href: '/admin/masters/advance-masters',
                icon: DollarSign
            },
            {
                name: 'Expense Request Masters',
                href: '/admin/masters/expense-request-masters',
                icon: FileCheck
            },
            {
                name: 'User Masters',
                href: '/admin/masters/users-masters',
                icon: UserCog
            }
        ]
    },
    {
        name: 'Product Config',
        icon: Shield,
        children: [
            {
                name: 'Roles & Access',
                href: '/admin/product-config/roles-and-access',
                icon: Lock,
                disabled: true,
            },
            {
                name: 'Expense Categories',
                href: '/admin/product-config/expense-categories',
                icon: FolderKanban
            },
            {
                name: 'Expense Policies',
                href: '/admin/product-config/expense-policies',
                icon: FileText
            },
            {
                name: 'Category Limits',
                href: '/admin/product-config/category-limits',
                icon: CreditCard
            },
            {
                name: "Workflow",
                href: '/admin/product-config/workflow',
                icon: Workflow
            },
            {
                name: 'Auto Reports',
                href: '/admin/product-config/auto-reports',
                icon: FileBarChart
            }
        ]
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
    const paddingLeft = level * 16 + 12;
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
                "w-full justify-between h-auto font-medium text-sm px-3 py-2.5 hover:bg-accent/50 transition-all duration-200",
                hasActiveChild && "bg-accent/30 text-foreground",
                isDisabled &&
                  "opacity-50 cursor-not-allowed hover:bg-transparent"
              )}
              style={{ paddingLeft: `${paddingLeft}px` }}
              disabled={isDisabled}
            >
              <div className="flex items-center gap-2.5 text-muted-foreground">
                <IconComponent className="h-4 w-4 shrink-0" />
                <span className="font-medium">{item.name}</span>
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200" />
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
            className={cn(
              "flex items-center gap-2.5 py-2.5 text-sm rounded-md transition-colors px-3",
              item.isBold && "font-semibold",
              "opacity-50 cursor-not-allowed text-muted-foreground"
            )}
            style={{ paddingLeft: `${paddingLeft}px` }}
          >
            {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
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
          className={({ isActive: navIsActive }) =>
            cn(
              "flex items-center gap-2.5 py-2.5 text-sm rounded-md transition-all duration-200 px-3 group",
              item.isBold && "font-semibold",
              navIsActive || isActive
                ? "bg-primary text-primary-foreground shadow-sm hover:bg-primary/90 font-medium"
                : "text-muted-foreground hover:text-foreground hover:bg-accent/50"
            )
          }
          style={{ paddingLeft: `${paddingLeft}px` }}
        >
          {IconComponent && (
            <IconComponent
              className={cn(
                "h-4 w-4 shrink-0 transition-transform duration-200",
                "group-hover:scale-110"
              )}
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
        className="flex items-center gap-2.5 py-2.5 text-sm text-muted-foreground font-medium px-3"
        style={{ paddingLeft: `${paddingLeft}px` }}
      >
        {IconComponent && <IconComponent className="h-4 w-4 shrink-0" />}
        <span>{item.name}</span>
      </div>
    );
  };

  return (
    <div className="w-[17rem] bg-card border-r border-border h-full flex flex-col shadow-sm">
      {/* Header */}
      <div className="p-4 border-b border-border bg-muted/30">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10">
            <LayoutDashboard className="h-4 w-4 text-primary" />
          </div>
          <div>
            <h2 className="font-semibold text-sm text-foreground tracking-tight">
              Admin Settings
            </h2>
            <p className="text-xs text-muted-foreground">
              Configuration & Management
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1">
        <nav className="px-2 py-4 space-y-1">
          {navigation.map((item) => renderNavigationItem(item))}
        </nav>
      </ScrollArea>
    </div>
  );
}
