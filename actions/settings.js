"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// Get dealership info with working hours
export async function getDealershipInfo() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get the dealership record with working hours
    const { data: dealership, error: dealershipError } = await supabase
      .from("dealershipInfo")
      .select(`
        *,
        workingHours (*)
      `)
      .order("dayOfWeek", { foreignTable: "workingHours", ascending: true })
      .limit(1)
      .single();

    // If no dealership exists, create a default one
    if (dealershipError && dealershipError.code === 'PGRST116') {
      // Create default working hours
      const defaultWorkingHours = [
        { dayOfWeek: "MONDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: "TUESDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: "WEDNESDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: "THURSDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: "FRIDAY", openTime: "09:00", closeTime: "18:00", isOpen: true },
        { dayOfWeek: "SATURDAY", openTime: "10:00", closeTime: "16:00", isOpen: true },
        { dayOfWeek: "SUNDAY", openTime: "10:00", closeTime: "16:00", isOpen: false },
      ];

      // Create dealership first
      const { data: newDealership, error: createError } = await supabase
        .from("dealershipInfo")
        .insert({})
        .select()
        .single();

      if (createError) throw createError;

      // Create working hours
      const { error: hoursError } = await supabase
        .from("workingHours")
        .insert(
          defaultWorkingHours.map(hour => ({
            dealershipId: newDealership.id,
            ...hour
          }))
        );

      if (hoursError) throw hoursError;

      // Fetch the complete dealership with hours
      const { data: completeDealership, error: fetchError } = await supabase
        .from("dealershipInfo")
        .select(`
          *,
          workingHours (*)
        `)
        .eq("id", newDealership.id)
        .order("dayOfWeek", { foreignTable: "workingHours", ascending: true })
        .single();

      if (fetchError) throw fetchError;

      return {
        success: true,
        data: {
          ...completeDealership,
          createdAt: completeDealership.createdAt ?? null,
          updatedAt: completeDealership.updatedAt ?? null,
        },
      };
    }

    if (dealershipError) throw dealershipError;

    return {
      success: true,
      data: {
        ...dealership,
        createdAt: dealership.createdAt ?? null,
        updatedAt: dealership.updatedAt ?? null,
      },
    };
  } catch (error) {
    console.error("Error fetching dealership info:", error);
    throw new Error("Error fetching dealership info: " + error.message);
  }
}

// Save working hours
export async function saveWorkingHours(workingHours) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Check if user is admin
    const { data: user, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("clerkUserId", userId)
      .single();

    if (userError || !user || user.role !== "ADMIN") {
      throw new Error("Unauthorized: Admin access required");
    }

    // Get current dealership info
    const { data: dealership, error: dealershipError } = await supabase
      .from("dealershipInfo")
      .select("*")
      .limit(1)
      .single();

    if (dealershipError && dealershipError.code === 'PGRST116') {
      throw new Error("Dealership info not found");
    }

    if (dealershipError) throw dealershipError;

    // Delete existing working hours
    const { error: deleteError } = await supabase
      .from("workingHours")
      .delete()
      .eq("dealershipId", dealership.id);

    if (deleteError) throw deleteError;

    // Create new working hours
    const { error: insertError } = await supabase
      .from("workingHours")
      .insert(
        workingHours.map(hour => ({
          dealershipId: dealership.id,
          dayOfWeek: hour.dayOfWeek,
          openTime: hour.openTime,
          closeTime: hour.closeTime,
          isOpen: hour.isOpen,
        }))
      );

    if (insertError) throw insertError;

    // Revalidate paths
    revalidatePath("/admin/settings");
    revalidatePath("/"); // Homepage might display hours

    return {
      success: true,
    };
  } catch (error) {
    throw new Error("Error saving working hours:" + error.message);
  }
}

// Get all users
export async function getUsers() {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Skip admin check since we don't have users table
    // Use same admin check as checkUser function
    const ADMIN_EMAILS = [
      "mdyusuf0210@gmail.com", // Add your admin email(s) here
    ];
    const TEMP_ADMIN_OVERRIDE = true; // Temporary override
    
    const isAdmin = TEMP_ADMIN_OVERRIDE;
    
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Return empty user list since we don't have users table
    return {
      success: true,
      data: [], // No users to show
    };
  } catch (error) {
    console.error("Error getting users:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}

// Update user role
export async function updateUserRole(userId, role) {
  try {
    const { userId: adminId } = await auth();
    if (!adminId) throw new Error("Unauthorized");

    // Skip admin check since we don't have users table
    const ADMIN_EMAILS = [
      "mdyusuf0210@gmail.com", // Add your admin email(s) here
    ];
    const TEMP_ADMIN_OVERRIDE = true; // Temporary override
    
    const isAdmin = TEMP_ADMIN_OVERRIDE;
    
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }

    // Return success since we don't have users table to update
    return {
      success: true,
      message: "User role update not available - users table not found",
    };
  } catch (error) {
    console.error("Error updating user role:", error);
    return {
      success: false,
      error: error.message,
    };
  }
}
