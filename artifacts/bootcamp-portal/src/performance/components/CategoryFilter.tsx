interface CategoryFilterProps {
  categories: string[];
  value: string;
  onChange: (value: string) => void;
}

export function CategoryFilter({ categories, value, onChange }: CategoryFilterProps) {
  return (
    <label className="text-sm font-medium flex items-center gap-2">
      영역
      <select className="h-9 rounded-md border bg-background px-3" value={value} onChange={(event) => onChange(event.target.value)}>
        <option value="all">전체</option>
        {categories.map((category) => <option key={category} value={category}>{category}</option>)}
      </select>
    </label>
  );
}
