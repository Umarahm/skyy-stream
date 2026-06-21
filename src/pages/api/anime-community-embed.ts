import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  _req: NextApiRequest,
  res: NextApiResponse,
) {
  try {
    const response = await fetch("https://theanimecommunity.com/embed.js", {
      method: "GET",
      headers: {
        Accept: "application/javascript,text/javascript,*/*;q=0.1",
      },
    });
    if (!response.ok) {
      res.setHeader("content-type", "application/javascript; charset=utf-8");
      res.setHeader("cache-control", "public, max-age=60");
      res.status(502).send("/* anime community unavailable */");
      return;
    }
    const script = await response.text();
    res.setHeader("content-type", "application/javascript; charset=utf-8");
    res.setHeader("cache-control", "public, max-age=300");
    res.status(200).send(script);
  } catch (_error) {
    res.setHeader("content-type", "application/javascript; charset=utf-8");
    res.status(500).send("/* anime community fetch failed */");
  }
}
