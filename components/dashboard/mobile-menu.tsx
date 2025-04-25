"use client";

import { useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { Menu, X, Home } from "lucide-react";
import { cn } from "@/lib/utils";
import { useNavigation } from "@/components/ui/navigation-context";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { sidebarItems } from "@/components/dashboard/sidebar";

export function MobileMenu() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { startNavigation } = useNavigation();

  // Handle navigation with progress indicator
  const handleNavigation = (href: string, e: React.MouseEvent) => {
    e.preventDefault();
    if (pathname !== href) {
      startNavigation(href);
      router.push(href);
      setOpen(false);
    } else {
      setOpen(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="lg:hidden">
          <Menu className="h-5 w-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-72 p-0">
        <SheetHeader className="border-b p-4">
          <SheetTitle className="flex items-center gap-2">
            <Home className="h-5 w-5" />
            <Link
              href="/dashboard"
              onClick={(e) => handleNavigation("/dashboard", e)}
              className="flex items-center gap-2 font-semibold"
            >
              Integrisoft
            </Link>
          </SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-0.5 p-4">
          {sidebarItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={(e) => handleNavigation(item.href, e)}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2 text-foreground/70 hover:bg-accent/10 hover:text-foreground text-left",
                pathname === item.href &&
                  "bg-accent/10 text-foreground font-medium"
              )}
            >
              {item.icon}
              <span>{item.title}</span>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  );
}
