import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.post("/projects", async (req, res, next) => {
  try {
    const { name, domain } = req.body;
    if (!name || !domain) {
      res.status(400).json({ error: "name and domain are required" });
      return;
    }
    const project = await prisma.project.create({
      data: { name, domain },
    });
    res.status(201).json(project);
  } catch (err) {
    next(err);
  }
});

router.get("/projects", async (_req, res, next) => {
  try {
    const projects = await prisma.project.findMany({
      orderBy: { createdAt: "desc" },
    });
    res.json(projects);
  } catch (err) {
    next(err);
  }
});

export default router;
