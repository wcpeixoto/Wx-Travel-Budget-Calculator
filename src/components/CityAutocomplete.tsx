import { useEffect, useMemo, useState } from 'react';
import {
  getAirportDisplayName,
  getGeocodeSuggestions,
  getLocalSuggestions,
  mergeSuggestions,
  type AutocompleteSuggestion,
} from '../services/locationService';
import type { LocationInputState } from '../types';
import { useDebouncedValue } from '../utils/useDebouncedValue';

type Props = {
  label: string;
  value: LocationInputState;
  onChange: (next: LocationInputState) => void;
  showAirportHelper?: boolean;
  errorText?: string;
};

const MAX_SUGGESTIONS = 6;

export default function CityAutocomplete({ label, value, onChange, showAirportHelper = true, errorText = '' }: Props) {
  const [query, setQuery] = useState(value.displayText);
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [geocodeSuggestions, setGeocodeSuggestions] = useState<AutocompleteSuggestion[]>([]);
  const [loadingGeo, setLoadingGeo] = useState(false);
  const debounced = useDebouncedValue(query, 250);
  const minChars = 2;

  useEffect(() => {
    setQuery(value.displayText);
  }, [value.displayText]);

  const localSuggestions = useMemo(() => getLocalSuggestions(debounced, MAX_SUGGESTIONS), [debounced]);

  useEffect(() => {
    const q = debounced.trim();
    if (q.length < minChars) {
      setGeocodeSuggestions([]);
      return;
    }

    let cancelled = false;
    setLoadingGeo(true);

    getGeocodeSuggestions(q, 5)
      .then((items) => {
        if (!cancelled) setGeocodeSuggestions(items);
      })
      .catch(() => {
        if (!cancelled) setGeocodeSuggestions([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingGeo(false);
      });

    return () => {
      cancelled = true;
    };
  }, [debounced]);

  const flat = useMemo(
    () => mergeSuggestions(localSuggestions, geocodeSuggestions, MAX_SUGGESTIONS),
    [localSuggestions, geocodeSuggestions],
  );

  const grouped = useMemo(
    () => ({
      cities: flat.filter((item) => item.group === 'city'),
      airports: flat.filter((item) => item.group === 'airport'),
      flat,
    }),
    [flat],
  );

  const canShowSuggestions = debounced.trim().length >= minChars;
  const showNoResults = canShowSuggestions && !loadingGeo && grouped.flat.length === 0;

  useEffect(() => {
    setHighlightedIndex(grouped.flat.length > 0 ? 0 : -1);
  }, [grouped.flat.length]);

  function applySuggestion(suggestion: AutocompleteSuggestion) {
    const next: LocationInputState = {
      displayText: suggestion.primaryLabel,
      resolved: suggestion.resolved,
    };
    onChange(next);
    setQuery(next.displayText);
    setOpen(false);
  }

  function suggestionsSection(title: string, items: AutocompleteSuggestion[]) {
    if (!items.length) return null;

    return (
      <div className="autocomplete-group">
        <p>{title}</p>
        {items.map((item) => {
          const idx = grouped.flat.findIndex((entry) => entry.id === item.id);
          const isActive = idx === highlightedIndex;
          const displayPrimary =
            title === 'Cities' && !item.primaryLabel.includes('(All airports)')
              ? `${item.primaryLabel} (City)`
              : item.primaryLabel;
          return (
            <button
              type="button"
              key={item.id}
              className={isActive ? 'is-active' : ''}
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setHighlightedIndex(idx)}
              onClick={() => applySuggestion(item)}
            >
              <strong>{displayPrimary}</strong>
              <small>{item.secondaryLabel}</small>
            </button>
          );
        })}
      </div>
    );
  }

  const helperAirportCode = value.resolved?.primaryIata;
  const helperAirportName = helperAirportCode ? getAirportDisplayName(helperAirportCode) : '';
  const helperText =
    value.resolved?.type === 'city' && helperAirportCode
      ? `Using ${helperAirportName} (${helperAirportCode})`
      : value.resolved?.type === 'airport' && helperAirportCode
        ? `Using ${helperAirportName} (${helperAirportCode})`
        : '';

  return (
    <label className="field">
      <span>{label}</span>
      <input
        type="text"
        value={query}
        onFocus={() => setOpen(true)}
        onBlur={() => window.setTimeout(() => setOpen(false), 180)}
        onChange={(e) => {
          const nextText = e.target.value;
          setQuery(nextText);
          setOpen(nextText.trim().length >= minChars);
          onChange({
            displayText: nextText,
            resolved: null,
          });
        }}
        onKeyDown={(e) => {
          if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
            setOpen(true);
            return;
          }

          if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedIndex((idx) => (idx + 1) % Math.max(1, grouped.flat.length));
          }

          if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedIndex((idx) => (idx <= 0 ? grouped.flat.length - 1 : idx - 1));
          }

          if (e.key === 'Enter' && open && grouped.flat.length > 0) {
            e.preventDefault();
            const selected = grouped.flat[Math.max(0, highlightedIndex)];
            if (selected) applySuggestion(selected);
          }

          if (e.key === 'Escape') {
            setOpen(false);
          }
        }}
        placeholder="Search city or airport"
        autoComplete="off"
      />

      {showAirportHelper && helperText && (
        <div className="resolved-hint">
          <small>{helperText}</small>
          <button
            type="button"
            className="link-btn"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setQuery(value.resolved?.cityName ?? query);
              setOpen(true);
            }}
          >
            Change airport
          </button>
        </div>
      )}

      {showNoResults && <small className="inline-error">We couldn’t find that place. Try a nearby city or airport.</small>}
      {!!errorText && <small className="inline-error">{errorText}</small>}

      {open && canShowSuggestions && grouped.flat.length > 0 && (
        <div className="autocomplete-menu" role="listbox">
          {suggestionsSection('Cities', grouped.cities)}
          {suggestionsSection('Airports', grouped.airports)}
        </div>
      )}
    </label>
  );
}
