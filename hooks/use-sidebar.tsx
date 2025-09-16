"use client";

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from "react";
import { useIsMobile } from "./use-mobile";

interface SidebarContextType {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  isExpanded: boolean;
  setIsExpanded: (isExpanded: boolean) => void;
  toggle: () => void;
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined);

export function SidebarProvider({ children }: { children: ReactNode }) {
  const isMobile = useIsMobile();
  
  // State for mobile drawer
  const [isOpen, setIsOpen] = useState(false);
  // State for desktop collapsible sidebar
  const [isExpanded, setIsExpanded] = useState(true);

  // Set initial state based on device type once `isMobile` is determined
  useEffect(() => {
    if (isMobile) {
      setIsExpanded(false); 
      setIsOpen(false); 
    } else {
      setIsExpanded(true); 
      setIsOpen(false);
    }
  }, [isMobile]);

  const toggle = () => {
    if (isMobile) {
      setIsOpen(prev => !prev);
    } else {
      setIsExpanded(prev => !prev);
    }
  };

  const value = useMemo(
    () => ({
      isOpen, // For mobile
      setIsOpen,
      isExpanded, // For desktop
      setIsExpanded,
      toggle,
    }),
    [isOpen, isExpanded]
  );

  return (
    <SidebarContext.Provider value={value}>{children}</SidebarContext.Provider>
  );
}

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (context === undefined) {
    throw new Error("useSidebar must be used within a SidebarProvider");
  }
  return context;
}
