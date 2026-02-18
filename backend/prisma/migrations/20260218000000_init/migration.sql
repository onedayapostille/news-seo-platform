-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "crawl_runs" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "start_url" TEXT,
    "max_urls" INTEGER NOT NULL DEFAULT 1,
    "max_depth" INTEGER NOT NULL DEFAULT 0,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "progress_json" JSONB,

    CONSTRAINT "crawl_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "url_records" (
    "id" TEXT NOT NULL,
    "crawl_run_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "normalized_url" TEXT NOT NULL,
    "section" TEXT,
    "template_group" TEXT,
    "status_code" INTEGER,
    "canonical" TEXT,
    "robots_meta" TEXT,
    "title" TEXT,
    "meta_description" TEXT,
    "h1_count" INTEGER,
    "word_count" INTEGER,
    "internal_links_count" INTEGER,
    "external_links_count" INTEGER,
    "issues_json" JSONB,
    "analyzed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "url_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "issue_clusters" (
    "id" TEXT NOT NULL,
    "crawl_run_id" TEXT NOT NULL,
    "template_group" TEXT,
    "section" TEXT,
    "issue_code" TEXT NOT NULL,
    "affected_count" INTEGER NOT NULL,
    "sample_urls_json" JSONB NOT NULL,
    "root_cause_hint" TEXT NOT NULL,
    "dev_fix_suggestion" TEXT NOT NULL,
    "validation_steps" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "issue_clusters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "url_records_normalized_url_idx" ON "url_records"("normalized_url");

-- CreateIndex
CREATE INDEX "issue_clusters_crawl_run_id_idx" ON "issue_clusters"("crawl_run_id");

-- AddForeignKey
ALTER TABLE "crawl_runs" ADD CONSTRAINT "crawl_runs_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "url_records" ADD CONSTRAINT "url_records_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "issue_clusters" ADD CONSTRAINT "issue_clusters_crawl_run_id_fkey" FOREIGN KEY ("crawl_run_id") REFERENCES "crawl_runs"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
