'use client';

import { useState } from 'react';

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['`]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Slug input with a "from name" button that derives the slug from the
 * sibling name field. Sibling is identified by the `nameField` prop.
 */
export function SlugField({
  name,
  defaultValue,
  placeholder,
  required,
  nameField = 'name',
}: {
  name: string;
  defaultValue?: string;
  placeholder?: string;
  required?: boolean;
  nameField?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? '');

  function fromName() {
    const form = document.activeElement?.closest('form');
    const nameInput = form?.querySelector(`[name="${nameField}"]`) as HTMLInputElement | null;
    const nm = nameInput?.value?.trim();
    if (nm) setValue(slugify(nm));
  }

  return (
    <div className="flex gap-2">
      <input
        name={name}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="flex-1 rounded border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 font-mono text-sm text-zinc-100 focus:border-amber-700 focus:outline-none"
      />
      <button
        type="button"
        onClick={fromName}
        className="shrink-0 rounded border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-amber-700 hover:text-amber-400"
        title={`Generate from ${nameField}`}
      >
        ↺ from {nameField}
      </button>
    </div>
  );
}
