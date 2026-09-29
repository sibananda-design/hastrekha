import { redirect } from "next/navigation";

// Middleware normally redirects "/" already; this is a fallback.
export default function Home() {
  redirect("/login");
}
