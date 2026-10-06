// Where the Business hero draws its trade routes to. Names are matched the
// way flags are: case and dots ignored. Each coordinate is a city in the
// market, so the arc lands somewhere recognisable.
export type Market = { name: string; lat: number; lon: number };

const places: Record<string, [number, number]> = {
  bangladesh: [23.8, 90.4],
  china: [23.1, 113.3],
  turkey: [41.0, 28.9],
  türkiye: [41.0, 28.9],
  vietnam: [10.8, 106.7],
  uae: [25.2, 55.3],
  "united arab emirates": [25.2, 55.3],
  india: [19.1, 72.9],
  malaysia: [3.1, 101.7],
  thailand: [13.8, 100.5],
  singapore: [1.4, 103.8],
  indonesia: [-6.2, 106.8],
  japan: [35.7, 139.7],
  "south korea": [37.6, 126.9],
  germany: [53.5, 10.0],
  italy: [45.5, 9.2],
  uk: [51.5, -0.1],
  "united kingdom": [51.5, -0.1],
  usa: [40.7, -74.0],
  "united states": [40.7, -74.0],
  canada: [43.7, -79.4],
  australia: [-33.9, 151.2],
  "saudi arabia": [21.5, 39.2],
  egypt: [30.0, 31.2],
};

export const DHAKA: Market = { name: "Bangladesh", lat: 23.8, lon: 90.4 };

// The home market: Bangladesh itself, where every route starts.
export const isHome = (market: Market) => Math.hypot(market.lat - DHAKA.lat, market.lon - DHAKA.lon) < 1;

export function marketPlace(name: string): Market | null {
  const hit = places[name.trim().toLowerCase().replace(/\./g, "")];
  return hit ? { name, lat: hit[0], lon: hit[1] } : null;
}

const tenth = (value: number) => Math.round(value * 10) / 10;

// Equirectangular: the map is 360 wide and 180 high, in degrees.
export const project = (lat: number, lon: number) => ({ x: tenth(lon + 180), y: tenth(90 - lat) });

// A quadratic curve from one place to another, bowing north.
export function arcPath(from: Market, to: Market): string {
  const a = project(from.lat, from.lon);
  const b = project(to.lat, to.lon);
  const lift = Math.min(28, Math.hypot(b.x - a.x, b.y - a.y) * 0.28);
  const cx = tenth((a.x + b.x) / 2);
  const cy = tenth((a.y + b.y) / 2 - lift);
  return `M${a.x} ${a.y} Q${cx} ${cy} ${b.x} ${b.y}`;
}
