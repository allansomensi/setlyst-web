"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Disc3, Home, Music } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { name: "Home", href: "/dashboard", icon: Home },
  { name: "Artists", href: "/dashboard/artists", icon: Disc3 },
  { name: "Songs", href: "/dashboard/songs", icon: Music },
];

export function SidebarLinks() {
  const pathname = usePathname();

  return (
    <nav className="flex-1 space-y-2 p-4">
      {navLinks.map((link) => {
        const Icon = link.icon;

        const isActive =
          link.href === "/dashboard"
            ? pathname === link.href
            : pathname.startsWith(link.href);

        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 transition-colors",
              isActive
                ? "bg-muted text-foreground font-medium"
                : "text-muted-foreground hover:bg-muted hover:text-foreground", // Estado Inativo
            )}
          >
            <Icon className="h-5 w-5" />
            {link.name}
          </Link>
        );
      })}
    </nav>
  );
}
