ALTER TABLE "pagamentos" ADD COLUMN "token_publico" text;--> statement-breakpoint
CREATE UNIQUE INDEX "pagamentos_token_idx" ON "pagamentos" USING btree ("token_publico");