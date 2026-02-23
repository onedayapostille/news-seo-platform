import { Router } from "express";
import { getPrisma } from "../prisma";
import { requireDb } from "../middleware/requireDb";

const router = Router();

router.get("/url-records/:id", requireDb, async (req, res, next) => {
  try {
    const record = await getPrisma().urlRecord.findUnique({
      where: { id: req.params.id as string },
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
