import { useState } from "react";
import { useLocation, NavLink } from "react-router-dom";
import { ChevronLeft, ChevronRight, FileText, Store, List } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/store/authStore";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const flowNavigation = [
  { name: "Invoice", href: "/flow/invoice", icon: FileText },
  { name: "Vendor", href: "/flow/vendors", icon: Store },
];

const itemsNavigation = [
  { name: "TDS Code", href: "/flow/items/tds-code", icon: FileText },
  { name: "Tax Code", href: "/flow/items/tax-code", icon: FileText },
];

export function FlowSidebar() {
  const location = useLocation();
  const { sidebarCollapsed, setSidebarCollapsed } = useAuthStore();

  return (
    <div
      className={cn(
        "bg-card border-r h-full overflow-y-auto flex flex-col transition-all duration-300 ease-in-out",
        sidebarCollapsed ? "w-12" : "w-64"
      )}
    >
      <div className="flex items-center justify-between p-4">
        {!sidebarCollapsed && (
          <h1 className="text-2xl font-bold text-primary truncate">INVOICE</h1>
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

      <nav
        className={cn(
          "px-2 space-y-2 flex-1 transition-all duration-300",
          sidebarCollapsed && "px-1"
        )}
      >
        {flowNavigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) => {
              return cn(
                "flex items-center py-2 text-sm rounded-md transition-colors",
                isActive
                  ? "bg-[#0D9C99] text-white hover:bg-[#0b8a87]"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted"
              );
            }}
            style={{ paddingLeft: sidebarCollapsed ? "12px" : "12px" }}
          >
            {item.icon && <item.icon className="mr-3 h-4 w-4" />}
            {!sidebarCollapsed && item.name}
          </NavLink>
        ))}
        
        {!sidebarCollapsed && (
          <Collapsible defaultOpen={false} className="mt-2">
            <CollapsibleTrigger className="flex items-center w-full py-2 text-sm rounded-md transition-colors text-muted-foreground hover:text-foreground hover:bg-muted px-3">
              <List className="mr-3 h-4 w-4" />
              <span>Items</span>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-6 mt-1 space-y-1">
              {itemsNavigation.map((item) => (
                <NavLink
                  key={item.name}
                  to={item.href}
                  className={({ isActive }) => {
                    return cn(
                      "flex items-center py-2 text-sm rounded-md transition-colors",
                      isActive
                        ? "bg-[#0D9C99] text-white hover:bg-[#0b8a87]"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    );
                  }}
                >
                  {item.icon && <item.icon className="mr-3 h-4 w-4" />}
                  {item.name}
                </NavLink>
              ))}
            </CollapsibleContent>
          </Collapsible>
        )}
      </nav>
    </div>
  );
}

