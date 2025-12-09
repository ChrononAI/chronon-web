import { useState, useEffect } from "react";
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
import { ChevronDown, Star, MapPin, Utensils, Wifi, Car, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { hotelService, HotelData, CITY_CODES } from "@/services/hotelService";

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

interface Hotel {
  id: string;
  name: string;
  location: string;
  rating: number;
  ratingsCount: number;
  originalPrice: number;
  currentPrice: number;
  taxes: number;
  description: string;
  amenities: string[];
  features: string[];
  images: string[];
  distance?: string;
}

const transformHotel = (hotel: HotelData): Hotel => {
  const amenities: string[] = [];
  if (hotel.breakfast_included) amenities.push("Breakfast Included");
  if (hotel.amenities.wifi) amenities.push("Free WiFi");
  if (hotel.amenities.parking) amenities.push("Free Parking");
  if (hotel.amenities.swimmingpool) amenities.push("Swimming Pool");
  if (hotel.amenities.gym) amenities.push("Gym");
  if (hotel.amenities.restaurant) amenities.push("Restaurant");
  if (hotel.amenities.laundry) amenities.push("Laundry");
  if (hotel.amenities.conferencehall) amenities.push("Conference Hall");

  const features: string[] = [];
  if (hotel.amenities.womensafety) features.push("Women Safety");
  if (hotel.distance) features.push(hotel.distance);

  const images = hotel.hotel_image?.map((img) => img.url) || [hotel.hotelimage];

  return {
    id: hotel.hotelid,
    name: hotel.hotelname,
    location: `${hotel.locationinfo.address.locality}, ${hotel.locationinfo.address.cityname}`,
    rating: parseFloat(hotel.star_rating) || 0,
    ratingsCount: 0,
    originalPrice: hotel.tariff + hotel.tax_amount,
    currentPrice: hotel.tariff,
    taxes: hotel.tax_amount,
    description: hotel.hoteldescription || "Comfortable accommodation with modern amenities.",
    amenities,
    features,
    images,
    distance: hotel.distance,
  };
};

export default function HotelPage() {
  const [location, setLocation] = useState("");
  const [checkIn, setCheckIn] = useState<Date | undefined>(undefined);
  const [checkOut, setCheckOut] = useState<Date | undefined>(undefined);
  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [rooms, setRooms] = useState("1");
  const [adults, setAdults] = useState("1");
  const [priceRange, setPriceRange] = useState("");
  const [showHotels, setShowHotels] = useState(false);
  const [allHotels, setAllHotels] = useState<Hotel[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter hotels by price range when priceRange changes
  useEffect(() => {
    if (allHotels.length > 0) {
      let filtered = allHotels;
      
      if (priceRange) {
        filtered = allHotels.filter((hotel) => {
          const price = hotel.currentPrice;
          switch (priceRange) {
            case "0-1500":
              return price >= 0 && price <= 1500;
            case "1500-2500":
              return price > 1500 && price <= 2500;
            case "2500-5000":
              return price > 2500 && price <= 5000;
            case "5000-10000":
              return price > 5000 && price <= 10000;
            case "10000+":
              return price > 10000;
            default:
              return true;
          }
        });
      }
      
      setHotels(filtered);
    }
  }, [priceRange, allHotels]);

  const handleSearch = async () => {
    if (!location || !checkIn || !checkOut || !rooms || !adults) {
      setError("Please fill all required fields");
      return;
    }

    const cityCode = hotelService.getCityCode(location);
    if (!cityCode) {
      setError(`City not supported. Available: Bhopal, Jaipur, Mumbai, Delhi, Kolkata`);
      return;
    }

    setError(null);
    setLoading(true);
    setShowHotels(false);

    try {
      const payload = {
        checkin: format(checkIn, "yyyy-MM-dd"),
        checkout: format(checkOut, "yyyy-MM-dd"),
        expected_checkin_time: "15:00",
        expected_checkout_time: "11:59",
        citycode: cityCode,
        room_config: "A",
        payment_mode: "payment_by_agent",
        grade: "HS1",
        radius: 10,
      };

      const response = await hotelService.searchHotels(payload);

      if (response.Code === 200 && response.data) {
        const transformedHotels = response.data.map(transformHotel);
        setAllHotels(transformedHotels);
        // Hotels will be filtered by useEffect when priceRange changes
        setShowHotels(true);
      } else {
        setError("No hotels found");
      }
    } catch (err: any) {
      console.error("Hotel search error:", err);
      if (err.response?.data?.Message) {
        setError(err.response.data.Message);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError("Failed to search hotels. Please check if API key is configured.");
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
        <p className="text-sm text-gray-600 mb-4">Travel &gt; Book Hotel</p>
        <div className="border-t border-gray-200"></div>
      </div>

      {/* Search Form */}
      <div>
        <div className="bg-white rounded-lg shadow-lg overflow-hidden">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-0">
            {/* City/Property Name/Location */}
            <div className="bg-blue-50 p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                City, Property Name Or Location
              </label>
              <div className="relative">
                {location ? (
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-900">{location}</div>
                  </div>
                ) : (
                  <div className="mb-1">
                    <div className="text-xl font-bold text-gray-400">Select</div>
                    <div className="text-xs text-gray-400 mt-0.5">City or Location</div>
                  </div>
                )}
                <div className="mt-1">
                  <Select value={location} onValueChange={setLocation}>
                    <SelectTrigger className="w-full border-0 bg-transparent shadow-none h-auto p-0 focus:ring-0 focus:ring-offset-0">
                      <SelectValue placeholder="Select city" />
                    </SelectTrigger>
                    <SelectContent>
                      {POPULAR_CITIES.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                          {CITY_CODES[city] && (
                            <span className="text-xs text-gray-500 ml-2">({CITY_CODES[city]})</span>
                          )}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Check-In */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Check-In
              </label>
              <Popover open={checkInOpen} onOpenChange={setCheckInOpen}>
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
                        checkIn ? "text-gray-900" : "text-gray-400"
                      )}>
                        {checkIn ? `${format(checkIn, "d")} ${format(checkIn, "MMM")}'${format(checkIn, "yy")}` : "Select date"}
                      </div>
                      {checkIn && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {format(checkIn, "EEEE")}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkIn}
                    onSelect={(date) => {
                      if (date) {
                        setCheckIn(date);
                        setTimeout(() => setCheckInOpen(false), 0);
                      }
                    }}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Check-Out */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Check-Out
              </label>
              <Popover open={checkOutOpen} onOpenChange={setCheckOutOpen}>
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
                        checkOut ? "text-gray-900" : "text-gray-400"
                      )}>
                        {checkOut ? `${format(checkOut, "d")} ${format(checkOut, "MMM")}'${format(checkOut, "yy")}` : "Select date"}
                      </div>
                      {checkOut && (
                        <div className="text-xs text-gray-600 mt-0.5">
                          {format(checkOut, "EEEE")}
                        </div>
                      )}
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={checkOut}
                    onSelect={(date) => {
                      if (date) {
                        setCheckOut(date);
                        setTimeout(() => setCheckOutOpen(false), 0);
                      }
                    }}
                    disabled={(date) => 
                      checkIn ? date <= checkIn : date < new Date()
                    }
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            {/* Rooms & Guests */}
            <div className="p-4 border-r border-gray-200">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Rooms & Guests
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
                      <div className="text-xl font-bold text-gray-900">
                        {rooms} {rooms === "1" ? "Room" : "Rooms"}
                      </div>
                      <div className="text-xs text-gray-600 mt-0.5">
                        {adults} {adults === "1" ? "Adult" : "Adults"}
                      </div>
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Rooms</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const currentRooms = rooms ? parseInt(rooms) : 1;
                            const newRooms = Math.max(1, currentRooms - 1);
                            setRooms(newRooms.toString());
                          }}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{rooms || "1"}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const currentRooms = rooms ? parseInt(rooms) : 0;
                            const newRooms = currentRooms + 1;
                            setRooms(newRooms.toString());
                          }}
                        >
                          +
                        </Button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Adults</span>
                      <div className="flex items-center gap-3">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const currentAdults = adults ? parseInt(adults) : 1;
                            const newAdults = Math.max(1, currentAdults - 1);
                            setAdults(newAdults.toString());
                          }}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{adults || "1"}</span>
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => {
                            const currentAdults = adults ? parseInt(adults) : 0;
                            const newAdults = currentAdults + 1;
                            setAdults(newAdults.toString());
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

            {/* Price Per Night */}
            <div className="p-4">
              <label className="text-xs text-gray-600 uppercase mb-1 block">
                Price Per Night
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
                      {priceRange ? (
                        <>
                          <div className="text-xl font-bold text-gray-900">
                            {priceRange === "0-1500" && "₹0-₹1,500"}
                            {priceRange === "1500-2500" && "₹1,500-₹2,500"}
                            {priceRange === "2500-5000" && "₹2,500-₹5,000"}
                            {priceRange === "5000-10000" && "₹5,000-₹10,000"}
                            {priceRange === "10000+" && "₹10,000+"}
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-xl font-bold text-gray-400">Select</div>
                          <div className="text-xs text-gray-400 mt-0.5">Price Range</div>
                        </>
                      )}
                    </div>
                    <ChevronDown className="ml-auto h-4 w-4 text-gray-400" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4" align="start">
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setPriceRange("0-1500");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      ₹0 - ₹1,500
                    </button>
                    <button
                      onClick={() => {
                        setPriceRange("1500-2500");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      ₹1,500 - ₹2,500
                    </button>
                    <button
                      onClick={() => {
                        setPriceRange("2500-5000");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      ₹2,500 - ₹5,000
                    </button>
                    <button
                      onClick={() => {
                        setPriceRange("5000-10000");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      ₹5,000 - ₹10,000
                    </button>
                    <button
                      onClick={() => {
                        setPriceRange("10000+");
                      }}
                      className="w-full text-left px-4 py-2 hover:bg-gray-100 rounded"
                    >
                      ₹10,000+
                    </button>
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
                "Search Hotels"
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

      {/* Hotel Listings */}
      {showHotels && !loading && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Hotels in {location}</h2>
            <p className="text-sm text-gray-600">{hotels.length} hotels found</p>
          </div>

          {hotels.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-600">No hotels found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {hotels.map((hotel) => (
                <div
                  key={hotel.id}
                  className="bg-white rounded-lg shadow-md overflow-hidden border border-gray-200"
                >
                  <div className="flex flex-col md:flex-row">
                    {/* Hotel Images */}
                    <div className="md:w-1/3 relative">
                      <div className="aspect-video bg-gray-200 relative">
                        {hotel.images[0] ? (
                          <img
                            src={hotel.images[0]}
                            alt={hotel.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                            <div className="text-white text-center">
                              <div className="text-4xl mb-2">🏨</div>
                              <div className="text-sm font-medium">Hotel Image</div>
                            </div>
                          </div>
                        )}
                        {hotel.images.length > 1 && (
                          <div className="absolute bottom-2 left-2 flex gap-1">
                            {hotel.images.slice(1, 4).map((img, idx) => (
                              <div
                                key={idx}
                                className="w-16 h-12 bg-gray-300 rounded overflow-hidden border-2 border-white"
                              >
                                <img
                                  src={img}
                                  alt={`${hotel.name} ${idx + 2}`}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).style.display = 'none';
                                  }}
                                />
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                  {/* Hotel Details */}
                  <div className="md:w-2/3 p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-2">
                        <div>
                          <h3 className="text-xl font-semibold text-gray-900 mb-1">
                            {hotel.name}
                          </h3>
                          <div className="flex items-center gap-2 mb-1">
                            {hotel.currentPrice > 2500 ? (
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
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <MapPin className="h-4 w-4" />
                            <span>{hotel.location}</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
                            <span className="font-semibold">{hotel.rating}</span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {hotel.ratingsCount} Ratings
                          </p>
                          <p className="text-xs font-medium text-green-600 mt-1">
                            Very Good
                          </p>
                        </div>
                      </div>

                      {/* Features */}
                      {hotel.features.length > 0 && (
                        <div className="flex flex-wrap gap-2 mb-3">
                          {hotel.features.map((feature, idx) => (
                            <span
                              key={idx}
                              className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Description */}
                      <p className="text-sm text-gray-700 mb-3">{hotel.description}</p>

                      {/* Amenities */}
                      <div className="flex flex-wrap gap-2 mb-3">
                        {hotel.amenities.map((amenity, idx) => (
                          <span
                            key={idx}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded flex items-center gap-1"
                          >
                            {amenity.includes("Breakfast") && <Utensils className="h-3 w-3" />}
                            {amenity.includes("WiFi") && <Wifi className="h-3 w-3" />}
                            {amenity.includes("Parking") && <Car className="h-3 w-3" />}
                            {amenity}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Price and Book Button */}
                    <div className="flex items-end justify-between pt-4 border-t border-gray-200">
                      <div>
                        <div className="flex items-baseline gap-2 mb-1">
                          <span className="text-2xl font-bold text-gray-900">
                            ₹{hotel.currentPrice.toLocaleString()}
                          </span>
                          <span className="text-sm text-gray-500 line-through">
                            ₹{hotel.originalPrice.toLocaleString()}
                          </span>
                        </div>
                        <p className="text-xs text-gray-600">
                          + ₹{hotel.taxes} taxes & fees
                        </p>
                        <p className="text-xs text-gray-500 mt-1">per night</p>
                      </div>
                      <Button
                        style={{ backgroundColor: '#D7FF52', color: '#000000' }}
                        className="hover:opacity-90 font-semibold px-6 rounded-lg"
                      >
                        Book Now
                      </Button>
                    </div>
                  </div>
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

