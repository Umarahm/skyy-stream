import React from "react";
import SchedulePage from "@/components/SchedulePage";
import Head from "next/head";

export default function Schedule() {
  return (
    <>
      <Head>
        <title>Rive | Weekly Schedule</title>
      </Head>
      <SchedulePage />
    </>
  );
}