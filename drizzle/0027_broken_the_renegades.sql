CREATE INDEX `jobs_activity_idx` ON `jobs` (`status`,`kind`,datetime("updated_at"));
