import React from "react";
import Head from "next/head";
import FifaPageShell from "@/components/FifaPageShell";
import FifaNewsArticle from "@/components/FifaNewsArticle";

export default function SportsFifaNewsArticle() {
  return (
    <>
      <Head>
        <title>Rive Sports | FIFA News</title>
      </Head>
      <FifaPageShell>
        <FifaNewsArticle />
      </FifaPageShell>
    </>
  );
}
