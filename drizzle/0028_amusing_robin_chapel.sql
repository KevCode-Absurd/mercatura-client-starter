CREATE INDEX `llm_calls_task_idx` ON `llm_calls` (`task`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `llm_calls_ledger_idx` ON `llm_calls` (`brand_id`,`task`,`model`,`status`,`input_tokens`,`cache_read_tokens`,`output_tokens`,`cost_usd`,`duration_ms`);
