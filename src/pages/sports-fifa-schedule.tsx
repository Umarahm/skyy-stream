import React from "react";
import Head from "next/head";
import FifaPageShell from "@/components/FifaPageShell";
import SportsScheduleTab from "@/components/SportsScheduleTab";

export default function SportsFifaSchedule() {
  return (
    <>
      <Head>
        <title>Rive Sports | FIFA Schedule</title>
      </Head>
      <FifaPageShell>
        <SportsScheduleTab sport="football" />
      </FifaPageShell>
    </>
  );
}
