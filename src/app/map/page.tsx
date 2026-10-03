"use client";

import dynamic from "next/dynamic";

// Map and URL state need the browser; skip server rendering for the app shell.
const App = dynamic(() => import("@/components/App"), { ssr: false });

export default function Page() {
  return <App />;
}
