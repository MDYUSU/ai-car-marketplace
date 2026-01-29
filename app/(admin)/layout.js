import { notFound } from "next/navigation";
import { Sidebar } from "./admin/_components/sidebar";
import { auth } from "@clerk/nextjs/server";
import Header from "@/components/header";

export default async function AdminLayout({ children }) {
  // Check if user is authenticated
  const { userId } = await auth();
  if (!userId) {
    return notFound();
  }

  // Simple admin check (same as checkUser)
  const ADMIN_EMAILS = [
    "mdyusuf0210@gmail.com", // Add your admin email(s) here
  ];
  const TEMP_ADMIN_OVERRIDE = true; // Temporary override
  
  // For now, we'll skip the email check and use the override
  const isAdmin = TEMP_ADMIN_OVERRIDE;

  if (!isAdmin) {
    return notFound();
  }

  return (
    <div className="h-full">
      <Header isAdminPage={true} />
      <div className="flex h-full w-56 flex-col top-20 fixed inset-y-0 z-50">
        <Sidebar />
      </div>
      <main className="md:pl-56 pt-[80px] h-full">{children}</main>
    </div>
  );
}
