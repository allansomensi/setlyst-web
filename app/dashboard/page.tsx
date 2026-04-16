"use client";

import { useSession, signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut } from "lucide-react";

export default function DashboardPage() {
  const { data: session } = useSession();

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>

        <Button
          variant="outline"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign out
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Welcome back, {session?.user?.name}!</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You are logged in with role:{" "}
            <span className="text-foreground font-medium capitalize">
              {session?.user?.role}
            </span>
            .
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
