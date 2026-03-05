function FilterSelect({ label, value, onChange, options = [] }) {
  return (
    <label className="flex min-w-[132px] flex-1 flex-col gap-1">
      <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-muted">
        {label}
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full rounded-xl border border-black/10 bg-white/85 px-3 py-2 text-xs font-semibold text-text shadow-subtle outline-none transition focus:border-accent/60 focus:ring-2 focus:ring-accent/20"
      >
        {options.map((option) => (
          <option key={`${label}-${option.value}`} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  )
}

export default function LoggedToolbar({
  ratingFilter,
  onRatingFilterChange,
  decadeFilter,
  onDecadeFilterChange,
  genreFilter,
  onGenreFilterChange,
  statusFilter,
  onStatusFilterChange,
  sortBy,
  onSortByChange,
  decadeOptions = [],
  genreOptions = [],
  statusOptions = [],
  sortOptions = [],
}) {
  return (
    <section className="rounded-2xl border border-black/10 bg-white/75 p-3 shadow-subtle">
      <div className="flex flex-wrap items-end gap-2.5">
        <FilterSelect
          label="Rating"
          value={ratingFilter}
          onChange={onRatingFilterChange}
          options={[
            { value: 'all', label: 'All ratings' },
            { value: '5', label: '5 stars' },
            { value: '4', label: '4+ stars' },
            { value: '3', label: '3+ stars' },
            { value: '2', label: '2+ stars' },
            { value: '1', label: '1+ stars' },
          ]}
        />
        <FilterSelect
          label="Decade"
          value={decadeFilter}
          onChange={onDecadeFilterChange}
          options={[{ value: 'all', label: 'All decades' }, ...decadeOptions]}
        />
        <FilterSelect
          label="Genre"
          value={genreFilter}
          onChange={onGenreFilterChange}
          options={[{ value: 'all', label: 'All genres' }, ...genreOptions]}
        />
        <FilterSelect
          label="Status"
          value={statusFilter}
          onChange={onStatusFilterChange}
          options={[{ value: 'all', label: 'All statuses' }, ...statusOptions]}
        />
        <FilterSelect
          label="Sort"
          value={sortBy}
          onChange={onSortByChange}
          options={sortOptions}
        />
      </div>
    </section>
  )
}
