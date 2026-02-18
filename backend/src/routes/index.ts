import { Router } from "express";
import healthRouter from "./health";
import projectsRouter from "./projects";
import analyzeUrlRouter from "./analyzeUrl";
import urlRecordsRouter from "./urlRecords";
import crawlRunsRouter from "./crawlRuns";
import crawlsRouter from "./crawls";
import clustersRouter from "./clusters";

const router = Router();

router.use(healthRouter);
router.use(projectsRouter);
router.use(analyzeUrlRouter);
router.use(urlRecordsRouter);
router.use(crawlRunsRouter);
router.use(crawlsRouter);
router.use(clustersRouter);

export default router;
