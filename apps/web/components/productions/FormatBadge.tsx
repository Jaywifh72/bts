interface Format {
  aspect_ratio: string;
  acquisition_format: string;
  label?: string | null;
}

export function FormatBadge({ format }: { format: Format }) {
  return (
    <span className="inline-flex items-center gap-1 rounded border border-zinc-700 bg-zinc-800 px-2 py-0.5 text-xs text-zinc-300">
      <span className="font-medium text-zinc-100">{format.aspect_ratio}</span>
      <span className="text-zinc-500">·</span>
      <span>{format.acquisition_format}</span>
      {format.label && (
        <>
          <span className="text-zinc-500">·</span>
          <span className="text-zinc-500">{format.label}</span>
        </>
      )}
    </span>
  );
}
