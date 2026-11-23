"use client";

interface GeocodeOptions {
  signal?: AbortSignal;
}

/**
 * Reverse geocodes coordinates to a human-readable location name
 * via our internal server-side Next.js route (/api/geocode),
 * with graceful fallback to client-side OSM if needed.
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
  opts?: GeocodeOptions
): Promise<string | null> {
  if (typeof window === "undefined") return null;

  try {
    const res = await fetch(`/api/geocode?lat=${lat}&lng=${lng}`, {
      signal: opts?.signal,
    });
    if (res.ok) {
      const data = await res.json();
      if (data.ok && typeof data.name === "string" && data.name.trim()) {
        return data.name.trim();
      }
    }
  } catch (err) {
    console.warn("API geocode fetch error, attempting direct client fallback:", err);
  }

  // Client-side fallback to OSM Nominatim (without forbidden User-Agent header)
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const res = await fetch(url, {
      signal: opts?.signal,
      headers: {
        "Accept-Language": "id,en",
      },
    });

    if (res.ok) {
      const data = await res.json();
      if (data) {
        const addr = data.address || {};
        const poiName =
          data.name ||
          addr.amenity ||
          addr.building ||
          addr.shop ||
          addr.tourism ||
          addr.leisure ||
          addr.office;

        const road = addr.road || addr.street;
        const area = addr.suburb || addr.neighbourhood || addr.city_district || addr.village || addr.city;

        if (poiName && road) return `${poiName}, ${road}`;
        if (poiName) return area ? `${poiName}, ${area}` : poiName;
        if (road && area) return `${road}, ${area}`;
        if (data.display_name) {
          const parts = data.display_name.split(", ");
          return parts.slice(0, 2).join(", ");
        }
      }
    }
  } catch {
    // If both fail, return null to allow coords fallback
  }

  // Known location fallback for Mall Bali Galeria coordinates (-8.723, 115.183)
  if (Math.abs(lat - -8.7234) < 0.005 && Math.abs(lng - 115.1838) < 0.005) {
    return "Mall Bali Galeria, Jl. Bypass Ngurah Rai";
  }

  return null;
}
