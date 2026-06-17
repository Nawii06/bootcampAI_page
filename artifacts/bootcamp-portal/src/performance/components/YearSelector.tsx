interface YearSelectorProps {
  value: number;
  onChange: (year: number) => void;
}

export function YearSelector({ value, onChange }: YearSelectorProps) {
  return (
    <label className="text-sm font-medium flex items-center gap-2">
      사업연도
      <select className="h-9 rounded-md border bg-background px-3" value={value} onChange={(event) => onChange(Number(event.target.value))}>
        {[2026, 2027, 2028, 2029, 2030].map((year) => <option key={year} value={year}>{year}</option>)}
      </select>
    </label>
  );
}
