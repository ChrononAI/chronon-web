import { useState, useEffect } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { travelService, CreateTravelData } from "@/services/travelService";

export function EditTravelPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const { register, control, handleSubmit, formState: { errors }, reset } = useForm<CreateTravelData>({
    defaultValues: {
      trip_details: [
        {
          mode_of_travel: "FLIGHT",
          trip_type: "SINGLE_TRIP",
          source: "",
          destination: "",
          departure_date: "",
          accommodation_required: false,
          advance_required: false,
        }
      ]
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "trip_details"
  });

  useEffect(() => {
    const loadTravelData = async () => {
      if (!id) return;
      try {
        const travelData = await travelService.getTravel(id);
        reset({
          employee_id: travelData.employee_id,
          trip_name: travelData.trip_name,
          traveller_name_as_id_proof: travelData.traveller_name_as_id_proof,
          source: travelData.source,
          destination: travelData.destination,
          description: travelData.description || "",
          trip_details: travelData.trip_details || []
        });
      } catch (error: any) {
        toast.error("Failed to load travel request");
        console.error(error);
      } finally {
        setInitialLoading(false);
      }
    };
    loadTravelData();
  }, [id, reset]);

  const onSubmit = async (data: CreateTravelData) => {
    if (!id) return;
    setLoading(true);
    try {
      await travelService.updateTravel(id, data);
      toast.success("Travel request updated successfully");
      navigate(`/requests/travels/${id}`);
    } catch (error: any) {
      toast.error(error.message || "Failed to update travel request");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  if (initialLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="animate-spin w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="text-2xl font-bold mb-6">Edit Travel Request</h1>
      
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Basic Info */}
        <Card>
          <CardHeader>
            <CardTitle>Trip Information</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="trip_name">Trip Name *</Label>
                <Input id="trip_name" {...register("trip_name", { required: "Trip name is required" })} />
                {errors.trip_name && <p className="text-red-500 text-sm">{errors.trip_name.message}</p>}
              </div>
              <div>
                <Label htmlFor="employee_id">Employee ID *</Label>
                 <Input id="employee_id" {...register("employee_id", { required: "Employee ID is required" })} />
                 {errors.employee_id && <p className="text-red-500 text-sm">{errors.employee_id.message}</p>}
              </div>
            </div>
             <div className="grid grid-cols-2 gap-4">
               <div>
                <Label htmlFor="traveller_name">Traveller Name (As per ID) *</Label>
                <Input id="traveller_name" {...register("traveller_name_as_id_proof", { required: "Traveller name is required" })} />
                 {errors.traveller_name_as_id_proof && <p className="text-red-500 text-sm">{errors.traveller_name_as_id_proof.message}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="source">Source *</Label>
                <Input id="source" {...register("source", { required: "Source is required" })} />
                {errors.source && <p className="text-red-500 text-sm">{errors.source.message}</p>}
              </div>
              <div>
                <Label htmlFor="destination">Destination *</Label>
                <Input id="destination" {...register("destination", { required: "Destination is required" })} />
                {errors.destination && <p className="text-red-500 text-sm">{errors.destination.message}</p>}
              </div>
            </div>
            
            <div>
              <Label htmlFor="description">Purpose / Description</Label>
              <Textarea id="description" {...register("description")} />
            </div>
          </CardContent>
        </Card>

        {/* Trip Details */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
             <h2 className="text-xl font-semibold">Itinerary Details</h2>
             <Button type="button" variant="outline" size="sm" onClick={() => append({
                 mode_of_travel: "FLIGHT",
                 trip_type: "SINGLE_TRIP",
                 source: "",
                 destination: "",
                 departure_date: "",
                 accommodation_required: false,
                 advance_required: false
             })}>
                <Plus className="w-4 h-4 mr-2" /> Add Leg
             </Button>
          </div>
          
          {fields.map((field, index) => (
            <Card key={field.id}>
              <CardContent className="pt-6 relative">
                 {index > 0 && (
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="sm" 
                    className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
                
                <div className="grid gap-4">
                   <div className="grid grid-cols-3 gap-4">
                      <div>
                        <Label>Mode of Travel</Label>
                        <select 
                            className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...register(`trip_details.${index}.mode_of_travel` as const)}
                        >
                            <option value="FLIGHT">Flight</option>
                            <option value="TRAIN">Train</option>
                            <option value="BUS">Bus</option>
                        </select>
                      </div>
                       <div>
                        <Label>Trip Type</Label>
                         <select 
                             className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                            {...register(`trip_details.${index}.trip_type` as const)}
                        >
                            <option value="SINGLE_TRIP">One Way</option>
                            <option value="ROUND_TRIP">Round Trip</option>
                        </select>
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>From</Label>
                        <Input {...register(`trip_details.${index}.source` as const, { required: "Required" })} />
                         {errors.trip_details?.[index]?.source && <span className="text-red-500 text-xs">Required</span>}
                      </div>
                      <div>
                        <Label>To</Label>
                        <Input {...register(`trip_details.${index}.destination` as const, { required: "Required" })} />
                         {errors.trip_details?.[index]?.destination && <span className="text-red-500 text-xs">Required</span>}
                      </div>
                   </div>

                   <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Departure Date</Label>
                        <Input type="date" {...register(`trip_details.${index}.departure_date` as const, { required: "Required" })} />
                         {errors.trip_details?.[index]?.departure_date && <span className="text-red-500 text-xs">Required</span>}
                      </div>
                      <div>
                        <Label>Return Date</Label>
                        <Input type="date" {...register(`trip_details.${index}.return_date` as const)} />
                      </div>
                   </div>
                   
                   <div className="grid grid-cols-2 gap-4">
                      <div className="flex items-center space-x-2">
                        <input type="checkbox" id={`accommodation_${index}`} {...register(`trip_details.${index}.accommodation_required` as const)} className="h-4 w-4 rounded border-gray-300" />
                        <Label htmlFor={`accommodation_${index}`}>Accommodation Required</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                         <input type="checkbox" id={`advance_${index}`} {...register(`trip_details.${index}.advance_required` as const)} className="h-4 w-4 rounded border-gray-300" />
                        <Label htmlFor={`advance_${index}`}>Advance Required</Label>
                      </div>
                   </div>
                   
                   <div>
                       <Label>Special Instructions</Label>
                       <Textarea {...register(`trip_details.${index}.special_instruction` as const)} placeholder="E.g. Window seat, veg meal..." />
                   </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="flex justify-end gap-4">
           <Button type="button" variant="outline" onClick={() => navigate(`/requests/travels/${id}`)}>Cancel</Button>
           <Button type="submit" disabled={loading}>{loading ? "Updating..." : "Update Request"}</Button>
        </div>
      </form>
    </div>
  );
}
