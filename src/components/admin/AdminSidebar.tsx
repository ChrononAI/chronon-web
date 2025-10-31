import { useState, useEffect } from 'react';
import { useLocation, NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';
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
        name: 'ORGANISATION',
        children: [
            {
                name: 'Entities',
                href: '/admin/organisation/entities'
            }
        ]
    },
    {
        name: 'MASTERS',
        children: [
            {
                name: 'Expense Masters',
                href: '/admin/masters/expense-masters'
            },
            {
                name: 'Expense Reports Masters',
                href: '/admin/masters/expense-reports-masters'
            },
            {
                name: 'Advance Masters',
                href: '/admin/masters/advance-masters'
            },
            {
                name: 'Expense Request Masters',
                href: '/admin/masters/expense-request-masters'
            },
            {
                name: 'User Masters',
                href: '/admin/masters/users-masters'
            }
        ]
    },
    {
        name: 'PRODUCT CONFIG',
        children: [
            {
                name: 'Roles & Access',
                href: '/admin/product-config/roles-and-access'
            },
            {
                name: 'Expense Categories',
                href: '/admin/product-config/expense-categories'
            },
            {
                name: 'Expense Policies',
                href: '/admin/product-config/expense-policies'
            },
            {
                name: 'Category Limits',
                href: '/admin/product-config/category-limits'
            }
        ]
    },
];

export default function AdminSidebar() {
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
        const newOpenItems = new Set<string>(openItems);
        let hasChanges = false;

        // Check each navigation item with children
        navigation.forEach(item => {
            if (item.children) {
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

    const renderNavigationItem = (item: NavigationItem) => {
        const isDisabled = item.disabled;

        if (item.children) {
            return (
                <div key={item.name} >
                    <div className='w-full justify-between h-auto text-[12px] font-bold pl-3'>
                        <div className="flex items-center text-muted-foreground">
                            {item.name}
                        </div>
                    </div>
                    <div className="space-y-1 mt-1">
                        {item.children.map((child: NavigationItem) => renderNavigationItem(child))}
                    </div>
                </div>
            );
        }

        if (item.href) {
            if (isDisabled || item.href === '#') {
                return (
                    <div
                        key={item.name}
                        className={cn(
                            'flex items-center py-2 text-sm rounded-md transition-colors pl-3',
                            item.isBold && 'font-bold',
                            'opacity-50 cursor-not-allowed text-muted-foreground'
                        )}
                    >
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
                            'flex items-center py-2 text-sm rounded-md transition-colors pl-3',
                            item.isBold && 'font-bold',
                            isActive
                                ? 'bg-primary text-primary-foreground hover:bg-primary/90'
                                : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                        )
                    }
                >
                    {item.name}
                </NavLink>
            );
        }

        // Handle items without href (just labels)
        return (
            <div key={item.name} className="flex items-center py-2 text-sm text-muted-foreground font-medium pl-3">
                {item.name}
            </div>
        );
    };

    return (
        <div className="w-56 bg-card border-r h-full overflow-y-auto flex flex-col">
            <div className="font-semibold text-[12px] text-muted-foreground p-3">
                ADMIN SETTINGS
            </div>
            <nav className="px-2 space-y-6">
                {navigation.map((item) => renderNavigationItem(item))}
            </nav>
        </div>
    );
}