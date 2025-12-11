"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Carichiamo la MainNavbar solo lato client (niente SSR)
const MainNavbar = dynamic(
  () => import("./MainNavbar/MainNavbar"),
  { ssr: false }
);

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Niente navbar in home
  if (pathname === "/") {
    return null;
  }

  // Navbar solo nelle altre pagine, e solo lato client
  return <MainNavbar />;
}
