"use server";

import { revalidatePath } from "next/cache";
import { v4 as uuidv4 } from "uuid";
import { db } from "@/lib/prisma";
import { auth } from "@clerk/nextjs/server";
import { serializeCarData } from "@/lib/helpers";
import cloudinary from "@/lib/cloudinary";


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

    await db.car.create({
      data: {
        id: carId,
        ...carData,
        images: validUrls, // Store Cloudinary URLs directly
      },
    });

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
    const where = search
      ? {
          OR: [
            { make: { contains: search, mode: "insensitive" } },
            { model: { contains: search, mode: "insensitive" } },
            { color: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const cars = await db.car.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return {
      success: true,
      data: cars.map(serializeCarData),
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
    const car = await db.car.findUnique({
      where: { id },
    });

    if (!car) return { success: false, error: "Car not found" };

    return {
      success: true,
      data: serializeCarData(car),
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

    await db.car.update({
      where: { id },
      data: {
        ...carData,
        ...(validUrls.length > 0 && { images: validUrls }),
      },
    });

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

    const car = await db.car.findUnique({
      where: { id },
    });

    if (!car) return { success: false };

    // Delete images from Cloudinary
    if (car.images && car.images.length > 0) {
      const deletePromises = car.images.map(async (imageUrl) => {
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
    await db.car.delete({ where: { id } });

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
    await db.car.update({
      where: { id },
      data: { status, featured },
    });

    revalidatePath("/admin/cars");

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
