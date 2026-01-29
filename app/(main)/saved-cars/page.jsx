import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Saved Cars | Vehiql",
  description: "Your saved car listings",
};

export default async function SavedCarsPage() {
  // Check authentication
  const { userId } = await auth();
  if (!userId) {
    redirect("/sign-in?redirect=/saved-cars");
  }

  return (
    <div className="container mx-auto px-4 py-12">
      <h1 className="text-6xl mb-6 gradient-title">Saved Cars</h1>
      <div className="text-center py-12">
        <p className="text-gray-500 mb-4">
          Saved cars feature coming soon!
        </p>
        <a 
          href="/cars" 
          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Browse Cars
        </a>
      </div>
    </div>
  );
}
