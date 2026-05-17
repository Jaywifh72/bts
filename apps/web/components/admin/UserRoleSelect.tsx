'use client';

import { useState, useTransition } from 'react';
import { updateUserRoleAction } from '../../app/admin/(authenticated)/users/actions';

type Role = 'admin' | 'super_user' | 'premium' | 'standard';

const ROLE_OPTIONS: { value: Role; label: string }[] = [
  { value: 'admin', label: 'Admin' },
  { value: 'super_user', label: 'Super User' },
  { value: 'premium', label: 'Premium' },
  { value: 'standard', label: 'Standard' },
];

export function UserRoleSelect({
  userId,
  currentRole,
  disabled = false,
}: {
  userId: string;
  currentRole: Role;
  disabled?: boolean;
}) {
  const [role, setRole] = useState<Role>(currentRole);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onChange(next: Role) {
    if (next === role) return;
    setError(null);
    const previous = role;
    setRole(next); // optimistic
    startTransition(async () => {
      const result = await updateUserRoleAction(userId, next);
      if (!result.ok) {
        setRole(previous);
        setError(result.error);
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <select
        value={role}
        onChange={(e) => onChange(e.target.value as Role)}
        disabled={disabled || pending}
        className="rounded border border-zinc-800 bg-zinc-900 px-2 py-1 text-xs text-zinc-50 disabled:opacity-50"
      >
        {ROLE_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {pending && <span className="text-[10px] text-zinc-500">Saving…</span>}
      {error && (
        <span className="max-w-[200px] text-right text-[10px] text-amber-400" role="alert">
          {error}
        </span>
      )}
    </div>
  );
}
