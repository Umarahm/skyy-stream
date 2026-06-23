import React from "react";
import Head from "next/head";
import FifaPageShell from "@/components/FifaPageShell";
import SportsStandingsTab from "@/components/SportsStandingsTab";

export default function SportsFifaStandings() {
  return (
    <>
      <Head>
        <title>Rive Sports | FIFA Standings</title>
      </Head>
      <FifaPageShell>
        <SportsStandingsTab sport="football" />
      </FifaPageShell>
    </>
  );
}
