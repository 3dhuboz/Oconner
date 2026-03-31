'use client';

import { useEffect, useState } from 'react';

interface WeatherData {
  temp: number;
  weatherCode: number;
  windSpeed: number;
  humidity: number;
}

const WMO_ICON: Record<number, string> = {
  0: '☀️', 1: '🌤', 2: '⛅', 3: '☁️',
  45: '🌫', 48: '🌫',
  51: '🌦', 53: '🌦', 55: '🌧',
  61: '🌧', 63: '🌧', 65: '🌧',
  71: '❄️', 73: '❄️', 75: '❄️', 77: '❄️',
  80: '🌦', 81: '🌦', 82: '⛈',
  85: '❄️', 86: '❄️',
  95: '⛈', 96: '⛈', 99: '⛈',
};

const WMO_DESC: Record<number, string> = {
  0: 'Clear sky', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
  45: 'Foggy', 48: 'Icy fog',
  51: 'Light drizzle', 53: 'Drizzle', 55: 'Heavy drizzle',
  61: 'Light rain', 63: 'Rain', 65: 'Heavy rain',
  71: 'Light snow', 73: 'Snow', 75: 'Heavy snow', 77: 'Snow grains',
  80: 'Light showers', 81: 'Showers', 82: 'Heavy showers',
  85: 'Snow showers', 86: 'Heavy snow showers',
  95: 'Thunderstorm', 96: 'Thunderstorm', 99: 'Severe thunderstorm',
};

export default function WeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);

  useEffect(() => {
    fetch(
      'https://api.open-meteo.com/v1/forecast?latitude=-24.05&longitude=151.27&current=temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m&timezone=Australia%2FBrisbane&forecast_days=1',
    )
      .then((r) => r.json())
      .then((d: any) => {
        setWeather({
          temp: Math.round(d.current.temperature_2m),
          weatherCode: d.current.weather_code,
          windSpeed: Math.round(d.current.wind_speed_10m),
          humidity: Math.round(d.current.relative_humidity_2m),
        });
      })
      .catch(() => {});
  }, []);

  if (!weather) return null;

  const icon = WMO_ICON[weather.weatherCode] ?? '🌤';
  const desc = WMO_DESC[weather.weatherCode] ?? 'Fair';

  return (
    <div className="flex items-center gap-3">
      <span className="text-2xl leading-none" aria-hidden="true">{icon}</span>
      <div>
        <p className="text-white font-semibold text-sm leading-tight">
          {weather.temp}°C &mdash; {desc}
        </p>
        <p className="text-brand-light/70 text-xs leading-tight mt-0.5">
          Boynedale, QLD &middot; Wind {weather.windSpeed} km/h &middot; Humidity {weather.humidity}%
        </p>
      </div>
    </div>
  );
}
