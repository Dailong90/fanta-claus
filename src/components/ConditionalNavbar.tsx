"use client";

import dynamic from "next/dynamic";

// Carichiamo la MainNavbar solo lato client (niente SSR)
const MainNavbar = dynamic(
  () => import("./MainNavbar/MainNavbar"),
  { ssr: false }
);

export default function ConditionalNavbar() {
  // Mostra SEMPRE la navbar (anche in home)
  // Il fatto che da non loggato mostri solo "Home"
  // e da loggato anche il resto è già gestito dentro MainNavbar.
  return <MainNavbar />;
}
