"use client";

import { Component, type ReactNode } from "react";

/**
 * The sidebar/mobile nav render outside the dashboard route's `error.tsx`
 * boundary (that one only wraps the page content, not the layout itself),
 * so a render error thrown by a component mounted here would otherwise take
 * down the entire app with no recovery UI. This isolates the notification
 * bell so a bad notification payload degrades to "nothing shown" instead of
 * a hard crash.
 */
export class NotificationBellErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[NotificationBell]", error);
    }
  }

  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
