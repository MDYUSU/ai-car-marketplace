"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@clerk/nextjs/server";
import { serializeCarData } from "@/lib/helpers";
import cloudinary from "@/lib/cloudinary";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);


// =====================================================
// ADD CAR
// =====================================================
export async function addCar({ carData, images }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Validate that images are URLs (from Cloudinary)
    if (!images || images.length === 0) {
      throw new Error("No images provided");
    }

    // Verify images are valid URLs
    const validUrls = images.filter(url => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    });

    if (validUrls.length === 0) {
      throw new Error("No valid image URLs provided");
    }

    const carId = uuidv4();

    const { error } = await supabase
      .from("cars")
      .insert({
        id: carId,
        ...carData,
        images: validUrls, // Store Cloudinary URLs directly
      });

    if (error) throw error;

    revalidatePath("/admin/cars");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// =====================================================
// GET CARS
// =====================================================
export async function getCars(search = "") {
  try {
    let query = supabase.from("cars").select("*");

    if (search) {
      query = query.or(`make.ilike.%${search}%,model.ilike.%${search}%,color.ilike.%${search}%`);
    }

    const { data, error } = await query.order("createdAt", { ascending: false });

    if (error) throw error;

    return {
      success: true,
      data: (data ?? []).map(serializeCarData),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// =====================================================
// GET CAR BY ID
// =====================================================
export async function getCarById(id) {
  try {
    const { data, error } = await supabase
      .from("cars")
      .select("*")
      .eq("id", id)
      .single();

    if (error) throw error;

    return {
      success: true,
      data: serializeCarData(data),
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// =====================================================
// UPDATE CAR
// =====================================================
export async function updateCar(id, { carData, images }) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Verify images are valid URLs if provided
    let validUrls = images || [];
    if (validUrls.length > 0) {
      validUrls = validUrls.filter(url => {
        try {
          new URL(url);
          return true;
        } catch {
          return false;
        }
      });

      if (validUrls.length === 0) {
        throw new Error("No valid image URLs provided");
      }
    }

    const updateData = {
      ...carData,
      ...(validUrls.length > 0 && { images: validUrls }),
    };

    const { error } = await supabase
      .from("cars")
      .update(updateData)
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/cars");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}


// =====================================================
// DELETE CAR
// =====================================================
export async function deleteCar(id) {
  try {
    const { userId } = await auth();
    if (!userId) throw new Error("Unauthorized");

    // Get car data first to delete images from Cloudinary
    const { data: car, error: fetchError } = await supabase
      .from("cars")
      .select("images")
      .eq("id", id)
      .single();

    if (fetchError) throw fetchError;
    if (!car) return { success: false };

    // Delete images from Cloudinary
    if (car.images && car.images.length > 0) {
      const deletePromises = (car.images ?? []).map(async (imageUrl) => {
        try {
          // Extract public_id from Cloudinary URL
          // URL format: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/cars/filename.jpg
          const urlParts = imageUrl.split('/');
          const uploadIndex = urlParts.indexOf('upload');
          
          if (uploadIndex !== -1 && uploadIndex < urlParts.length - 1) {
            // Get everything after 'upload' including version and folders
            const pathWithVersion = urlParts.slice(uploadIndex + 1).join('/');
            
            // Remove version number if present (starts with v followed by digits)
            const publicId = pathWithVersion.replace(/^v\d+\//, '');
            
            // Remove file extension
            const publicIdWithoutExt = publicId.replace(/\.[^/.]+$/, '');
            
            // Delete from Cloudinary
            await cloudinary.uploader.destroy(publicIdWithoutExt);
            console.log(`Deleted Cloudinary image: ${publicIdWithoutExt}`);
          }
        } catch (error) {
          console.error(`Failed to delete Cloudinary image: ${imageUrl}`, error);
          // Continue with other images even if one fails
        }
      });

      await Promise.all(deletePromises);
    }

    // Delete car from database
    const { error } = await supabase
      .from("cars")
      .delete()
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/cars");

    return { success: true };
  } catch (error) {
    console.error("Delete car error:", error);
    return { success: false, error: error.message };
  }
}


// =====================================================
// UPDATE STATUS
// =====================================================
export async function updateCarStatus(id, { status, featured }) {
  try {
    const { error } = await supabase
      .from("cars")
      .update({ status, featured })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/admin/cars");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
