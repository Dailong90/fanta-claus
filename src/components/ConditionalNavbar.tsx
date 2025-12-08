"use client";

import { usePathname } from "next/navigation";
import MainNavbar from "./MainNavbar/MainNavbar";

export default function ConditionalNavbar() {
  const pathname = usePathname();

  // Nascondi navbar solo in home
  if (pathname === "/") return null;

  return <MainNavbar />;
}
