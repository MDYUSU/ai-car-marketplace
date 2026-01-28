import { EditCarForm } from "./_components/edit-car-form";

export const metadata = {
  title: "Edit Car | Vehiql Admin",
  description: "Edit car details",
};

export default function EditCarPage({ params }) {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Edit Car</h1>
      <EditCarForm carId={params.id} />
    </div>
  );
}
