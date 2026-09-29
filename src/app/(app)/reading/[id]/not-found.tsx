import Link from "next/link";
import { Hand } from "lucide-react";

export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-24 text-center">
      <Hand className="h-12 w-12 text-brass" />
      <h1 className="mt-4 font-serif text-3xl text-maroon">Reading not found</h1>
      <p className="mt-2 text-umber">It may have been deleted, or the link is incorrect.</p>
      <Link href="/upload" className="btn-primary mt-6">
        Start a new reading
      </Link>
    </div>
  );
}
