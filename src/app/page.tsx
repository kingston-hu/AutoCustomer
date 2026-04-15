import { redirect } from "next/navigation";

export default function Home() {
  // (dashboard) is a route group — its pages serve at "/"
  // This root page redirects to the first meaningful page: developers
  redirect("/developers");
}
