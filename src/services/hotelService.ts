import axios from "axios";

const HOTEL_API_URL = "https://developers.hummingbirdindia.com/api/v2.6/hotelavailability";
const HOTEL_API_KEY = import.meta.env.VITE_HOTEL_API_KEY || "CHRONON0483674B406692ECSTAGING";

export const CITY_CODES: Record<string, string> = {
  "Bhopal": "BHO",
  "Jaipur": "JAI",
  "Mumbai": "BOM",
  "Delhi": "MKIHG",
  "Kolkata": "CCU",
};

export interface HotelSearchPayload {
  checkin: string;
  checkout: string;
  expected_checkin_time: string;
  expected_checkout_time: string;
  citycode: string;
  room_config: string;
  payment_mode: string;
  grade: string;
  radius: number;
}

export interface HotelData {
  hotelname: string;
  hotelid: string;
  tariff: number;
  tax_amount: number;
  star_rating: string;
  breakfast_included: boolean;
  hoteldescription: string;
  hotelimage: string;
  distance: string;
  locationinfo: {
    address: {
      locality: string;
      cityname: string;
    };
  };
  amenities: {
    wifi: boolean;
    parking: boolean;
    swimmingpool: boolean;
    gym: boolean;
    restaurant: boolean;
    laundry: boolean;
    conferencehall: boolean;
    womensafety: boolean;
  };
  hotel_image: Array<{ url: string }>;
}

export interface HotelAvailabilityResponse {
  Code: number;
  data: HotelData[];
}

class HotelService {
  async searchHotels(payload: HotelSearchPayload): Promise<HotelAvailabilityResponse> {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "Authorization": HOTEL_API_KEY,
      "X-API-Key": HOTEL_API_KEY,
      "apikey": HOTEL_API_KEY,
    };

    const response = await axios.post<HotelAvailabilityResponse>(
      HOTEL_API_URL,
      payload,
      { headers }
    );
    return response.data;
  }

  getCityCode(cityName: string): string | null {
    if (CITY_CODES[cityName]) {
      return CITY_CODES[cityName];
    }
    const cityKey = Object.keys(CITY_CODES).find(
      (key) => key.toLowerCase() === cityName.toLowerCase()
    );
    return cityKey ? CITY_CODES[cityKey] : null;
  }
}

export const hotelService = new HotelService();

