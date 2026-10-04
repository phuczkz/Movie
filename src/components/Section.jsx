const ACCENT_COLORS = {
  indigo:  "from-indigo-500 to-purple-500 shadow-[0_0_12px_rgba(99,102,241,0.5)]",
  amber:   "from-amber-500 to-orange-500 shadow-[0_0_12px_rgba(245,158,11,0.5)]",
  emerald: "from-emerald-500 to-teal-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]",
  rose:    "from-rose-500 to-pink-500 shadow-[0_0_12px_rgba(244,63,94,0.5)]",
};

const Section = ({ title, children, action, accent = "indigo" }) => (
  <section className="space-y-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <span
          className={`h-6 w-1 rounded-full bg-gradient-to-b flex-shrink-0 ${
            ACCENT_COLORS[accent] ?? ACCENT_COLORS.indigo
          }`}
        />
        <h2 className="text-xl sm:text-2xl font-semibold text-white tracking-tight">
          {title}
        </h2>
      </div>
      {action}
    </div>
    {children}
  </section>
);

export default Section;
