"use client";

import { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { toast } from "sonner";
import { ImagePlus, Loader2, X } from "lucide-react";
import { useDropzone } from "react-dropzone";

import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { getCarById, updateCar } from "@/actions/cars";
import useFetch from "@/hooks/use-fetch";
import Image from "next/image";

// Predefined options
const fuelTypes = ["Petrol", "Diesel", "Electric", "Hybrid", "Plug-in Hybrid"];
const transmissions = ["Automatic", "Manual", "Semi-Automatic"];
const bodyTypes = [
  "SUV",
  "Sedan",
  "Hatchback",
  "Convertible",
  "Coupe",
  "Wagon",
  "Pickup",
];
const carStatuses = ["AVAILABLE", "UNAVAILABLE", "SOLD"];

// Define form schema with Zod
const carFormSchema = z.object({
  make: z.string().min(1, "Make is required"),
  model: z.string().min(1, "Model is required"),
  year: z.string().refine((val) => {
    const year = parseInt(val);
    return !isNaN(year) && year >= 1900 && year <= new Date().getFullYear() + 1;
  }, "Valid year required"),
  price: z.string().min(1, "Price is required"),
  mileage: z.string().min(1, "Mileage is required"),
  color: z.string().min(1, "Color is required"),
  fuelType: z.string().min(1, "Fuel type is required"),
  transmission: z.string().min(1, "Transmission is required"),
  bodyType: z.string().min(1, "Body type is required"),
  seats: z.string().optional(),
  description: z.string().min(10, "Description must be at least 10 characters"),
  status: z.enum(["AVAILABLE", "UNAVAILABLE", "SOLD"]),
  featured: z.boolean().default(false),
  // Images are handled separately
});

export const EditCarForm = ({ carId }) => {
  const router = useRouter();
  const [uploadedImages, setUploadedImages] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [imageError, setImageError] = useState("");
  const [updateCarLoading, setUpdateCarLoading] = useState(false);

  // Initialize form with react-hook-form and zod
  const {
    register,
    setValue,
    getValues,
    formState: { errors },
    handleSubmit,
    watch,
    reset,
  } = useForm({
    resolver: zodResolver(carFormSchema),
    defaultValues: {
      make: "",
      model: "",
      year: "",
      price: "",
      mileage: "",
      color: "",
      fuelType: "",
      transmission: "",
      bodyType: "",
      seats: "",
      description: "",
      status: "AVAILABLE",
      featured: false,
    },
  });

  // Fetch car data and populate form
  const {
    loading: loadingCar,
    fn: fetchCar,
    data: carData,
    error: carError,
  } = useFetch(getCarById);

  useEffect(() => {
    fetchCar(carId);
  }, [carId]);

  useEffect(() => {
    if (carData?.success && carData.data) {
      const car = carData.data;
      
      // Populate form fields
      reset({
        make: car.make || "",
        model: car.model || "",
        year: car.year?.toString() || "",
        price: car.price?.toString() || "",
        mileage: car.mileage?.toString() || "",
        color: car.color || "",
        fuelType: car.fuelType || "",
        transmission: car.transmission || "",
        bodyType: car.bodyType || "",
        seats: car.seats?.toString() || "",
        description: car.description || "",
        status: car.status || "AVAILABLE",
        featured: car.featured || false,
      });

      // Set existing images
      setUploadedImages(car.images || []);
    }
  }, [carData, reset]);

  useEffect(() => {
    if (carError) {
      toast.error("Failed to load car data");
      router.push("/admin/cars");
    }
  }, [carError, router]);

  // Handle multiple image uploads with Dropzone
  const onMultiImagesDrop = useCallback(async (acceptedFiles) => {
    const validFiles = acceptedFiles.filter((file) => {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} exceeds 5MB limit and will be skipped`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    // Simulate upload progress
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      setUploadProgress(progress);

      if (progress >= 100) {
        clearInterval(interval);
      }
    }, 200);

    try {
      // Upload each file to Cloudinary
      const uploadPromises = validFiles.map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const response = await fetch('/api/upload', {
          method: 'POST',
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Failed to upload ${file.name}`);
        }

        const result = await response.json();
        return result.url;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      
      setUploadedImages((prev) => [...prev, ...uploadedUrls]);
      setUploadProgress(0);
      setImageError("");
      toast.success(`Successfully uploaded ${validFiles.length} images`);
    } catch (error) {
      console.error('Upload error:', error);
      setUploadProgress(0);
      toast.error('Failed to upload images');
    }
  }, []);

  const {
    getRootProps: getMultiImageRootProps,
    getInputProps: getMultiImageInputProps,
  } = useDropzone({
    onDrop: onMultiImagesDrop,
    accept: {
      "image/*": [".jpeg", ".jpg", ".png", ".webp"],
    },
    multiple: true,
  });

  // Remove image from upload preview
  const removeImage = (index) => {
    setUploadedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data) => {
    if (uploadedImages.length === 0) {
      setImageError("Please upload at least one image");
      return;
    }

    const carData = {
      ...data,
      year: parseInt(data.year),
      price: parseFloat(data.price),
      mileage: parseInt(data.mileage),
      seats: data.seats ? parseInt(data.seats) : null,
    };

    try {
      setUpdateCarLoading(true);

      const result = await updateCar(carId, {
        carData,
        images: uploadedImages,
      });

      if (result?.success) {
        toast.success("Car updated successfully");
        router.push("/admin/cars");
      } else {
        toast.error(result?.error || "Failed to update car");
      }
    } catch (err) {
      toast.error(err.message);
    } finally {
      setUpdateCarLoading(false);
    }
  };

  if (loadingCar) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="mt-6">
      <Card>
        <CardHeader>
          <CardTitle>Edit Car Details</CardTitle>
          <CardDescription>
            Update the details of this car.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {/* Make */}
              <div className="space-y-2">
                <Label htmlFor="make">Make</Label>
                <Input
                  id="make"
                  {...register("make")}
                  placeholder="e.g. Toyota"
                  className={errors.make ? "border-red-500" : ""}
                />
                {errors.make && (
                  <p className="text-xs text-red-500">
                    {errors.make.message}
                  </p>
                )}
              </div>

              {/* Model */}
              <div className="space-y-2">
                <Label htmlFor="model">Model</Label>
                <Input
                  id="model"
                  {...register("model")}
                  placeholder="e.g. Camry"
                  className={errors.model ? "border-red-500" : ""}
                />
                {errors.model && (
                  <p className="text-xs text-red-500">
                    {errors.model.message}
                  </p>
                )}
              </div>

              {/* Year */}
              <div className="space-y-2">
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  {...register("year")}
                  placeholder="e.g. 2022"
                  className={errors.year ? "border-red-500" : ""}
                />
                {errors.year && (
                  <p className="text-xs text-red-500">
                    {errors.year.message}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="space-y-2">
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  {...register("price")}
                  placeholder="e.g. 25000"
                  className={errors.price ? "border-red-500" : ""}
                />
                {errors.price && (
                  <p className="text-xs text-red-500">
                    {errors.price.message}
                  </p>
                )}
              </div>

              {/* Mileage */}
              <div className="space-y-2">
                <Label htmlFor="mileage">Mileage</Label>
                <Input
                  id="mileage"
                  {...register("mileage")}
                  placeholder="e.g. 15000"
                  className={errors.mileage ? "border-red-500" : ""}
                />
                {errors.mileage && (
                  <p className="text-xs text-red-500">
                    {errors.mileage.message}
                  </p>
                )}
              </div>

              {/* Color */}
              <div className="space-y-2">
                <Label htmlFor="color">Color</Label>
                <Input
                  id="color"
                  {...register("color")}
                  placeholder="e.g. Black"
                  className={errors.color ? "border-red-500" : ""}
                />
                {errors.color && (
                  <p className="text-xs text-red-500">
                    {errors.color.message}
                  </p>
                )}
              </div>

              {/* Fuel Type */}
              <div className="space-y-2">
                <Label htmlFor="fuelType">Fuel Type</Label>
                <Select
                  value={watch("fuelType")}
                  onValueChange={(value) => setValue("fuelType", value)}
                >
                  <SelectTrigger
                    className={errors.fuelType ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select fuel type" />
                  </SelectTrigger>
                  <SelectContent>
                    {fuelTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.fuelType && (
                  <p className="text-xs text-red-500">
                    {errors.fuelType.message}
                  </p>
                )}
              </div>

              {/* Transmission */}
              <div className="space-y-2">
                <Label htmlFor="transmission">Transmission</Label>
                <Select
                  value={watch("transmission")}
                  onValueChange={(value) => setValue("transmission", value)}
                >
                  <SelectTrigger
                    className={errors.transmission ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select transmission" />
                  </SelectTrigger>
                  <SelectContent>
                    {transmissions.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.transmission && (
                  <p className="text-xs text-red-500">
                    {errors.transmission.message}
                  </p>
                )}
              </div>

              {/* Body Type */}
              <div className="space-y-2">
                <Label htmlFor="bodyType">Body Type</Label>
                <Select
                  value={watch("bodyType")}
                  onValueChange={(value) => setValue("bodyType", value)}
                >
                  <SelectTrigger
                    className={errors.bodyType ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select body type" />
                  </SelectTrigger>
                  <SelectContent>
                    {bodyTypes.map((type) => (
                      <SelectItem key={type} value={type}>
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.bodyType && (
                  <p className="text-xs text-red-500">
                    {errors.bodyType.message}
                  </p>
                )}
              </div>

              {/* Seats */}
              <div className="space-y-2">
                <Label htmlFor="seats">Seats</Label>
                <Input
                  id="seats"
                  type="number"
                  {...register("seats")}
                  placeholder="e.g. 5"
                  className={errors.seats ? "border-red-500" : ""}
                />
                {errors.seats && (
                  <p className="text-xs text-red-500">
                    {errors.seats.message}
                  </p>
                )}
              </div>

              {/* Status */}
              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch("status")}
                  onValueChange={(value) => setValue("status", value)}
                >
                  <SelectTrigger
                    className={errors.status ? "border-red-500" : ""}
                  >
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {carStatuses.map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.status && (
                  <p className="text-xs text-red-500">
                    {errors.status.message}
                  </p>
                )}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                {...register("description")}
                placeholder="Enter a detailed description of the car..."
                rows={4}
                className={errors.description ? "border-red-500" : ""}
              />
              {errors.description && (
                <p className="text-xs text-red-500">
                  {errors.description.message}
                </p>
              )}
            </div>

            {/* Featured Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="featured"
                checked={watch("featured")}
                onCheckedChange={(checked) => setValue("featured", checked)}
              />
              <Label htmlFor="featured">Featured Car</Label>
            </div>

            {/* Image Upload */}
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-4">
                  Upload Images ({uploadedImages.length})
                </h3>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                  <div {...getMultiImageRootProps()} className="cursor-pointer">
                    <input {...getMultiImageInputProps()} />
                    <div className="text-center">
                      <ImagePlus className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="mt-4">
                        <label
                          htmlFor="file-upload"
                          className="cursor-pointer"
                        >
                          <span className="mt-2 block text-sm font-medium text-gray-900">
                            Click to upload or drag and drop
                          </span>
                          <span className="mt-1 block text-xs text-gray-500">
                            PNG, JPG, GIF up to 5MB each
                          </span>
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Upload Progress */}
              {uploadProgress > 0 && (
                <div className="w-full bg-gray-200 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300"
                    style={{ width: `${uploadProgress}%` }}
                  ></div>
                </div>
              )}

              {/* Image Error */}
              {imageError && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
                  {imageError}
                </div>
              )}

              {/* Uploaded Images Preview */}
              {uploadedImages.length > 0 && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">
                    Uploaded Images ({uploadedImages.length})
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                    {uploadedImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <Image
                          src={image}
                          alt={`Car image ${index + 1}`}
                          width={100}
                          height={100}
                          className="object-cover rounded-lg group-hover:opacity-75 transition duration-300"
                        />
                        <button
                          type="button"
                          onClick={() => removeImage(index)}
                          className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition duration-300"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push("/admin/cars")}
                disabled={updateCarLoading}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="w-full sm:w-auto"
                disabled={updateCarLoading}
              >
                {updateCarLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating Car...
                  </>
                ) : (
                  "Update Car"
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};
