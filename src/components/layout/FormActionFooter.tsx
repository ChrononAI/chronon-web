import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface FormActionFooterProps {
  primaryButton: {
    label: string;
    onClick: () => void;
    type?: "button" | "submit";
    form?: string;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
  };
  secondaryButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
  };
}

export const FormActionFooter: React.FC<FormActionFooterProps> = ({
  primaryButton,
  secondaryButton,
}) => {
  const { sidebarCollapsed } = useAuthStore();

  return (
    <div
      style={{
        position: "fixed",
        bottom: 0,
        left: sidebarCollapsed ? "48px" : "240px",
        right: 0,
        height: "59px",
        backgroundColor: "#FFFFFF",
        borderTop: "0.7px solid #EBEBEB",
        paddingTop: "14px",
        paddingRight: "20px",
        paddingBottom: "14px",
        paddingLeft: "20px",
        display: "flex",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: "12px",
        zIndex: 30,
        boxSizing: "border-box",
        margin: 0,
      }}
    >
      {secondaryButton && (
        <Button
          type="button"
          variant="outline"
          onClick={secondaryButton.onClick}
          disabled={secondaryButton.disabled || secondaryButton.loading}
          style={{
            width: "auto",
            minWidth: "65px",
            height: "31px",
            paddingTop: "8px",
            paddingRight: "12px",
            paddingBottom: "8px",
            paddingLeft: "12px",
            gap: "8px",
            borderRadius: "4px",
            border: "1px solid #161B53",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#161B53",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {secondaryButton.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {secondaryButton.loadingText || "Loading..."}
            </>
          ) : (
            secondaryButton.label
          )}
        </Button>
      )}
      <Button
        type={primaryButton.type || "button"}
        form={primaryButton.form}
        onClick={primaryButton.onClick}
        disabled={primaryButton.disabled || primaryButton.loading}
        style={{
          width: "auto",
          minWidth: "65px",
          height: "31px",
          paddingTop: "8px",
          paddingRight: "12px",
          paddingBottom: "8px",
          paddingLeft: "12px",
          gap: "8px",
          borderRadius: "4px",
          border: "1px solid #161B53",
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: "12px",
          lineHeight: "100%",
          letterSpacing: "0%",
          color: "#FFFFFF",
          backgroundColor: "#161B53",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "#0f1340";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "#161B53";
        }}
      >
        {primaryButton.loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {primaryButton.loadingText || "Loading..."}
          </>
        ) : (
          primaryButton.label
        )}
      </Button>
    </div>
  );
};

