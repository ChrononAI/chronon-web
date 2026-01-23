import { useState } from "react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Filter, Search, Share2, Download, X, Plus } from "lucide-react";
import {
  GridToolbarProps,
  Toolbar,
  ToolbarPropsOverrides,
} from "@mui/x-data-grid";

export interface CustomInvoiceToolbarProps {
  searchTerm?: string;
  onSearchChange?: (value: string) => void;
  onFilterClick?: () => void;
  onShareClick?: () => void;
  onDownloadClick?: () => void;
  onCreateClick?: () => void;
  createButtonText?: string;
  // Page-specific filter/status props
  allStatuses?: string[];
  selectedStatuses?: string[];
  onStatusChange?: (statuses: string[]) => void;
  statusOptions?: Array<{ value: string; label: string }>;
}

type Props = GridToolbarProps &
  ToolbarPropsOverrides &
  CustomInvoiceToolbarProps;

function CustomInvoiceToolbar({
  searchTerm = "",
  onSearchChange,
  onFilterClick,
  onShareClick,
  onDownloadClick,
  onCreateClick,
  createButtonText = "Upload Invoice",
}: Props) {
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleSearchClick = () => {
    setIsSearchOpen(true);
  };

  const handleCloseSearch = () => {
    setIsSearchOpen(false);
    onSearchChange?.("");
  };

  return (
    <Toolbar 
      className="flex items-center !border-0 bg-white"
      style={{
        width: "100%",
        height: "31px",
        justifyContent: "space-between",
        padding: "0",
        paddingLeft: "10px",
        paddingRight: "18px",
      }}
    >
      {/* Left side - Search and Tools */}
      <div className="flex items-center" style={{ gap: "17px" }}>
        {isSearchOpen ? (
          <>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search"
                className="pl-9 bg-white h-10 w-64"
                value={searchTerm}
                onChange={(e) => onSearchChange?.(e.target.value)}
                autoFocus
              />
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleCloseSearch}
              className="text-muted-foreground hover:text-foreground"
              style={{
                width: "18px",
                height: "18px",
                minWidth: "18px",
                padding: "0",
              }}
            >
              <X className="h-5 w-5" />
            </Button>
          </>
        ) : (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleSearchClick}
            className="text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
            style={{
              width: "18px",
              height: "18px",
              minWidth: "18px",
              padding: "0",
            }}
          >
            <Search 
              className="h-full w-full" 
              style={{
                width: "18px",
                height: "18px",
              }}
            />
          </Button>
        )}

        {/* Separator */}
        <div 
          style={{
            width: "1px",
            height: "18px",
            backgroundColor: "#EBEBEB",
          }}
        />

        {/* Always show Filter, Share, Download icons */}
        <div 
          className="flex items-center"
          style={{
            height: "20px",
            gap: "17px",
          }}
        >
          {/* 🔧 FILTER */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onFilterClick}
            className="text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
            style={{
              width: "18px",
              height: "18px",
              minWidth: "18px",
              padding: "0",
            }}
          >
            <Filter 
              className="h-full w-full"
              style={{
                width: "18px",
                height: "18px",
              }}
            />
          </Button>

          {/* Separator */}
          <div 
            style={{
              width: "1px",
              height: "18px",
              backgroundColor: "#EBEBEB",
            }}
          />

          {/* 📤 SHARE */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onShareClick}
            className="text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
            style={{
              width: "18px",
              height: "18px",
              minWidth: "18px",
              padding: "0",
            }}
          >
            <Share2 
              className="h-full w-full"
              style={{
                width: "18px",
                height: "18px",
              }}
            />
          </Button>

          {/* Separator */}
          <div 
            style={{
              width: "1px",
              height: "18px",
              backgroundColor: "#EBEBEB",
            }}
          />

          {/* ⬇️ DOWNLOAD */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onDownloadClick}
            className="text-muted-foreground hover:text-foreground p-0 hover:bg-transparent"
            style={{
              width: "18px",
              height: "18px",
              minWidth: "18px",
              padding: "0",
            }}
          >
            <Download 
              className="h-full w-full"
              style={{
                width: "18px",
                height: "18px",
              }}
            />
          </Button>
        </div>
      </div>

      {/* Right side - Create/Upload Button */}
      {onCreateClick && (
        <Button
          onClick={onCreateClick}
          style={{
            width: "163px",
            height: "31px",
            gap: "8px",
            borderRadius: "4px",
            paddingTop: "8px",
            paddingRight: "12px",
            paddingBottom: "8px",
            paddingLeft: "12px",
            backgroundColor: "#0D9C99",
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: "none",
            cursor: "pointer",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#0b8a87";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#0D9C99";
          }}
        >
          <Plus 
            style={{
              width: "12px",
              height: "12px",
              color: "#FFFFFF",
            }}
          />
          <span
            style={{
              fontFamily: "Inter",
              fontWeight: 600,
              fontSize: "12px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: "#FFFFFF",
              height: "15px",
              display: "flex",
              alignItems: "center",
            }}
          >
            {createButtonText}
          </span>
        </Button>
      )}
    </Toolbar>
  );
}

export default CustomInvoiceToolbar;

