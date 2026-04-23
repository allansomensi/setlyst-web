import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Activity,
  CheckCircle2,
  Database,
  Server,
  XCircle,
} from "lucide-react";
import { RefreshStatusButton } from "./_components/refresh-button";
import { ApiStatus } from "@/types/api";

async function fetchSystemStatus(): Promise<ApiStatus | null> {
  try {
    const baseUrl =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";
    const res = await fetch(`${baseUrl}/status`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      return null;
    }

    return await res.json();
  } catch (error) {
    console.error("Failed to fetch API status:", error);
    return null;
  }
}

export default async function StatusPage() {
  const statusData = await fetchSystemStatus();
  const isOperational = statusData !== null;

  const lastUpdated = statusData
    ? new Date(statusData.updated_at).toLocaleString()
    : "Unavailable";

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-12 sm:px-6 lg:px-8 dark:bg-neutral-950">
      <div className="mx-auto max-w-3xl space-y-8">
        {/* Header Section */}
        <div className="relative mb-12 flex flex-col items-center justify-center space-y-4 text-center">
          <div className="absolute top-0 right-0">
            <RefreshStatusButton />
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900 shadow-sm dark:bg-neutral-100">
            <Activity className="h-6 w-6 text-neutral-50 dark:text-neutral-900" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-50">
            System Status
          </h1>
          <p className="max-w-xl text-neutral-500 dark:text-neutral-400">
            Real-time monitoring of the Core API and Database infrastructure.
          </p>
        </div>

        {/* Global Status Banner */}
        <Card
          className={`border-l-4 ${
            isOperational
              ? "border-l-emerald-500 bg-emerald-50/50 dark:bg-emerald-500/5"
              : "border-l-red-500 bg-red-50/50 dark:bg-red-500/5"
          }`}
        >
          <CardHeader className="py-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              {isOperational ? (
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              ) : (
                <XCircle className="h-5 w-5 text-red-500" />
              )}
              {isOperational
                ? "All Systems Operational"
                : "Major System Outage"}
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Infrastructure Details */}
        <Card>
          <CardHeader>
            <CardTitle>Infrastructure Services</CardTitle>
            <CardDescription>
              Live metrics from the Axum backend and PostgreSQL.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {/* Core API Status */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
                  <Server className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div className="space-y-1">
                  <p className="leading-none font-medium text-neutral-900 dark:text-neutral-50">
                    Core API (Rust)
                  </p>
                  <p className="text-sm text-neutral-500 dark:text-neutral-400">
                    Primary backend services
                  </p>
                </div>
              </div>
              <div>
                {isOperational ? (
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                    Operational
                  </Badge>
                ) : (
                  <Badge variant="destructive">Offline</Badge>
                )}
              </div>
            </div>

            <Separator />

            {/* Database Status */}
            <div className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="rounded-lg bg-neutral-100 p-2 dark:bg-neutral-800">
                  <Database className="h-5 w-5 text-neutral-600 dark:text-neutral-300" />
                </div>
                <div className="space-y-1">
                  <p className="leading-none font-medium text-neutral-900 dark:text-neutral-50">
                    PostgreSQL Database
                  </p>
                  <p className="line-clamp-1 max-w-50 text-sm text-neutral-500 sm:max-w-full dark:text-neutral-400">
                    {isOperational
                      ? statusData.dependencies.database.version
                      : "Connection failed"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                {isOperational && (
                  <div className="hidden flex-col text-right font-mono text-sm text-neutral-500 sm:flex dark:text-neutral-400">
                    <span>
                      Pool:{" "}
                      {statusData.dependencies.database.opened_connections} /{" "}
                      {statusData.dependencies.database.max_connections}
                    </span>
                  </div>
                )}
                {isOperational ? (
                  <Badge className="border-emerald-500/20 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20">
                    Operational
                  </Badge>
                ) : (
                  <Badge variant="destructive">Offline</Badge>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="pt-8 text-center font-mono text-sm text-neutral-500">
          <p>UTC Timestamp: {statusData?.updated_at || "N/A"}</p>
          <p>Last checked: {lastUpdated}</p>
        </div>
      </div>
    </div>
  );
}
