import React from "react";
import Head from "next/head";
import SportsShell from "@/components/SportsShell";
import SportsLiveTab from "@/components/SportsLiveTab";

export default function SportsLive() {
  return (
    <>
      <Head>
        <title>Rive Sports | Live</title>
      </Head>
      <SportsShell>
        <SportsLiveTab />
      </SportsShell>
    </>
  );
}
