import { currentUser } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

// List of admin emails (you can update this)
const ADMIN_EMAILS = [
  // Add your admin email(s) here
  // "your-email@example.com"
];

// Temporary: Make first user admin for testing (remove this in production)
const TEMP_ADMIN_OVERRIDE = true;

export const checkUser = async () => {
  const user = await currentUser();

  if (!user) {
    return null;
  }

  const userEmail = user.emailAddresses?.[0]?.emailAddress || "";
  
  // Check if user is admin by email or hardcoded list
  const isAdmin = TEMP_ADMIN_OVERRIDE || 
                  ADMIN_EMAILS.includes(userEmail) || 
                  userEmail.includes("admin") || 
                  user.publicMetadata?.role === "ADMIN";

  console.log("User email:", userEmail);
  console.log("Is admin:", isAdmin);
  console.log("TEMP_ADMIN_OVERRIDE:", TEMP_ADMIN_OVERRIDE);

  try {
    // Try to get user from database
    const { data: loggedInUser, error: fetchError } = await supabase
      .from("users")
      .select("*")
      .eq("clerkUserId", user.id)
      .single();

    if (fetchError && fetchError.code !== 'PGRST116') {
      // If table doesn't exist or other error, return basic user info
      console.log("Database error, returning basic user info:", fetchError.message);
      return {
        id: user.id,
        clerkUserId: user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
        email: userEmail,
        imageUrl: user.imageUrl,
        role: isAdmin ? "ADMIN" : "USER", // Use admin check
      };
    }

    if (loggedInUser) {
      // Update role if admin check differs from database
      if (isAdmin && loggedInUser.role !== "ADMIN") {
        try {
          await supabase
            .from("users")
            .update({ role: "ADMIN" })
            .eq("clerkUserId", user.id);
          loggedInUser.role = "ADMIN";
        } catch (updateError) {
          console.log("Could not update role in database:", updateError.message);
        }
      }
      return loggedInUser;
    }

    // Create user if doesn't exist
    const name = `${user.firstName} ${user.lastName}`;
    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert({
        clerkUserId: user.id,
        name,
        imageUrl: user.imageUrl,
        email: userEmail,
        role: isAdmin ? "ADMIN" : "USER",
      })
      .select()
      .single();

    if (createError) {
      console.log("Error creating user, returning basic info:", createError.message);
      return {
        id: user.id,
        clerkUserId: user.id,
        name,
        email: userEmail,
        imageUrl: user.imageUrl,
        role: isAdmin ? "ADMIN" : "USER",
      };
    }

    return newUser;
  } catch (error) {
    console.log("Error in checkUser:", error.message);
    return {
      id: user.id,
      clerkUserId: user.id,
      name: `${user.firstName || ""} ${user.lastName || ""}`.trim() || "User",
      email: userEmail,
      imageUrl: user.imageUrl,
      role: isAdmin ? "ADMIN" : "USER",
    };
  }
};
