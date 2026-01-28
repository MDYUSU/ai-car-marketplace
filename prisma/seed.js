import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  await db.car.createMany({
    data: [
      {
        make: "Suzuki",
        model: "Swift",
        year: 2022,
        mileage: 15000,
        bodyType: "Hatchback",
        price: 7000,
        color: "White",
        fuelType: "Petrol",
        transmission: "Manual",
        featured: true,
        status: "AVAILABLE"
      },
      {
        make: "Hyundai",
        model: "Creta",
        year: 2023,
        mileage: 8000,
        bodyType: "SUV",
        price: 15000,
        color: "Black",
        fuelType: "Diesel",
        transmission: "Automatic",
        featured: true,
        status: "AVAILABLE"
      },
      {
        make: "Honda",
        model: "City",
        year: 2021,
        mileage: 20000,
        bodyType: "Sedan",
        price: 12000,
        color: "Silver",
        fuelType: "Petrol",
        transmission: "Automatic",
        featured: false,
        status: "AVAILABLE"
      }
    ]
  });

  console.log("✅ Cars inserted successfully");
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect());
