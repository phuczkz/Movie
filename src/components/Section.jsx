const Section = ({ title, children, action }) => (
  <section className="space-y-3">
    <div className="flex items-center justify-between">
      <h2 className="text-xl font-semibold text-white">{title}</h2>
      {action}
    </div>
    {children}
  </section>
);

export default Section;
