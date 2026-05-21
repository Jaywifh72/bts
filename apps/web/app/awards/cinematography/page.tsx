import { redirect } from 'next/navigation';

// QA P1-6 2026-05-20: llms.txt prose lists "Awards: wins and nominations
// by craft" and AI crawlers naturally dereference /awards/<craft>. The
// canonical craft page lives at /awards/craft/cinematography, so redirect.
export default function Page(): never {
  redirect('/awards/craft/cinematography');
}
