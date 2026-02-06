const COUNTRY_OPTIONS = [
  { label: "Tất cả quốc gia", value: "" },
  { label: "Việt Nam", value: "viet-nam" },
  { label: "Hàn Quốc", value: "han-quoc" },
  { label: "Nhật Bản", value: "nhat-ban" },
  { label: "Trung Quốc", value: "trung-quoc" },
  { label: "Mỹ", value: "my" },
  { label: "Anh", value: "anh" },
  { label: "Thái Lan", value: "thai-lan" },
];

const CountryFilter = ({ value, onChange }) => {
  return (
    <div className="flex items-center gap-2 text-sm text-slate-200">
      <span className="text-slate-400">Quốc gia:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-slate-100 shadow-glass focus:border-emerald-400 focus:outline-none"
      >
        {COUNTRY_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default CountryFilter;
