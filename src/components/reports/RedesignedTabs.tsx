import React from 'react';
import { cn } from '@/lib/utils';

interface TabConfig {
  key: string;
  label: string;
  count: number;
}

interface RedesignedTabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  tabs?: TabConfig[];
  className?: string;
  // Title configuration
  title?: string;
  titleClassName?: string;
  titleStyle?: React.CSSProperties;
  // Customizable styling props
  containerWidth?: string | number;
  containerHeight?: string | number;
  gap?: string | number;
  paddingX?: string | number;
  paddingY?: string | number;
  // Text styling
  textSize?: string; // e.g., '14px', '16px', '1rem'
  textWeight?: string | number; // e.g., '500', '600', 'medium', 'semibold'
  // Colors
  activeTextColor?: string;
  inactiveTextColor?: string;
  activeUnderlineColor?: string;
  activeBadgeBg?: string;
  activeBadgeText?: string;
  inactiveBadgeBg?: string;
  inactiveBadgeText?: string;
  borderColor?: string;
  borderTopColor?: string;
}

export function RedesignedTabs({
  activeTab,
  onTabChange,
  tabs,
  className,
  title,
  titleClassName,
  titleStyle,
  containerWidth = '1040px',
  containerHeight = '57px',
  gap = '32px',
  paddingX = '20px',
  paddingY = '0px',
  textSize = '14px',
  textWeight = '600',
  activeTextColor = '#0D9C99', // teal from Figma
  inactiveTextColor = '#47536C', // dark gray from Figma
  activeUnderlineColor = '#0D9C99', // teal from Figma
  activeBadgeBg = '#E6FFFA', // light teal
  activeBadgeText = '#0D9C99', // teal from Figma
  inactiveBadgeBg = '#F3F4F6', // light gray
  inactiveBadgeText = '#4B5563', // dark gray
  borderColor = '#EBEBEB',
  borderTopColor = '#EBEBEB',
}: RedesignedTabsProps) {
  return (
    <div className="w-full">
      {/* Title Section */}
      {title && (
        <div
          className={cn("mb-0 flex items-center", titleClassName)}
          style={{
            width: typeof containerWidth === 'number' ? `${containerWidth}px` : containerWidth,
            height: '56px',
            backgroundColor: '#FFFFFF',
            borderBottom: `1px solid ${borderColor}`,
            boxSizing: 'border-box',
            paddingTop: '16px',
            paddingLeft: '20px',
            ...titleStyle,
          }}
        >
          <h1
            style={{
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              fontSize: '20px',
              lineHeight: '100%',
              letterSpacing: '0%',
              color: '#1A1A1A',
              margin: 0,
              padding: 0,
              display: 'inline-block',
              height: '24px',
              width: 'auto',
            }}
          >
            {title}
          </h1>
        </div>
      )}
      
      {/* Tabs Container */}
      <div
        className={cn("flex items-center border-b border-t", className)}
        style={{
          width: typeof containerWidth === 'number' ? `${containerWidth}px` : containerWidth,
          height: typeof containerHeight === 'number' ? `${containerHeight}px` : containerHeight,
          gap: typeof gap === 'number' ? `${gap}px` : gap,
          paddingLeft: typeof paddingX === 'number' ? `${paddingX}px` : paddingX,
          paddingRight: typeof paddingX === 'number' ? `${paddingX}px` : paddingX,
          paddingTop: typeof paddingY === 'number' ? `${paddingY}px` : paddingY,
          paddingBottom: typeof paddingY === 'number' ? `${paddingY}px` : paddingY,
          borderBottom: `1px solid ${borderColor}`,
          borderTop: `1px solid ${borderTopColor}`,
          boxSizing: 'border-box',
        }}
      >
        {tabs?.map((tab) => {
          const isActive = activeTab === tab.key;
          
          return (
            <button
              key={tab.key}
              onClick={() => onTabChange(tab.key)}
              className="relative flex items-center transition-colors"
              style={{
                color: isActive ? activeTextColor : inactiveTextColor,
                fontFamily: 'Inter, sans-serif',
                fontSize: textSize,
                fontWeight: typeof textWeight === 'number' ? textWeight : textWeight,
                lineHeight: '100%',
                letterSpacing: '0%',
                height: '57px', // Fill height from Figma
                paddingTop: '20px',
                paddingBottom: '20px',
                gap: '4px', // Gap between label and badge from Figma
                width: 'auto', // Hug width - auto based on content
                boxSizing: 'border-box',
              }}
            >
              <span>{tab.label}</span>
              {tab.count >= 0 && (
                <span
                  className="rounded-full px-2 py-0.5 text-xs font-medium"
                  style={{
                    backgroundColor: isActive ? activeBadgeBg : inactiveBadgeBg,
                    color: isActive ? activeBadgeText : inactiveBadgeText,
                  }}
                >
                  {tab.count}
                </span>
              )}
              {isActive && (
                <span
                  className="absolute bottom-0 left-0 right-0"
                  style={{
                    height: '2px',
                    backgroundColor: activeUnderlineColor,
                  }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

