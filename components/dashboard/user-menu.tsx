"use client";

import React from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { signOut, useSession } from "@/lib/auth-client";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useRouter } from "next/navigation";
import {
  filterMenuItemsByPermission,
  userMenuItems,
  ModulePermission,
} from "@/lib/menu-config";

interface UserMenuProps {
  accessibleModules: ModulePermission[];
}

export default function UserMenu({ accessibleModules }: UserMenuProps) {
  const { data: session } = useSession();
  const router = useRouter();
  const user = session?.user;
  const name = user?.name || "User";
  const image = user?.image;

  // Filter user menu items based on permissions
  const filteredItems = filterMenuItemsByPermission(
    userMenuItems,
    accessibleModules
  );

  // Handle menu item click
  const handleMenuItemClick = (item: (typeof filteredItems)[number]) => {
    if (item.onClick) {
      item.onClick();
    } else if (item.href) {
      router.push(item.href);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="flex items-center gap-2 rounded px-2 py-1 hover:bg-accent hover:text-accent-foreground outline-none focus:outline-none">
          <Avatar>
            {image ? (
              <AvatarImage src={image} alt={name} />
            ) : (
              <AvatarFallback>{name.charAt(0)}</AvatarFallback>
            )}
          </Avatar>
          <span className="text-sm font-medium">{name}</span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {filteredItems.length > 0 && (
          <>
            {filteredItems.map((item, index) => (
              <DropdownMenuItem
                key={index}
                onClick={() => handleMenuItemClick(item)}
                className="flex items-center cursor-pointer"
                data-variant={item.variant}
              >
                {item.icon}
                {item.title}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
          </>
        )}
        <DropdownMenuItem
          onSelect={async () => {
            await signOut();
            window.location.reload();
          }}
          data-variant="destructive"
        >
          Logout
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
