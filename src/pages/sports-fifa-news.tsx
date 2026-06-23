import React from "react";
import Head from "next/head";
import FifaPageShell from "@/components/FifaPageShell";
import FifaNewsPage from "@/components/FifaNewsPage";

export default function SportsFifaNews() {
  return (
    <>
      <Head>
        <title>Rive Sports | FIFA News</title>
      </Head>
      <FifaPageShell>
        <FifaNewsPage />
      </FifaPageShell>
    </>
  );
}
