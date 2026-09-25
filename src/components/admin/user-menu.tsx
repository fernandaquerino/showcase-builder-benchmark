"use client";

import { LogOut, Palette } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useEffect, useRef } from "react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

type UserMenuProps = {
  name: string;
  email: string;
  image?: string | null;
};

export function UserMenu({ name, email, image }: UserMenuProps) {
  const pathname = usePathname();
  // After navigating from the menu, move focus to the new page's heading so
  // keyboard and screen-reader users start at the top of the new content.
  const focusHeadingRef = useRef(false);

  useEffect(() => {
    if (!focusHeadingRef.current) {
      return;
    }

    const heading = document.querySelector<HTMLElement>("main h1, main h2");
    if (heading) {
      heading.tabIndex = -1;
      heading.focus();
    }
  }, [pathname]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="rounded-full focus-visible:outline-2 focus-visible:outline-offset-2"
        aria-label="Abrir menu do usuário"
      >
        <Avatar>
          {image && <AvatarImage src={image} alt="" />}
          <AvatarFallback>{getInitials(name)}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        onCloseAutoFocus={(event) => {
          if (focusHeadingRef.current) {
            event.preventDefault();
          }
        }}
      >
        <DropdownMenuLabel>
          <span className="block">{name}</span>
          <span className="block max-w-52 truncate text-xs font-normal text-muted-foreground">
            {email}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          asChild
          className="cursor-pointer gap-2"
          onSelect={() => {
            focusHeadingRef.current = true;
          }}
        >
          <Link href="/admin/appearance">
            <Palette className="size-4" aria-hidden="true" />
            Aparência da vitrine
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem
          className="cursor-pointer gap-2"
          onSelect={(event) => {
            event.preventDefault();
            void signOut({ redirectTo: "/" });
          }}
        >
          <LogOut className="size-4" aria-hidden="true" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
