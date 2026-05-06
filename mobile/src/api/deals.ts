/**
 * Deals API — typed React Query hooks for /api/flights/deals and
 * /api/hotels/deals. Both routes are cron-warmed every 6h on the backend
 * so reads are always fast and never trigger an upstream supplier fetch
 * from the client. We treat data as fresh for 30 min in-app.
 */

import { useQuery } from '@tanstack/react-query';
import { apiClient } from './client';

export type FlightDeal = {
  dest: string;
  city: string;
  country: string;
  flag: string;
  price: number;
  airline: string;
  airlineCode: string;
  departureDate: string;
  transfers: number;
  duration: number;
};

export type HotelDealHotel = {
  id: string;
  offerId: string | null;
  name: string;
  stars: number;
  pricePerNight: number;
  totalPrice: number;
  thumbnail: string | null;
  boardType: string | null;
  refundable: boolean;
  district: string | null;
};

export type HotelDealDestination = {
  city: string;
  country: string;
  flag: string;
  photo: string;
  tag?: string;
  cheapestPrice: number | null;
  topHotel: HotelDealHotel | null;
  budgetHotel: HotelDealHotel | null;
  premiumHotel: HotelDealHotel | null;
  hotelCount: number;
  checkin: string;
  checkout: string;
};

type FlightDealsResponse = {
  deals: FlightDeal[];
  cached: boolean;
  fetchedAt?: string;
};

type HotelDealsResponse = {
  deals: HotelDealDestination[];
  cached: boolean;
};

export const flightDealsQueryKey = ['flight-deals'] as const;
export const hotelDealsQueryKey = ['hotel-deals'] as const;

export function useFlightDeals() {
  return useQuery({
    queryKey: flightDealsQueryKey,
    queryFn: async () => {
      const res = await apiClient<FlightDealsResponse>('/api/flights/deals');
      return res.deals;
    },
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}

export function useHotelDeals() {
  return useQuery({
    queryKey: hotelDealsQueryKey,
    queryFn: async () => {
      const res = await apiClient<HotelDealsResponse>('/api/hotels/deals');
      return res.deals.filter((d) => d.cheapestPrice != null);
    },
    staleTime: 30 * 60_000,
    refetchOnWindowFocus: false,
  });
}
