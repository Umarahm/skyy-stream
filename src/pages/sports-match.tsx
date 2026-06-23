import React from "react";
import Head from "next/head";
import SportsShell from "@/components/SportsShell";
import SportsMatchDetail from "@/components/SportsMatchDetail";

export default function SportsMatch() {
  return (
    <>
      <Head>
        <title>Rive Sports | Match Details</title>
      </Head>
      <SportsShell>
        <SportsMatchDetail />
      </SportsShell>
    </>
  );
}
