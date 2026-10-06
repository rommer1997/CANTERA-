import React from 'react';
import { canonicalCountry, countries } from './geography';
export function CountryInput({ value, onChange, required = false, ariaLabel = 'País' }: { value: string; onChange(value: string): void; required?: boolean; ariaLabel?: string }) {
  const country = canonicalCountry(value);
  return <select aria-label={ariaLabel} className="c-input" value={country} onChange={e => onChange(e.target.value)} required={required} autoComplete="country-name"><option value="">{required ? 'Selecciona un país' : 'Todos los países'}</option>{country && !countries.some(c => c.name === country) ? <option value={country}>{country} · valor anterior</option> : null}{countries.map(c => <option key={c.code} value={c.name}>{c.name}</option>)}</select>;
}
