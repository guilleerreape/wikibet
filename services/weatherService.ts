interface WeatherData {
  temp: number;       // celsius
  feelsLike: number;
  description: string;
  humidity: number;
  windSpeed: number;  // km/h
  icon: string;       // emoji
}

const STADIUM_CITIES: Record<string, string> = {
  'NRG': 'Houston', 'AT&T': 'Arlington', 'Arrowhead': 'Kansas City',
  'Rose Bowl': 'Pasadena', 'SoFi': 'Los Angeles', 'MetLife': 'New York',
  'Levi': 'Santa Clara', 'Lincoln Financial': 'Philadelphia',
  'Gillette': 'Boston', 'BMO': 'Toronto', 'BC Place': 'Vancouver',
  'Azteca': 'Mexico City', 'Estadio BBVA': 'Monterrey',
  'Estadio Akron': 'Guadalajara',
  'Hard Rock': 'Miami', 'Commanders': 'Washington',
};

export async function getVenueWeather(venue: string): Promise<WeatherData | null> {
  let city = '';
  for (const [keyword, c] of Object.entries(STADIUM_CITIES)) {
    if (venue.includes(keyword)) { city = c; break; }
  }
  if (!city) {
    const parts = venue.split(',');
    city = parts.length > 1 ? parts[parts.length - 1].trim() : venue.split(' ')[0];
  }
  if (!city || city.length < 2) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);
    const res = await fetch(`https://wttr.in/${encodeURIComponent(city)}?format=j1`, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (!res.ok) return null;
    const data = await res.json();
    const current = data.current_condition?.[0];
    if (!current) return null;
    const temp = parseInt(current.temp_C ?? '20');
    const feelsLike = parseInt(current.FeelsLikeC ?? String(temp));
    const humidity = parseInt(current.humidity ?? '50');
    const windSpeed = parseInt(current.windspeedKmph ?? '0');
    const desc = current.weatherDesc?.[0]?.value ?? 'Clear';
    let icon = '⛅';
    const d = desc.toLowerCase();
    if (d.includes('rain') || d.includes('drizzle') || d.includes('shower')) icon = '🌧️';
    else if (d.includes('thunder') || d.includes('storm')) icon = '⛈️';
    else if (d.includes('snow')) icon = '❄️';
    else if (d.includes('fog') || d.includes('mist')) icon = '🌫️';
    else if (d.includes('cloud')) icon = '☁️';
    else if (d.includes('clear') || d.includes('sunny')) icon = '☀️';
    else if (temp > 28) icon = '🌡️';
    return { temp, feelsLike, description: desc, humidity, windSpeed, icon };
  } catch {
    return null;
  }
}
