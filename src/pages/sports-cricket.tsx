import React from "react";
import Head from "next/head";
import SportsShell from "@/components/SportsShell";
import SportsCricketTab from "@/components/SportsCricketTab";

export default function SportsCricket() {
  return (
    <>
      <Head>
        <title>Rive Sports | Cricket</title>
      </Head>
      <SportsShell>
        <SportsCricketTab />
      </SportsShell>
    </>
  );
}
