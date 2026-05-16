import { AnchorCopyButton } from './AnchorCopyButton';

interface SectionHeaderProps {
  label: string;
  heading: string;
  /** When set, renders a `#` copy-link button alongside the heading.
   *  Should match the id of the enclosing `<section id="…">`. */
  anchorId?: string;
}

export function SectionHeader({ label, heading, anchorId }: SectionHeaderProps) {
  return (
    <div className="mb-4 border-l-2 border-amber-400 pl-3">
      <p className="text-xs font-medium uppercase tracking-widest text-zinc-400">{label}</p>
      <h2 className="text-lg font-semibold text-zinc-50">
        {heading}
        {anchorId && <AnchorCopyButton anchorId={anchorId} />}
      </h2>
    </div>
  );
}
