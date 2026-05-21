import { redirect } from 'next/navigation';

// QA P1-6 2026-05-20: llms.txt prose lists "coordinators" as a stunts
// sub-index; AI crawlers dereference /stunts/coordinators. The actual
// roster (coordinators + performers) lives at /stunts/people, so redirect.
export default function Page(): never {
  redirect('/stunts/people');
}
