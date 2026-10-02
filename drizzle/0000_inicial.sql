CREATE TYPE "public"."funcao_equipe" AS ENUM('lider', 'auxiliar');--> statement-breakpoint
CREATE TYPE "public"."perfil" AS ENUM('gestao', 'administrativo', 'lider', 'auxiliar');--> statement-breakpoint
CREATE TYPE "public"."status_orcamento" AS ENUM('rascunho', 'enviado', 'aprovado', 'recusado');--> statement-breakpoint
CREATE TYPE "public"."tipo_cliente" AS ENUM('pessoa_fisica', 'arquiteto', 'construtora', 'empresa', 'imobiliaria');--> statement-breakpoint
CREATE TABLE "clientes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"tipo" "tipo_cliente" DEFAULT 'pessoa_fisica' NOT NULL,
	"nome" text NOT NULL,
	"documento" text,
	"telefone" text,
	"email" text,
	"saudacao" text,
	"endereco_cobranca" text,
	"indicado_por_id" uuid,
	"prazo_pagamento" text,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "empresas" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"slogan" text,
	"cnpj" text,
	"endereco" text,
	"telefone" text,
	"cidade" text,
	"logo_url" text,
	"chave_pix" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "equipe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"funcao" "funcao_equipe" DEFAULT 'auxiliar' NOT NULL,
	"telefone" text,
	"cor" text DEFAULT '#1e3a8a' NOT NULL,
	"diaria_padrao" numeric(12, 2) NOT NULL,
	"nr35" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "numeracao" (
	"empresa_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"ano" integer NOT NULL,
	"ultimo" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "numeracao_empresa_id_tipo_ano_pk" PRIMARY KEY("empresa_id","tipo","ano")
);
--> statement-breakpoint
CREATE TABLE "obras" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"cliente_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"endereco" text,
	"tipo_imovel" text,
	"area_m2" numeric(10, 2),
	"contato_local" text,
	"parceiro_id" uuid,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamento_eventos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"orcamento_id" uuid NOT NULL,
	"tipo" text NOT NULL,
	"descricao" text,
	"usuario_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orcamentos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"numero" text NOT NULL,
	"cliente_id" uuid NOT NULL,
	"obra_id" uuid NOT NULL,
	"vistoria_id" uuid,
	"servico_id" uuid,
	"status" "status_orcamento" DEFAULT 'rascunho' NOT NULL,
	"conteudo" jsonb NOT NULL,
	"precificacao" jsonb NOT NULL,
	"resultado" jsonb NOT NULL,
	"valor_final" numeric(12, 2) NOT NULL,
	"validade_dias" integer DEFAULT 7 NOT NULL,
	"liberado_por_id" uuid,
	"justificativa_liberacao" text,
	"token_publico" text NOT NULL,
	"enviado_em" timestamp with time zone,
	"aprovado_em" timestamp with time zone,
	"aprovado_ip" text,
	"recusado_em" timestamp with time zone,
	"motivo_recusa" text,
	"criado_por_id" uuid,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"atualizado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "servicos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"descricao" text,
	"preco_m2_min" numeric(12, 2),
	"preco_m2_max" numeric(12, 2),
	"exige_nr35" boolean DEFAULT false NOT NULL,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"id" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"expira_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"senha_hash" text NOT NULL,
	"perfil" "perfil" NOT NULL,
	"membro_equipe_id" uuid,
	"ativo" boolean DEFAULT true NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "vistoria_fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"vistoria_id" uuid NOT NULL,
	"arquivo" text NOT NULL,
	"legenda" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vistorias" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"empresa_id" uuid NOT NULL,
	"obra_id" uuid NOT NULL,
	"servico_id" uuid,
	"data" timestamp with time zone DEFAULT now() NOT NULL,
	"responsavel_id" uuid,
	"medicoes" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"nivel_sujeira" text,
	"necessita_andaime" boolean DEFAULT false NOT NULL,
	"observacoes" text,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "clientes" ADD CONSTRAINT "clientes_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "equipe" ADD CONSTRAINT "equipe_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "numeracao" ADD CONSTRAINT "numeracao_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "obras" ADD CONSTRAINT "obras_parceiro_id_clientes_id_fk" FOREIGN KEY ("parceiro_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_eventos" ADD CONSTRAINT "orcamento_eventos_orcamento_id_orcamentos_id_fk" FOREIGN KEY ("orcamento_id") REFERENCES "public"."orcamentos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamento_eventos" ADD CONSTRAINT "orcamento_eventos_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_cliente_id_clientes_id_fk" FOREIGN KEY ("cliente_id") REFERENCES "public"."clientes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_vistoria_id_vistorias_id_fk" FOREIGN KEY ("vistoria_id") REFERENCES "public"."vistorias"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_liberado_por_id_usuarios_id_fk" FOREIGN KEY ("liberado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orcamentos" ADD CONSTRAINT "orcamentos_criado_por_id_usuarios_id_fk" FOREIGN KEY ("criado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "servicos" ADD CONSTRAINT "servicos_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_membro_equipe_id_equipe_id_fk" FOREIGN KEY ("membro_equipe_id") REFERENCES "public"."equipe"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistoria_fotos" ADD CONSTRAINT "vistoria_fotos_vistoria_id_vistorias_id_fk" FOREIGN KEY ("vistoria_id") REFERENCES "public"."vistorias"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_empresa_id_empresas_id_fk" FOREIGN KEY ("empresa_id") REFERENCES "public"."empresas"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_obra_id_obras_id_fk" FOREIGN KEY ("obra_id") REFERENCES "public"."obras"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_servico_id_servicos_id_fk" FOREIGN KEY ("servico_id") REFERENCES "public"."servicos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vistorias" ADD CONSTRAINT "vistorias_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "orcamentos_numero_idx" ON "orcamentos" USING btree ("empresa_id","numero");--> statement-breakpoint
CREATE UNIQUE INDEX "orcamentos_token_idx" ON "orcamentos" USING btree ("token_publico");