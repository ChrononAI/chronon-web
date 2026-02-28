import React from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

interface ButtonConfig {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  loading?: boolean;
  loadingText?: string;
}

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
  deleteButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
    icon?: React.ReactNode;
  };
  updateButton?: {
    label: string;
    onClick: () => void;
    disabled?: boolean;
    loading?: boolean;
    loadingText?: string;
  };
  primaryColor?: string;
  primaryHoverColor?: string;
  totalAmount?: string | React.ReactNode;
  calculationDetails?: string | React.ReactNode;
}

export const FormActionFooter: React.FC<FormActionFooterProps> = ({
  primaryButton,
  secondaryButton,
  deleteButton,
  updateButton,
  primaryColor = "#161B53",
  primaryHoverColor = "#0f1340",
  totalAmount,
  calculationDetails,
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
        justifyContent: totalAmount ? "space-between" : "flex-end",
        gap: "12px",
        zIndex: 30,
        boxSizing: "border-box",
        margin: 0,
      }}
    >
      {totalAmount && (
        <div style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
        }}>
          <div style={{
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#64748B",
            marginBottom: "4px",
          }}>
            Total Amount
          </div>
          <div style={{
            display: "flex",
            alignItems: "baseline",
            gap: "8px",
            flexWrap: "wrap",
          }}>
            <div style={{
              fontFamily: "Inter",
              fontWeight: 700,
              fontSize: "24px",
              lineHeight: "100%",
              letterSpacing: "0%",
              color: "#1A1A1A",
            }}>
              {totalAmount}
            </div>
            {calculationDetails && (
              <div style={{
                fontFamily: "Inter",
                fontWeight: 500,
                fontSize: "12px",
                lineHeight: "100%",
                letterSpacing: "0%",
                color: "#64748B",
              }}>
                {calculationDetails}
              </div>
            )}
          </div>
        </div>
      )}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}>
      {deleteButton && (
        <Button
          type="button"
          variant="outline"
          onClick={deleteButton.onClick}
          disabled={deleteButton.disabled || deleteButton.loading}
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
            border: "1px solid #DC2626",
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: "#DC2626",
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#FEF2F2";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {deleteButton.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {deleteButton.loadingText || "Loading..."}
            </>
          ) : (
            <>
              {deleteButton.icon}
              {deleteButton.label}
            </>
          )}
        </Button>
      )}
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
            border: `1px solid ${primaryColor}`,
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: primaryColor,
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
      {updateButton && (
        <Button
          type="button"
          variant="outline"
          onClick={updateButton.onClick}
          disabled={updateButton.disabled || updateButton.loading}
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
            border: `1px solid ${primaryColor}`,
            fontFamily: "Inter",
            fontWeight: 600,
            fontSize: "12px",
            lineHeight: "100%",
            letterSpacing: "0%",
            color: primaryColor,
            backgroundColor: "transparent",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#f5f5f5";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          {updateButton.loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {updateButton.loadingText || "Loading..."}
            </>
          ) : (
            updateButton.label
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
          border: `1px solid ${primaryColor}`,
          fontFamily: "Inter",
          fontWeight: 600,
          fontSize: "12px",
          lineHeight: "100%",
          letterSpacing: "0%",
          color: "#FFFFFF",
          backgroundColor: primaryColor,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = primaryHoverColor;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = primaryColor;
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
    </div>
  );
};

