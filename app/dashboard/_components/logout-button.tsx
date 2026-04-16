"use client";

import { LogOut } from "lucide-react";
import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";

export function LogoutButton() {
  return (
    <Button
      variant="ghost"
      size="icon"
      className="text-muted-foreground hover:bg-muted/50 hover:text-foreground h-8 w-8"
      onClick={() => signOut({ callbackUrl: "/login" })}
      title="Log out"
    >
      <LogOut className="h-4 w-4" />
      <span className="sr-only">Log out</span>
    </Button>
  );
}
