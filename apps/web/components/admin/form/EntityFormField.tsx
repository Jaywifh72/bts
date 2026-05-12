import type { FieldConfig } from '@/lib/admin/entity-registry';
import { SlugField } from './SlugField';
import { TagsField } from './TagsField';
import { ReferencesField } from './ReferencesField';
import { KvArrayField } from './KvArrayField';
import { PhotosField } from './PhotosField';

/**
 * Server component dispatcher that renders the right field component
 * based on FieldConfig.type. Keeps the page-level form clean and
 * makes adding new field types a one-line addition here.
 *
 * `existingValue` (optional) is the row's current value when this
 * field is being rendered as part of an edit form. Each control
 * type uses it as the relevant default — text/url/number → input
 * defaultValue, tags → array prop, references → array prop, etc.
 */
export function EntityFormField({
  field,
  existingValue,
}: {
  field: FieldConfig;
  existingValue?: unknown;
}) {
  const baseInputClass =
    'mt-1 w-full rounded border border-zinc-700 bg-zinc-950/60 px-3 py-1.5 text-sm text-zinc-100 focus:border-amber-700 focus:outline-none';

  let control: React.ReactNode;
  switch (field.type) {
    case 'slug':
      control = (
        <SlugField
          name={field.name}
          placeholder={field.placeholder}
          required={field.required}
          defaultValue={typeof existingValue === 'string' ? existingValue : undefined}
        />
      );
      break;
    case 'tags':
      control = (
        <TagsField
          name={field.name}
          placeholder={field.placeholder}
          defaultValue={Array.isArray(existingValue) ? existingValue.map(String) : undefined}
        />
      );
      break;
    case 'references':
      control = (
        <ReferencesField
          name={field.name}
          defaultValue={Array.isArray(existingValue) ? (existingValue as Array<{ title: string; url: string; publication?: string; kind?: string }>) : undefined}
        />
      );
      break;
    case 'kv-array':
      control = (
        <KvArrayField
          name={field.name}
          itemKeys={field.itemKeys ?? [
            { key: 'heading', label: 'Heading', type: 'text' },
            { key: 'detail', label: 'Detail', type: 'textarea' },
          ]}
          defaultValue={Array.isArray(existingValue) ? (existingValue as Array<Record<string, string>>) : undefined}
        />
      );
      break;
    case 'photo-array':
      control = (
        <PhotosField
          name={field.name}
          defaultValue={Array.isArray(existingValue) ? (existingValue as Array<{ url: string; caption: string; credit?: string }>) : undefined}
        />
      );
      break;
    case 'select':
      control = (
        <select
          name={field.name}
          required={field.required}
          defaultValue={typeof existingValue === 'string' ? existingValue : ''}
          className={`${baseInputClass} font-mono`}
        >
          <option value="" disabled>
            — choose —
          </option>
          {(field.options ?? []).map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      );
      break;
    case 'markdown':
      control = (
        <textarea
          name={field.name}
          rows={field.rows ?? 6}
          required={field.required}
          placeholder={field.placeholder}
          defaultValue={typeof existingValue === 'string' ? existingValue : undefined}
          className={`${baseInputClass} resize-y leading-relaxed`}
        />
      );
      break;
    case 'textarea':
      control = (
        <textarea
          name={field.name}
          rows={field.rows ?? 3}
          required={field.required}
          placeholder={field.placeholder}
          defaultValue={typeof existingValue === 'string' ? existingValue : undefined}
          className={`${baseInputClass} resize-y`}
        />
      );
      break;
    case 'date':
      control = (
        <input
          name={field.name}
          type="date"
          defaultValue={typeof existingValue === 'string' ? existingValue.slice(0, 10) : undefined}
          className={`${baseInputClass} font-mono`}
        />
      );
      break;
    case 'integer':
      control = (
        <input
          name={field.name}
          type="number"
          step={1}
          required={field.required}
          placeholder={field.placeholder}
          defaultValue={
            typeof existingValue === 'number'
              ? existingValue
              : typeof field.default === 'number' ? field.default : undefined
          }
          className={`${baseInputClass} font-mono`}
        />
      );
      break;
    case 'number':
      control = (
        <input
          name={field.name}
          type="number"
          required={field.required}
          placeholder={field.placeholder}
          defaultValue={typeof existingValue === 'number' ? existingValue : undefined}
          className={`${baseInputClass} font-mono`}
        />
      );
      break;
    case 'url':
      control = (
        <input
          name={field.name}
          type="url"
          required={field.required}
          placeholder={field.placeholder}
          defaultValue={typeof existingValue === 'string' ? existingValue : undefined}
          className={`${baseInputClass} font-mono`}
        />
      );
      break;
    case 'text':
    default:
      control = (
        <input
          name={field.name}
          type="text"
          required={field.required}
          placeholder={field.placeholder}
          defaultValue={
            typeof existingValue === 'string'
              ? existingValue
              : typeof field.default === 'string' ? field.default : undefined
          }
          className={baseInputClass}
        />
      );
      break;
  }

  return (
    <label className="block">
      <span className="block text-[10px] uppercase tracking-wide text-zinc-500">
        {field.label}
        {field.required && <span className="ml-1 text-amber-500">*</span>}
      </span>
      {control}
      {field.hint && (
        <span className="mt-1 block text-[10px] text-zinc-500">{field.hint}</span>
      )}
    </label>
  );
}
