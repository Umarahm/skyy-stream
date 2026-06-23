import React from "react";
import Head from "next/head";
import SportsShell from "@/components/SportsShell";
import SportsLeaguePage from "@/components/SportsLeaguePage";

export default function SportsLeague() {
  return (
    <>
      <Head>
        <title>Rive Sports | League</title>
      </Head>
      <SportsShell>
        <SportsLeaguePage />
      </SportsShell>
    </>
  );
}
