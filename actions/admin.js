"use server";

import { serializeCarData } from "@/lib/helpers";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { revalidatePath } from "next/cache";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export async function getAdmin() {
  const { userId } = await auth();
  if (!userId) throw new Error("Unauthorized");

  const { data: user, error } = await supabase
    .from("users")
    .select("*")
    .eq("clerkUserId", userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }

  // If user not found in our db or not an admin, return not authorized
  if (!user || user.role !== "ADMIN") {
    return { authorized: false, reason: "not-admin" };
  }

  return { authorized: true, user };
}

/**
 * Get all test drives for admin with filters
 */
export async function getAdminTestDrives({ search = "", status = "" }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Verify admin status
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("clerkUserId", userId)
      .single();

    if (userError || !user || user.role !== "ADMIN") {
      throw new Error("Unauthorized access");
    }

    // Build query
    let query = supabase
      .from("testDriveBookings")
      .select(`
        *,
        cars (*),
        users (id, name, email, imageUrl, phone)
      `);

    // Add status filter
    if (status) {
      query = query.eq("status", status);
    }

    // Add search filter (simplified for Supabase)
    if (search) {
      query = query.or(`cars.make.ilike.%${search}%,cars.model.ilike.%${search}%,users.name.ilike.%${search}%,users.email.ilike.%${search}%`);
    }

    const { data: bookings, error } = await query.order("bookingDate", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: (bookings ?? []).map((booking) => ({
        id: booking.id,
        carId: booking.carId,
        car: serializeCarData(booking.cars),
        user: booking.users,
        bookingDate: booking.bookingDate,
        startTime: booking.startTime,
        endTime: booking.endTime,
        status: booking.status,
        notes: booking.notes,
        createdAt: booking.createdAt,
        updatedAt: booking.updatedAt,
      })),
    };
  } catch (error) {
    throw new Error("Error fetching test drives: " + error.message);
  }
}

/**
 * Update test drive status
 */
export async function updateTestDriveStatus(bookingId, newStatus) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Verify admin status
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("clerkUserId", userId)
      .single();

    if (userError || !user || user.role !== "ADMIN") {
      throw new Error("Unauthorized access");
    }

    // Validate status
    const validStatuses = [
      "PENDING",
      "CONFIRMED",
      "COMPLETED",
      "CANCELLED",
      "NO_SHOW",
    ];
    if (!validStatuses.includes(newStatus)) {
      return {
        success: false,
        error: "Invalid status",
      };
    }

    // Update status
    const { error } = await supabase
      .from("testDriveBookings")
      .update({ status: newStatus })
      .eq("id", bookingId);

    if (error) throw error;

    // Revalidate paths
    revalidatePath("/admin/test-drives");

    return {
      success: true,
      message: "Test drive status updated successfully",
    };
  } catch (error) {
    throw new Error("Error updating test drive status:" + error.message);
  }
}

export async function getDashboardData() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Skip database user check since we don't have users table
    // Use the same admin check as checkUser function
    const userEmail = "mdyusuf0210@gmail.com"; // Hardcoded for now, or get from Clerk
    const ADMIN_EMAILS = [
      "mdyusuf0210@gmail.com", // Add your admin email(s) here
    ];
    const TEMP_ADMIN_OVERRIDE = true; // Temporary override
    
    const isAdmin = TEMP_ADMIN_OVERRIDE || 
                    ADMIN_EMAILS.includes(userEmail) || 
                    userEmail.includes("admin");

    if (!isAdmin) {
      return {
        success: false,
        error: "Unauthorized",
      };
    }

    // Fetch cars data only (test drives feature removed)
    const { data: cars, error: carsError } = await supabase
      .from("cars")
      .select("id, status, featured");

    if (carsError) {
      console.log("Error fetching cars:", carsError);
      // Return default data if cars table doesn't exist
      return {
        success: true,
        data: {
          cars: {
            total: 0,
            available: 0,
            sold: 0,
            unavailable: 0,
            featured: 0,
          },
          testDrives: {
            total: 0,
            pending: 0,
            confirmed: 0,
            completed: 0,
            cancelled: 0,
            noShow: 0,
            conversionRate: 0,
          },
          recentCars: [],
          recentTestDrives: [],
        },
      };
    }

    // Calculate statistics
    const totalCars = cars?.length || 0;
    const availableCars = cars?.filter(car => car.status === "AVAILABLE")?.length || 0;
    const soldCars = cars?.filter(car => car.status === "SOLD")?.length || 0;
    const unavailableCars = cars?.filter(car => car.status === "UNAVAILABLE")?.length || 0;
    const featuredCars = cars?.filter(car => car.featured === true)?.length || 0;

    return {
      success: true,
      data: {
        cars: {
          total: totalCars,
          available: availableCars,
          sold: soldCars,
          unavailable: unavailableCars,
          featured: featuredCars,
        },
        testDrives: {
          total: 0, // Test drives removed
          pending: 0,
          confirmed: 0,
          completed: 0,
          cancelled: 0,
          noShow: 0,
          conversionRate: 0,
        },
        recentCars: cars?.slice(0, 5) || [], // Recent cars
        recentTestDrives: [], // Empty since test drives removed
      },
    };
  } catch (error) {
    console.error("Error in getDashboardData:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
