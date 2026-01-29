"use server";

import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ================================================= */
/* SERIALIZER */
/* ================================================= */
function serializeCarData(car) {
  return {
    ...car,
    price: car.price ? Number(car.price) : 0,
    // Database uses camelCase - handle safely
    createdAt: car.createdAt ?? null,
    updatedAt: car.updatedAt ?? null,
  };
}

/* ================================================= */
/* GET FEATURED CARS */
/* ================================================= */
export async function getFeaturedCars(limit = 3) {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("featured", true)
    .eq("status", "AVAILABLE")
    .order("createdAt", { ascending: false })
    .limit(limit);

  if (error) {
    console.error(error);
    throw new Error("Error fetching featured cars");
  }

  return (data ?? []).map(serializeCarData);
}
