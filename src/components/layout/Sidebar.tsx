import { useState, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  ListCheck,
  Banknote,
  ReceiptText,
  FileChartColumn,
  User,
  SquareCheckBig,
  ChevronLeft
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LucideIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

interface NavigationItem {
  name: string;
  href?: string;
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
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuthStore } from '@/store/authStore';

const navigation: NavigationItem[] = [
  { name: 'Pre Approval', href: '/pre-approvals', icon: SquareCheckBig },
  { name: 'Advances', href: '/advances', icon: SquareCheckBig },
  { name: 'Expenses', href: '/expenses', icon: Banknote },
  { name: 'Expense Reports', href: '/reports', icon: ReceiptText },
  {
    name: 'Approvals', href: '/approvals/reports', icon: ListCheck, children: [
      {
        name: 'Expense',
        href: '/approvals/reports',
        icon: ListCheck
      },
      {
        name: 'Pre Approval',
        href: '/approvals/pre-approvals',
        icon: ListCheck
      },
      {
        name: 'Advance',
        href: '/approvals/advances',
        icon: ListCheck
      }
    ]
  },
  { name: 'Reports', href: '/all-reports', isBold: false, icon: FileChartColumn },
  { name: 'Admin', href: '/admin', isBold: false, icon: FileChartColumn },
];

export function Sidebar() {
  const location = useLocation();
  const [openItems, setOpenItems] = useState<string[]>(() => {
    // Load from localStorage on initial render
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('sidebarOpenItems');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [collapsed, setCollapsed] = useState(location.pathname.includes('admin'));
  const { user, logout } = useAuthStore();

  console.log(user);

  const handleLogout = () => {
    logout();
  };

  // Save to localStorage whenever openItems changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('sidebarOpenItems', JSON.stringify(openItems));
    }
  }, [openItems]);

  // Update open items based on current route (only on initial load and route change)
  useEffect(() => {
    const path = location.pathname;
    const newOpenItems = new Set<string>(openItems); // Start with current open items
    let hasChanges = false;

    // Check each navigation item with children
    navigation.forEach(item => {
      if (item.children) {
        // If any child's href matches the current path, ensure parent is open
        const hasActiveChild = item.children.some(child =>
          child.href && path.startsWith(child.href)
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
        ? prev.filter((item) => item !== name) // Remove if exists (close)
        : [...prev, name] // Add if not exists (open)
    );
  };

  const renderNavigationItem = (item: NavigationItem, level: number = 0) => {
    const paddingLeft = level * 12 + 12; // 12px base + 12px per level
    const isDisabled = item.disabled;

    if (item.children) {
      const isOpen = !collapsed && openItems.includes(item.name);
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
              onClick={() => setCollapsed(false)} 
              className={cn(
                'w-full justify-between h-auto font-normal',
                isDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
              )}
              style={{ paddingLeft: `${paddingLeft}px` }}
              disabled={isDisabled}
            >
              <div className="flex items-center text-muted-foreground">
                {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                {item.name}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              )}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {item.children.map((child: NavigationItem) => renderNavigationItem(child, level + 1))}
          </CollapsibleContent>
        </Collapsible>
      );
    }

    if (item.href) {
      if (isDisabled || item.href === '#') {
        return (
          <div
            key={item.name}
            className={cn(
              'flex items-center py-2 text-sm rounded-md transition-colors',
              item.isBold && 'font-bold',
              'opacity-50 cursor-not-allowed text-muted-foreground'
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
          className={({ isActive }) =>
            cn(
              'flex items-center py-2 text-sm rounded-md transition-colors',
              item.isBold && 'font-bold',
              isActive
                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
            )
          }
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
        collapsed ? "w-12" : "w-64"
      )}
    >
      {/* Header Section */}
      <div className="flex items-center justify-between p-4">
        {!collapsed && (
          <Link to="/" className="flex items-center space-x-2">
            <h1 className="text-2xl font-bold text-primary truncate">CHRONON</h1>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setCollapsed((prev) => !prev)}
          className="ml-auto"
        >
          {collapsed ? (
            <ChevronRight className="h-5 w-5" />
          ) : (
            <ChevronLeft className="h-5 w-5" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className={cn("px-2 space-y-2 flex-1 transition-all duration-300", collapsed && "px-1")}>
        {navigation.map((item) => (
          <div key={item.name}>
            {renderNavigationItem(
              {
                ...item,
                name: collapsed ? "" : item.name, // Hide text if collapsed
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
                  collapsed && "justify-center w-full"
                )}
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src="" alt={user?.firstName} />
                  <AvatarFallback>
                    {user?.firstName?.[0]}
                    {user?.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>

                {!collapsed && (
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

          {!collapsed && (
            <DropdownMenuContent className="w-56 ml-4" side="right" align="end" forceMount>
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