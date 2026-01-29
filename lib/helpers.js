// Currency formatter
export const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
};

/* ================================================= */
/* SERIALIZER - COMPLETE REWRITE */
/* ================================================= */
export const serializeCarData = (car) => {
  return {
    ...car,
    price: car.price ? Number(car.price) : 0,
    // Database uses camelCase - handle safely
    createdAt: car.createdAt ?? null,
    updatedAt: car.updatedAt ?? null,
  };
};
