
"use client";

import { usePathname, useRouter } from "next/navigation";
import {
  Compass,
  Book,
  LogOut,
  User as UserIcon,
  Repeat,
  Zap,
  BookCopy,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { useSidebar } from "@/hooks/use-sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { href: "/", label: "Mind Atlas", icon: Compass },
  { href: "/artifacts", label: "Artifacts", icon: BookCopy },
  { href: "/habits", label: "Habit Loops", icon: Repeat },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isExpanded } = useSidebar();
  const { user, loading, signOut } = useAuth();

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col shrink-0 bg-card border-r fixed h-full z-20 transition-all duration-300 ease-in-out",
        isExpanded ? "w-64" : "w-20"
      )}
      aria-label="Main navigation"
    >
      <div className="flex-1 flex flex-col">
        <div
          className={cn(
            "flex items-center border-b h-16",
            isExpanded ? "px-6" : "px-4 justify-center"
          )}
        >
          <Book
            className={cn("h-8 w-8 text-primary", !isExpanded && "h-6 w-6")}
          />
          {isExpanded && (
            <span className="ml-3 text-xl font-bold">Mind Weaver</span>
          )}
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Button
                key={href}
                variant={isActive ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start",
                  !isExpanded && "justify-center"
                )}
                onClick={() => router.push(href)}
              >
                <Icon className={cn("h-5 w-5", isExpanded && "mr-3")} />
                {isExpanded && <span className="truncate">{label}</span>}
              </Button>
            );
          })}
        </nav>
      </div>

      <div className="border-t p-4">
        {user && !loading ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className={cn(
                  "w-full h-14 justify-start",
                  !isExpanded && "justify-center"
                )}
              >
                <Avatar className="h-9 w-9">
                  <AvatarImage
                    src={user.photoURL ?? ""}
                    alt={user.displayName ?? ""}
                  />
                  <AvatarFallback>
                    {user.displayName?.charAt(0).toUpperCase() ??
                      user.email?.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                {isExpanded && (
                  <div className="ml-3 text-left leading-tight truncate">
                    <p className="font-semibold truncate">
                      {user.displayName ?? "User"}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {user.email}
                    </p>
                  </div>
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" side="right" sideOffset={12}>
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push("/profile")}>
                <UserIcon className="mr-2 h-4 w-4" />
                <span>Profile</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={signOut}>
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sign Out</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </aside>
  );
}

export function MobileSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, setIsOpen } = useSidebar();
  const { signOut } = useAuth();

  const handleLinkClick = (href: string) => {
    router.push(href);
    setIsOpen(false);
  };

  return (
    <>
      {/* Overlay */}
      <div
        className={cn(
          "fixed inset-0 z-30 bg-black/60 transition-opacity md:hidden",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />
      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-full w-64 bg-card z-40 transition-transform duration-300 ease-in-out md:hidden flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Main navigation"
      >
        <div className="flex items-center px-6 border-b h-16">
          <Book className="h-8 w-8 text-primary" />
          <span className="ml-3 text-xl font-bold">Mind Weaver</span>
        </div>

        <nav className="flex-1 px-4 py-6 space-y-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Button
                key={href}
                variant={isActive ? "secondary" : "ghost"}
                className="w-full justify-start"
                onClick={() => handleLinkClick(href)}
              >
                <Icon className="h-5 w-5 mr-3" />
                <span className="truncate">{label}</span>
              </Button>
            );
          })}
        </nav>
        <div className="border-t p-4 mt-auto">
           <Button variant="ghost" className="w-full justify-start" onClick={() => {
              signOut();
              setIsOpen(false);
           }}>
                <LogOut className="h-5 w-5 mr-3" />
                <span>Sign Out</span>
            </Button>
        </div>
      </aside>
    </>
  );
}
