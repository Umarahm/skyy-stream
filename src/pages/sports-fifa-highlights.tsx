import React from "react";
import Head from "next/head";
import FifaPageShell from "@/components/FifaPageShell";
import FifaHighlights from "@/components/FifaHighlights";

export default function SportsFifaHighlightsPage() {
  return (
    <>
      <Head>
        <title>Rive Sports | FIFA Highlights</title>
      </Head>
      <FifaPageShell>
        <FifaHighlights />
      </FifaPageShell>
    </>
  );
}
