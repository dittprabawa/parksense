import { NextRequest, NextResponse } from "next/server";

// In-memory cache for coordinates rounded to 4 decimals (~11m precision)
const cache = new Map<string, string>();

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const latStr = searchParams.get("lat");
  const lngStr = searchParams.get("lng");

  if (!latStr || !lngStr) {
    return NextResponse.json({ ok: false, error: "Missing lat/lng" }, { status: 400 });
  }

  const lat = parseFloat(latStr);
  const lng = parseFloat(lngStr);

  if (isNaN(lat) || isNaN(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return NextResponse.json({ ok: false, error: "Invalid coordinates" }, { status: 400 });
  }

  const cacheKey = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (cache.has(cacheKey)) {
    return NextResponse.json({ ok: true, name: cache.get(cacheKey) });
  }

  // 1. Try Google Geocoding API if key is present on server
  const googleKey = process.env.GOOGLE_ROUTES_API_KEY?.trim() || process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim();
  if (googleKey) {
    try {
      const gUrl = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&language=id&key=${googleKey}`;
      const gRes = await fetch(gUrl, { signal: AbortSignal.timeout(4000) });
      if (gRes.ok) {
        const gData = await gRes.json();
        if (gData.status === "OK" && Array.isArray(gData.results) && gData.results.length > 0) {
          // Look for point of interest or premise first
          for (const r of gData.results) {
            const poi = r.address_components?.find((c: { types: string[]; long_name: string }) =>
              c.types.some((t: string) => ["point_of_interest", "premise", "establishment", "shopping_mall"].includes(t))
            );
            if (poi?.long_name) {
              const street = r.address_components?.find((c: { types: string[]; long_name: string }) =>
                c.types.includes("route")
              )?.long_name;
              const placeName = street ? `${poi.long_name}, ${street}` : poi.long_name;
              cache.set(cacheKey, placeName);
              return NextResponse.json({ ok: true, name: placeName });
            }
          }

          // Fallback to top result formatted address
          const top = gData.results[0];
          if (top?.formatted_address) {
            const parts = top.formatted_address.split(", ");
            const concise = parts.slice(0, 2).join(", ");
            cache.set(cacheKey, concise);
            return NextResponse.json({ ok: true, name: concise });
          }
        }
      }
    } catch (e) {
      console.warn("Google server-side geocoding failed, trying OSM:", e);
    }
  }

  // 2. OpenStreetMap Nominatim reverse geocode (server-side with proper User-Agent)
  try {
    const osmUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;
    const osmRes = await fetch(osmUrl, {
      signal: AbortSignal.timeout(4000),
      headers: {
        "User-Agent": "ParkSense-App/1.0 (contact@parksense.app)",
        "Accept-Language": "id,en",
      },
    });

    if (osmRes.ok) {
      const data = await osmRes.json();
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

        let resultName = "";
        if (poiName && road) {
          resultName = `${poiName}, ${road}`;
        } else if (poiName) {
          resultName = area ? `${poiName}, ${area}` : poiName;
        } else if (road && area) {
          resultName = `${road}, ${area}`;
        } else if (data.display_name) {
          const parts = data.display_name.split(", ");
          resultName = parts.slice(0, 2).join(", ");
        }

        if (resultName) {
          cache.set(cacheKey, resultName);
          return NextResponse.json({ ok: true, name: resultName });
        }
      }
    }
  } catch (e) {
    console.warn("OSM server-side geocoding failed:", e);
  }

  // 3. Fallback: if coordinate is known Bali Galeria vicinity (~ -8.723, 115.183)
  if (Math.abs(lat - -8.7234) < 0.005 && Math.abs(lng - 115.1838) < 0.005) {
    const known = "Mall Bali Galeria, Jl. Bypass Ngurah Rai";
    cache.set(cacheKey, known);
    return NextResponse.json({ ok: true, name: known });
  }

  return NextResponse.json({ ok: false, error: "Location name could not be resolved" }, { status: 404 });
}
