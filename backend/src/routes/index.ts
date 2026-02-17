import { Router } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import analyzeUrlRouter from "./analyzeUrl";
import urlRecordsRouter from "./urlRecords";
import crawlRunsRouter from "./crawlRuns";

const router = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(analyzeUrlRouter);
router.use(urlRecordsRouter);
router.use(crawlRunsRouter);

export default router;
