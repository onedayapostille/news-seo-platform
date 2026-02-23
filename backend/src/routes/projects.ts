import { Router } from "express";
import { getPrisma } from "../prisma";
import { requireDb } from "../middleware/requireDb";

const router = Router();

router.post("/projects", requireDb, async (req, res, next) => {
  try {
    const { name, domain } = req.body;
    if (!name || !domain) {
      res.status(400).json({ error: "name and domain are required" });
      return;
    }
    const project = await getPrisma().project.create({
      data: { name, domain },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get("/projects", requireDb, async (_req, res, next) => {
  try {
    const projects = await getPrisma().project.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

export default router;
