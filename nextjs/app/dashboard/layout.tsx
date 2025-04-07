import { AppSidebar } from "@/components/dashboard/app-sidebar";
import {
  SidebarInset,
  SidebarProvider,
} from "@/components/ui/sidebar";
import { SessionProvider } from "next-auth/react";
import {Toaster} from "sonner";

export default function DashboardLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
      <SidebarProvider>
      <SessionProvider>
        <AppSidebar />
      <SidebarInset>
        {children}
        <Toaster />
      </SidebarInset>
      </SessionProvider>
    </SidebarProvider>
  );
}

