"use client";

import { Button } from "@/components/ui/button";
import { PenSquare, Menu } from "lucide-react";
import { ThemeToggle } from "./theme-toggle";
import { useSidebar } from "@/hooks/use-sidebar";

type AppHeaderProps = {
  onNewArtifact: () => void;
};

export default function AppHeader({ onNewArtifact }: AppHeaderProps) {
  const { setIsOpen, toggle } = useSidebar();

  return (
    <header className="flex items-center justify-between p-4 border-b shrink-0 bg-background h-16">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(true)}
          className="md:hidden"
          aria-label="Open sidebar"
        >
          <Menu />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggle}
          className="hidden md:flex"
          aria-label="Toggle sidebar"
        >
          <Menu />
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <ThemeToggle />
        <Button onClick={onNewArtifact} variant="outline">
          <PenSquare className="mr-2 h-4 w-4" />
          Create Artifact
        </Button>
      </div>
    </header>
  );
}
