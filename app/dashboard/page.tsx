import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ListMusic, Music, Disc3 } from "lucide-react";
import Link from "next/link";

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  const quickLinks = [
    {
      href: "/dashboard/artists",
      icon: Disc3,
      label: "Artists",
      description: "Manage your band's artists",
    },
    {
      href: "/dashboard/songs",
      icon: Music,
      label: "Songs",
      description: "Add and organize your repertoire",
    },
    {
      href: "/dashboard/setlists",
      icon: ListMusic,
      label: "Setlists",
      description: "Build and manage your setlists",
    },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">
          Welcome back,{" "}
          <span className="text-foreground font-medium">
            {session?.user?.name}
          </span>
          !
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        {quickLinks.map(({ href, icon: Icon, label, description }) => (
          <Link key={href} href={href}>
            <Card className="hover:border-primary/50 h-full cursor-pointer transition-colors hover:shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Icon className="text-primary h-5 w-5" />
                  {label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm">{description}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
