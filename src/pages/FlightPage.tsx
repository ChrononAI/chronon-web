import { useState } from "react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChevronDown, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const POPULAR_CITIES = [
  "Mumbai",
  "Delhi",
  "Bangalore",
  "Kolkata",
  "Chennai",
  "Jaipur",
  "Hyderabad",
  "Bhopal",
];

interface Flight {
  id: string;
  airline: string;
  airlineCode: string;
  flightNumber: string;
  departureTime: string;
  departureCity: string;
  arrivalTime: string;
  arrivalCity: string;
  duration: string;
  stops: string;
  price: number;
}

// Mock flight data generator
const generateMockFlights = (from: string, to: string): Flight[] => {
  const airlines = [
    { name: "Akasa Air", code: "QP" },
    { name: "IndiGo", code: "6E" },
    { name: "Air India", code: "AI" },
    { name: "Vistara", code: "UK" },
    { name: "SpiceJet", code: "SG" },
  ];

  const times = [
    { dep: "06:00", arr: "08:00", dur: "02 h 00 m" },
    { dep: "09:30", arr: "11:20", dur: "01 h 50 m" },
    { dep: "14:15", arr: "16:05", dur: "01 h 50 m" },
    { dep: "18:45", arr: "20:35", dur: "01 h 50 m" },
    { dep: "22:00", arr: "23:50", dur: "01 h 50 m" },
  ];

  return airlines.flatMap((airline, airlineIdx) =>
    times.map((time, timeIdx) => ({
      id: `${airline.code}-${1000 + airlineIdx * 100 + timeIdx}`,
      airline: airline.name,
      airlineCode: airline.code,
      flightNumber: `${airline.code} ${1000 + airlineIdx * 100 + timeIdx}`,
      departureTime: time.dep,
      departureCity: from,
      arrivalTime: time.arr,
      arrivalCity: to,
      duration: time.dur,
      stops: "Non stop",
      price: Math.floor(Math.random() * 5000) + 3000,
    }))
  );
};

