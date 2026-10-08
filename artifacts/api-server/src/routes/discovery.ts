import { Router, type IRouter } from "express";
import { GetDiscoveryResponse } from "@workspace/api-zod";
import { demoBands } from "../lib/demo-bands";

const router: IRouter = Router();

router.get("/discovery", (_req, res): void => {
  res.setHeader("Cache-Control", "no-store");
  res.json(GetDiscoveryResponse.parse({
    bands: demoBands,
    // Recovery preview is read-only; no write authorization is issued.
    csrf: "",
    rotation: { cycle: 0, served: 0, eligible: 0, remaining: 0, totalTurns: 0 },
  }));
});

export default router;
