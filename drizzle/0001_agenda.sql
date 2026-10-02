CREATE TYPE "public"."forma_pagamento" AS ENUM('pix', 'dinheiro', 'cartao', 'transferencia');--> statement-breakpoint
CREATE TYPE "public"."presenca" AS ENUM('presente', 'falta');--> statement-breakpoint
CREATE TYPE "public"."status_alocacao" AS ENUM('pre_reserva', 'confirmada', 'concluida', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."tipo_pagamento" AS ENUM('sinal', 'saldo');--> statement-breakpoint
CREATE TABLE "alocacoes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"orcamento_id" uuid NOT NULL,
	"obra_id" uuid NOT NULL,
	"membro_equipe_id" uuid NOT NULL,
	"data" date NOT NULL,
	"status" "status_alocacao" DEFAULT 'pre_reserva' NOT NULL,
	"presenca" "presenca",
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "bloqueios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"membro_equipe_id" uuid,
	"data_inicio" date NOT NULL,
	"data_fim" date NOT NULL,
	"motivo" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "pagamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"orcamento_id" uuid NOT NULL,
	"tipo" "tipo_pagamento" NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"forma" "forma_pagamento" NOT NULL,
	"pago_em" date NOT NULL,
	"comprovante" text,
	"registrado_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "orcamentos" ADD COLUMN "datas_previstas" jsonb DEFAULT '[]'::jsonb NOT NULL;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD COLUMN "entregue_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "alocacoes" ADD CONSTRAINT "alocacoes_membro_equipe_id_equipe_id_fk" FOREIGN KEY ("membro_equipe_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bloqueios" ADD CONSTRAINT "bloqueios_membro_equipe_id_equipe_id_fk" FOREIGN KEY ("membro_equipe_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_registrado_por_id_usuarios_id_fk" FOREIGN KEY ("registrado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "alocacoes_data_idx" ON "alocacoes" USING btree ("empresa_id","data");