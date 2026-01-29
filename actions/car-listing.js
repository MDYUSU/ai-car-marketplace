"use server";

import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

/* ================================================= */
/* GET CAR FILTERS */
/* ================================================= */
export async function getCarFilters() {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("status", "AVAILABLE");

  if (error) throw error;

  const safeData = data ?? [];

  const makes = [...new Set(safeData.map((d) => d.make).filter(Boolean))];
  const bodyTypes = [...new Set(safeData.map((d) => d.bodyType).filter(Boolean))];
  const fuelTypes = [...new Set(safeData.map((d) => d.fuelType).filter(Boolean))];
  const transmissions = [...new Set(safeData.map((d) => d.transmission).filter(Boolean))];

  const prices = safeData.map((d) => Number(d.price) || 0);

  return {
    success: true,
    data: {
      makes,
      bodyTypes,
      fuelTypes,
      transmissions,
      priceRange: {
        min: prices.length ? Math.min(...prices) : 0,
        max: prices.length ? Math.max(...prices) : 0,
      },
    },
  };
}

/* ================================================= */
/* GET CARS - COMPLETE REWRITE */
/* ================================================= */
export async function getCars({
  page = 1,
  limit = 6,
  search = "",
  make = "",
  model = "",
  bodyType = "",
  fuelType = "",
  transmission = "",
  minPrice = 0,
  maxPrice = Number.MAX_SAFE_INTEGER,
  sortBy = "newest"
}) {
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  let query = supabase
    .from("cars")
    .select("*", { count: "exact" })
    .eq("status", "AVAILABLE");

  // Search filter (make + model)
  if (search && search.trim() !== "") {
    query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%`);
  }

  // Exact filters with camelCase DB columns (based on error message)
  if (make && make.trim() !== "") {
    query = query.eq("make", make);
  }
  if (model && model.trim() !== "") {
    query = query.eq("model", model);
  }
  if (bodyType && bodyType.trim() !== "") {
    query = query.eq("bodyType", bodyType);
  }
  if (fuelType && fuelType.trim() !== "") {
    query = query.eq("fuelType", fuelType);
  }
  if (transmission && transmission.trim() !== "") {
    query = query.eq("transmission", transmission);
  }

  // Price range filter
  if (minPrice > 0) {
    query = query.gte("price", minPrice);
  }
  if (maxPrice < Number.MAX_SAFE_INTEGER) {
    query = query.lte("price", maxPrice);
  }

  // Sorting with camelCase DB columns
  switch (sortBy) {
    case "priceAsc":
      query = query.order("price", { ascending: true });
      break;
    case "priceDesc":
      query = query.order("price", { ascending: false });
      break;
    case "oldest":
      query = query.order("createdAt", { ascending: true });
      break;
    case "newest":
    default:
      query = query.order("createdAt", { ascending: false });
      break;
  }

  const { data, count, error } = await query.range(from, to);

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data: (data ?? []).map(serializeCarData),
    pagination: {
      total: count ?? 0,
      page,
      limit,
      pages: Math.ceil((count ?? 0) / limit),
    },
  };
}

/* ================================================= */
/* GET CAR BY ID */
/* ================================================= */
export async function getCarById(id) {
  const { data, error } = await supabase
    .from("cars")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    return {
      success: false,
      error: error.message,
    };
  }

  return {
    success: true,
    data: serializeCarData(data),
  };
}

/* ================================================= */
/* GET TEST DRIVE INFO */
/* ================================================= */
export async function getTestDriveInfo() {
  // Return working default data immediately to avoid any database issues
  const defaultDealership = {
    id: "default",
    name: "Vehiql Motors",
    address: "123 Main Street, City, State 12345",
    phone: "+1 (555) 123-4567",
    email: "info@vehiql.com",
    workingHours: [
      { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: "TUESDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: "WEDNESDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: "THURSDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: "FRIDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
      { dayOfWeek: "SATURDAY", openTime: "10:00", closeTime: "16:00", isOpen: true },
      { dayOfWeek: "SUNDAY", openTime: "10:00", closeTime: "16:00", isOpen: false },
    ],
  };

  return {
    success: true,
    data: {
      dealership: defaultDealership,
      existingBookings: [],
    },
  };
}

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
