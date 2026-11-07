CREATE TABLE "hiz_limitleri" (
	"anahtar" text NOT NULL,
	"pencere" timestamp with time zone NOT NULL,
	"sayac" integer DEFAULT 0 NOT NULL,
	CONSTRAINT "hiz_limitleri_anahtar_pencere_pk" PRIMARY KEY("anahtar","pencere")
);
--> statement-breakpoint
CREATE TABLE "oturumlar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_ozeti" text NOT NULL,
	"hesap_id" uuid NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"son_kullanma" timestamp with time zone NOT NULL,
	"son_gorulme" timestamp with time zone DEFAULT now() NOT NULL,
	"ip_ozeti" text,
	CONSTRAINT "oturumlar_token_ozeti_unique" UNIQUE("token_ozeti")
);
--> statement-breakpoint
ALTER TABLE "hesaplar" ADD COLUMN "parola_degistirmeli" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "hesaplar" ADD COLUMN "son_giris" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "oturumlar" ADD CONSTRAINT "oturumlar_hesap_id_hesaplar_id_fk" FOREIGN KEY ("hesap_id") REFERENCES "public"."hesaplar"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "hiz_limitleri_pencere" ON "hiz_limitleri" USING btree ("pencere");--> statement-breakpoint
CREATE INDEX "oturumlar_hesap" ON "oturumlar" USING btree ("hesap_id");