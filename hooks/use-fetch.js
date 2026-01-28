import { useState } from "react";
import { toast } from "sonner";

const useFetch = (cb) => {
  const [data, setData] = useState(undefined);
  const [loading, setLoading] = useState(null);
  const [error, setError] = useState(null);

  const fn = async (...args) => {
    console.log("🚀 useFetch fn called with args:", args);
    setLoading(true);
    setError(null);

    try {
      console.log("📞 Calling server action...");
      const response = await cb(...args);
      console.log("✅ Server action response:", response);
      setData(response);
      setError(null);
    } catch (error) {
      console.error("❌ Server action error:", error);
      setError(error);
      toast.error(error.message);
    } finally {
      setLoading(false);
      console.log("🏁 useFetch fn completed");
    }
  };

  return { data, loading, error, fn, setData };
};

export default useFetch;
