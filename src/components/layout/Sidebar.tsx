import { useState, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import {
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  ListCheck,
  Banknote,
  ReceiptText,
  FileChartColumn
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { LucideIcon } from 'lucide-react';

interface NavigationItem {
  name: string;
  href?: string;
  icon?: LucideIcon;
  isBold?: boolean;
  disabled?: boolean;
  children?: NavigationItem[];
}

const navigation: NavigationItem[] = [
  {
    name: 'Dashboard',
    href: '#',
    icon: LayoutDashboard,
  },
  { name: 'Expenses', href: '/expenses', icon: Banknote },
  { name: 'Expense Reports', href: '/reports', icon: ReceiptText },
  {
    name: 'Approvals',
    href: '/approvals/reports',
    icon: ListCheck,
  },
  { name: 'Reports', href: '/all-reports', isBold: false, icon: FileChartColumn },
  
 
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
      const isOpen = openItems.includes(item.name);
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
              className={cn(
                'w-full justify-between h-auto font-normal',
                isDisabled && 'opacity-50 cursor-not-allowed hover:bg-transparent'
              )}
              style={{ paddingLeft: `${paddingLeft}px` }}
              disabled={isDisabled}
            >
              <div className="flex items-center">
                {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                {item.name}
              </div>
              {isOpen ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
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
    <div className="w-64 bg-card border-r h-full overflow-y-auto">
      <nav className="p-4 space-y-2">
        {navigation.map((item) => renderNavigationItem(item))}
      </nav>
    </div>
  );
}