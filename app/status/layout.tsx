import { ThemeProvider } from "@/components/providers/theme_provider";
import { getNonce } from "@/lib/server/nonce";

export default async function StatusLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
      nonce={await getNonce()}
    >
      {children}
    </ThemeProvider>
  );
}