export default function FlightPage() {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [depart, setDepart] = useState<Date | undefined>(undefined);
  const [returnDate, setReturnDate] = useState<Date | undefined>(undefined);
  const [departOpen, setDepartOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [passengers, setPassengers] = useState("");
  const [showFlights, setShowFlights] = useState(false);
  const [flights, setFlights] = useState<Flight[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!from || !to || !depart || !passengers) {
      setError("Please fill all required fields");
      return;
    }

    if (from === to) {
      setError("From and To cities cannot be the same");
      return;
    }

    setError(null);
    setLoading(true);
    setShowFlights(false);

    try {
      // TODO: Implement flight search API call here
      // For now, just simulate a delay and generate mock flights
      await new Promise((resolve) => setTimeout(resolve, 1500));
      const mockFlights = generateMockFlights(from, to);
      setFlights(mockFlights);
      setShowFlights(true);
    } catch (err: any) {
      console.error("Flight search error:", err);
      if (err.response?.data?.Message) {
        setError(err.response.data.Message);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to search flights. Please try again later.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div>
        <h1 className="text-2xl font-bold mb-2">Travel</h1>
        <p className="text-sm text-gray-600 mb-4">Travel &gt; Book Flight</p>
        <div className="border-t border-gray-200"></div>
      </div>

      {/* Search Form */}
      <div>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
            {/* From */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                From
              </label>
              <div className="relative">
                {from ? (
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-900">{from}</div>
                  </div>
                ) : (
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-400">Select</div>
                    <div className="text-xs text-gray-400 mt-0.5">City or Airport</div>
                  </div>
                )}
                <div className="mt-1">
                  <Select value={from} onValueChange={setFrom}>
                    <SelectTrigger className="w-full border-0 bg-transparent shadow-none h-auto p-0 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {POPULAR_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* To */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                To
              </label>
              <div className="relative">
                {to ? (
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-900">{to}</div>
                  </div>
                ) : (
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-400">Select</div>
                    <div className="text-xs text-gray-400 mt-0.5">City or Airport</div>
                  </div>
                )}
                <div className="mt-1">
                  <Select value={to} onValueChange={setTo}>
                    <SelectTrigger className="w-full border-0 bg-transparent shadow-none h-auto p-0 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {POPULAR_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Depart */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Depart
              </label>
              <Popover open={departOpen} onOpenChange={setDepartOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent"
                    )}
                  >
                    <div>
                      <div className={cn(
                        "text-xl font-bold",
                        depart ? "text-gray-900" : "text-gray-400"
                      )}>
                        {depart ? `${format(depart, "d")} ${format(depart, "MMM")}'${format(depart, "yy")}` : "Select date"}
                      </div>
                      {depart && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {format(depart, "EEEE")}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={depart}
                    onSelect={(date) => {
                      if (date) {
                        setDepart(date);
                        setTimeout(() => setDepartOpen(false), 0);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Return */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Return
              </label>
              <Popover open={returnOpen} onOpenChange={setReturnOpen}>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent"
                    )}
                  >
                    <div>
                      <div className={cn(
                        "text-xl font-bold",
                        returnDate ? "text-gray-900" : "text-gray-400"
                      )}>
                        {returnDate ? `${format(returnDate, "d")} ${format(returnDate, "MMM")}'${format(returnDate, "yy")}` : "Select date"}
                      </div>
                      {returnDate && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {format(returnDate, "EEEE")}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={returnDate}
                    onSelect={(date) => {
                      if (date) {
                        setReturnDate(date);
                        setTimeout(() => setReturnOpen(false), 0);
                      }
                    }}
                    disabled={(date) => 
                      depart ? date <= depart : date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Passengers */}
            <div className="p-4">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Passengers
              </label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full justify-start text-left font-normal p-0 h-auto hover:bg-transparent"
                    )}
                  >
                    <div>
                      {passengers ? (
                        <>
                          <div className="text-xl font-bold text-gray-900">
                            {passengers} {passengers === "1" ? "Passenger" : "Passengers"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-bold text-gray-400">Select</div>
                          <div className="text-xs text-gray-400 mt-0.5">Number of Passengers</div>
                        </>
                      )}
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Passengers</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const currentPassengers = passengers ? parseInt(passengers) : 1;
                            setPassengers(Math.max(1, currentPassengers - 1).toString());
                          }}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{passengers || "1"}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const currentPassengers = passengers ? parseInt(passengers) : 0;
                            setPassengers((currentPassengers + 1).toString());
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Search Button */}
          <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
            <Button
              onClick={handleSearch}
              disabled={loading}
              style={{ backgroundColor: '#D7FF52', color: '#000000' }}
              className="w-full hover:opacity-90 font-semibold py-6 text-lg rounded-lg disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin inline" />
                  Searching...
                </>
              ) : (
                "Search Flights"
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Flight Listings */}
      {showFlights && !loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Flights from {from} to {to}</h2>
            <p className="text-sm text-gray-600">{flights.length} flights found</p>
          </div>

          {flights.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No flights found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {flights.map((flight) => (
                <div
                  key={flight.id}
                  className="bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between">
                    {/* Left Section - Airline Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-semibold text-gray-900">{flight.airline}</h3>
                        <span className="text-sm text-gray-500">{flight.flightNumber}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {flight.price > 6000 ? (
                          <div className="inline-flex items-center gap-1.5 bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-xs font-medium">
                            <AlertCircle className="h-3.5 w-3.5" />
                            Policy Limit Exceeded
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Policy Limit
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Center Section - Flight Times and Duration */}
                    <div className="flex items-center gap-6 flex-1 justify-center">
                      {/* Departure */}
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {flight.departureTime}
                        </div>
                        <div className="text-sm text-gray-700">{flight.departureCity}</div>
                      </div>

                      {/* Duration and Stops */}
                      <div className="text-center min-w-[100px]">
                        <div className="text-sm text-gray-500">{flight.duration}</div>
                        <div className="relative">
                          <div className="h-px bg-teal-500 my-1"></div>
                          <div className="text-xs text-gray-500">{flight.stops}</div>
                        </div>
                      </div>

                      {/* Arrival */}
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">
                          {flight.arrivalTime}
                        </div>
                        <div className="text-sm text-gray-700">{flight.arrivalCity}</div>
                      </div>
                    </div>

                    {/* Right Section - Price and Actions */}
                    <div className="flex flex-col items-end gap-2 flex-shrink-0 ml-6">
                      <div className="text-right">
                        <div className="text-xl font-semibold text-gray-900">
                          ₹ {flight.price.toLocaleString()}
                        </div>
                        <div className="text-xs text-gray-500">per adult</div>
                      </div>

                      <Button
                        variant="outline"
                        className="bg-blue-50 text-blue-600 border-blue-200 hover:bg-blue-100 rounded-md px-3 py-1.5 text-xs font-medium h-auto"
                      >
                        VIEW PRICES
                      </Button>
                    </div>
                  </div>

                  {/* Bottom Link */}
                  <div className="mt-3 pt-3 border-t border-gray-100 flex justify-end">
                    <button className="text-sm text-blue-600 hover:text-blue-700">
                      View Flight Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

