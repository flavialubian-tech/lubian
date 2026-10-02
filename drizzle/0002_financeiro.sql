CREATE TYPE "public"."categoria_despesa" AS ENUM('transporte', 'alimentacao', 'produtos', 'locacao', 'outros', 'geral');--> statement-breakpoint
CREATE TYPE "public"."status_cobranca" AS ENUM('aberta', 'paga', 'cancelada');--> statement-breakpoint
CREATE TYPE "public"."tipo_cobranca" AS ENUM('sinal', 'saldo', 'fatura');--> statement-breakpoint
ALTER TYPE "public"."tipo_pagamento" ADD VALUE 'fatura';--> statement-breakpoint
CREATE TABLE "acertos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"membro_equipe_id" uuid NOT NULL,
	"de" date NOT NULL,
	"ate" date NOT NULL,
	"diarias" integer NOT NULL,
	"total_diarias" numeric(12, 2) NOT NULL,
	"total_vales" numeric(12, 2) NOT NULL,
	"liquido" numeric(12, 2) NOT NULL,
	"pago_em" date,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "cobrancas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"orcamento_id" uuid,
	"fatura_id" uuid,
	"tipo" "tipo_cobranca" NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"vencimento" date NOT NULL,
	"status" "status_cobranca" DEFAULT 'aberta' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "contratos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"obra_id" uuid NOT NULL,
	"dias_semana" integer[] NOT NULL,
	"diaria_base" numeric(12, 2) DEFAULT '180' NOT NULL,
	"desconto_antecipacao" numeric(5, 4) DEFAULT '0.10' NOT NULL,
	"diaria_especie" numeric(12, 2),
	"prazo_dias" integer DEFAULT 7 NOT NULL,
	"saudacao" text,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "despesas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"orcamento_id" uuid,
	"categoria" "categoria_despesa" NOT NULL,
	"descricao" text NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"data" date NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "faturas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"contrato_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"ano" integer NOT NULL,
	"mes" integer NOT NULL,
	"diarias_programadas" integer NOT NULL,
	"faltas" integer DEFAULT 0 NOT NULL,
	"calculo" jsonb NOT NULL,
	"calendario" jsonb NOT NULL,
	"emissao" date NOT NULL,
	"vencimento" date NOT NULL,
	"token_publico" text NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vales" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"membro_equipe_id" uuid NOT NULL,
	"valor" numeric(12, 2) NOT NULL,
	"data" date NOT NULL,
	"descricao" text,
	"acerto_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "pagamentos" ALTER COLUMN "orcamento_id" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "clientes" ADD COLUMN "prazo_dias_uteis" integer;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD COLUMN "cobranca_id" uuid;--> statement-breakpoint
ALTER TABLE "pagamentos" ADD COLUMN "recibo_numero" text;--> statement-breakpoint
ALTER TABLE "acertos" ADD CONSTRAINT "acertos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "acertos" ADD CONSTRAINT "acertos_membro_equipe_id_equipe_id_fk" FOREIGN KEY ("membro_equipe_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cobrancas" ADD CONSTRAINT "cobrancas_fatura_id_faturas_id_fk" FOREIGN KEY ("fatura_id") REFERENCES "public"."faturas"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "contratos" ADD CONSTRAINT "contratos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "despesas" ADD CONSTRAINT "despesas_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "faturas" ADD CONSTRAINT "faturas_contrato_id_contratos_id_fk" FOREIGN KEY ("contrato_id") REFERENCES "public"."contratos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vales" ADD CONSTRAINT "vales_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vales" ADD CONSTRAINT "vales_membro_equipe_id_equipe_id_fk" FOREIGN KEY ("membro_equipe_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vales" ADD CONSTRAINT "vales_acerto_id_acertos_id_fk" FOREIGN KEY ("acerto_id") REFERENCES "public"."acertos"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cobrancas_vencimento_idx" ON "cobrancas" USING btree ("empresa_id","status","vencimento");--> statement-breakpoint
CREATE UNIQUE INDEX "faturas_mes_idx" ON "faturas" USING btree ("contrato_id","ano","mes");--> statement-breakpoint
CREATE UNIQUE INDEX "faturas_token_idx" ON "faturas" USING btree ("token_publico");--> statement-breakpoint
ALTER TABLE "pagamentos" ADD CONSTRAINT "pagamentos_cobranca_id_cobrancas_id_fk" FOREIGN KEY ("cobranca_id") REFERENCES "public"."cobrancas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
-- Dados: cobranças (sinal e saldo) dos orçamentos já aprovados, ligando os pagamentos existentes.
INSERT INTO "cobrancas" ("empresa_id", "cliente_id", "orcamento_id", "tipo", "descricao", "valor", "vencimento", "status")
SELECT o."empresa_id", o."cliente_id", o."id", 'sinal', 'Sinal de Reserva da Agenda', (o."resultado"->>'sinal')::numeric,
  (COALESCE(o."aprovado_em", o."criado_em") AT TIME ZONE 'America/Sao_Paulo')::date,
  CASE WHEN EXISTS (SELECT 1 FROM "pagamentos" p WHERE p."orcamento_id" = o."id" AND p."tipo"::text = 'sinal') THEN 'paga'::"status_cobranca" ELSE 'aberta'::"status_cobranca" END
FROM "orcamentos" o WHERE o."status" = 'aprovado';--> statement-breakpoint
INSERT INTO "cobrancas" ("empresa_id", "cliente_id", "orcamento_id", "tipo", "descricao", "valor", "vencimento", "status")
SELECT o."empresa_id", o."cliente_id", o."id", 'saldo', 'Saldo Final - Conclusão do Serviço', (o."resultado"->>'saldo')::numeric,
  COALESCE(
    (o."entregue_em" AT TIME ZONE 'America/Sao_Paulo')::date,
    (SELECT max(d)::date FROM jsonb_array_elements_text(o."datas_previstas") d),
    (COALESCE(o."aprovado_em", o."criado_em") AT TIME ZONE 'America/Sao_Paulo')::date
  ),
  CASE WHEN EXISTS (SELECT 1 FROM "pagamentos" p WHERE p."orcamento_id" = o."id" AND p."tipo"::text = 'saldo') THEN 'paga'::"status_cobranca" ELSE 'aberta'::"status_cobranca" END
FROM "orcamentos" o WHERE o."status" = 'aprovado';--> statement-breakpoint
UPDATE "pagamentos" p SET "cobranca_id" = c."id"
FROM "cobrancas" c
WHERE p."cobranca_id" IS NULL AND c."orcamento_id" = p."orcamento_id" AND c."tipo"::text = p."tipo"::text;
