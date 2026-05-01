interface SectionHeaderProps {
  label: string;
  heading: string;
}

export function SectionHeader({ label, heading }: SectionHeaderProps) {
  return (
    <div className="mb-4 border-l-2 border-amber-400 pl-3">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">{label}</p>
      <h2 className="text-lg font-semibold text-zinc-50">{heading}</h2>
    </div>
  );
}
