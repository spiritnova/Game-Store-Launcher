import { notFound } from 'next/navigation'

// Any URL that matches no page: show the 404 inside the launcher (app/(launcher)/not-found.js)
export default function Missing() {
  notFound()
}
