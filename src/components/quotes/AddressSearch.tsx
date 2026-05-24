"use client";

import { useCallback, useEffect, useRef, useState } from "react";

type AddressSearchProps = {
  onLocationSelect: (
    location: { lat: number; lng: number },
    address: string
  ) => void;
};

export function AddressSearch({ onLocationSelect }: AddressSearchProps) {
  const [query, setQuery] = useState("");
  const [predictions, setPredictions] = useState<
    google.maps.places.AutocompletePrediction[]
  >([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autocompleteServiceRef =
    useRef<google.maps.places.AutocompleteService | null>(null);
  const geocoderRef = useRef<google.maps.Geocoder | null>(null);

  useEffect(() => {
    autocompleteServiceRef.current =
      new google.maps.places.AutocompleteService();
    geocoderRef.current = new google.maps.Geocoder();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  const fetchPredictions = useCallback((input: string) => {
    if (!input.trim()) {
      setPredictions([]);
      setIsOpen(false);
      return;
    }

    autocompleteServiceRef.current?.getPlacePredictions(
      { input, types: ["address"] },
      (results, status) => {
        if (
          status === google.maps.places.PlacesServiceStatus.OK &&
          results
        ) {
          setPredictions(results);
          setIsOpen(true);
          return;
        }

        setPredictions([]);
        setIsOpen(false);
      }
    );
  }, []);

  const handleInputChange = (value: string) => {
    setQuery(value);
    setError(null);

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    debounceRef.current = setTimeout(() => fetchPredictions(value), 250);
  };

  const geocodeAddress = useCallback(
    (address: string) => {
      setIsGeocoding(true);
      setError(null);

      geocoderRef.current?.geocode({ address }, (results, status) => {
        setIsGeocoding(false);

        if (status === "OK" && results?.[0]) {
          const location = results[0].geometry.location;
          onLocationSelect(
            { lat: location.lat(), lng: location.lng() },
            results[0].formatted_address
          );
          setQuery(results[0].formatted_address);
          setPredictions([]);
          setIsOpen(false);
          return;
        }

        setError("Could not find that address. Try selecting a suggestion.");
      });
    },
    [onLocationSelect]
  );

  const handleSelectPrediction = (
    prediction: google.maps.places.AutocompletePrediction
  ) => {
    geocodeAddress(prediction.description);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && query.trim()) {
      event.preventDefault();
      geocodeAddress(query.trim());
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <label htmlFor="dimension-address" className="sr-only">
        Property address
      </label>
      <input
        id="dimension-address"
        type="text"
        value={query}
        onChange={(event) => handleInputChange(event.target.value)}
        onFocus={() => {
          if (predictions.length > 0) {
            setIsOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        placeholder="Search for a property address…"
        autoComplete="off"
        className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"
      />

      {isOpen && predictions.length > 0 && (
        <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg">
          {predictions.map((prediction) => (
            <li key={prediction.place_id}>
              <button
                type="button"
                onClick={() => handleSelectPrediction(prediction)}
                className="w-full px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-slate-50"
              >
                {prediction.description}
              </button>
            </li>
          ))}
        </ul>
      )}

      {isGeocoding && (
        <p className="mt-2 text-xs text-slate-500">Locating address…</p>
      )}

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}
    </div>
  );
}
