"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useRouter } from "next/navigation";

export function HomeSearch() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  // Handle text search submissions
  const handleTextSearch = (e) => {
    e.preventDefault();
    if (!searchTerm.trim()) {
      return;
    }

    router.push(`/cars?search=${encodeURIComponent(searchTerm)}`);
  };

  return (
    <div>
      <form onSubmit={handleTextSearch}>
        <div className="relative flex items-center">
          <Search className="absolute left-3 w-5 h-5" />
          <Input
            type="text"
            placeholder="Enter make, model, or search term..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-12 py-6 w-full rounded-full border-gray-300 bg-white/95 backdrop-blur-sm"
          />

          <Button type="submit" className="absolute right-2 rounded-full">
            Search
          </Button>
        </div>
      </form>
    </div>
  );
}
