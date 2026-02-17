import { Router } from "express";
import { prisma } from "../prisma";

const router = Router();

router.get("/url-records/:id", async (req, res, next) => {
  try {
    const record = await prisma.urlRecord.findUnique({
      where: { id: req.params.id },
    });
    if (!record) {
      res.status(404).json({ error: "URL record not found" });
      return;
    }
    res.json(record);
  } catch (err) {
    next(err);
  }
});

export default router;
