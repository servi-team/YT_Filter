CREATE TYPE "public"."hedef_turu" AS ENUM('kanal', 'video');--> statement-breakpoint
CREATE TYPE "public"."oge_turu" AS ENUM('konu', 'etiket');--> statement-breakpoint
CREATE TYPE "public"."oy_degeri" AS ENUM('up', 'kararsiz', 'down');--> statement-breakpoint
CREATE TYPE "public"."rol" AS ENUM('editor', 'admin');--> statement-breakpoint
CREATE TYPE "public"."talep_durumu" AS ENUM('bekliyor', 'kabul', 'red');--> statement-breakpoint
CREATE TABLE "ekleme_talepleri" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hedef_turu" "hedef_turu" NOT NULL,
	"anahtar" text NOT NULL,
	"link" text NOT NULL,
	"durum" "talep_durumu" DEFAULT 'bekliyor' NOT NULL,
	"talep_sayisi" integer DEFAULT 1 NOT NULL,
	"ilk_talep" timestamp with time zone DEFAULT now() NOT NULL,
	"son_talep" timestamp with time zone DEFAULT now() NOT NULL,
	"isleyen" uuid
);
--> statement-breakpoint
CREATE TABLE "engeller" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tur" text NOT NULL,
	"deger" text NOT NULL,
	"sebep" text,
	"yapan" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"bitis" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "hesaplar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"eposta" text NOT NULL,
	"parola_ozeti" text NOT NULL,
	"rol" "rol" NOT NULL,
	"aktif" boolean DEFAULT true NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kanallar" (
	"id" text PRIMARY KEY NOT NULL,
	"handle" text,
	"ad" text,
	"ekleyen" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "kilitler" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hedef_turu" "hedef_turu" NOT NULL,
	"hedef_id" text NOT NULL,
	"yapan" uuid,
	"gerekce" text NOT NULL,
	"sonuc" jsonb NOT NULL,
	"kilit_zamani" timestamp with time zone DEFAULT now() NOT NULL,
	"acilis_zamani" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "moderasyon_kayitlari" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"islem" text NOT NULL,
	"yapan" uuid,
	"hedef_turu" "hedef_turu",
	"hedef_id" text,
	"gerekce" text,
	"ayrinti" jsonb,
	"zaman" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "oylar" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"hedef_turu" "hedef_turu" NOT NULL,
	"hedef_id" text NOT NULL,
	"oge_turu" "oge_turu" NOT NULL,
	"oge_id" text NOT NULL,
	"deger" "oy_degeri" NOT NULL,
	"tarayici_id" text NOT NULL,
	"ip_ozeti" text,
	"geri_alindi" boolean DEFAULT false NOT NULL,
	"geri_alan" uuid,
	"geri_alma_gerekce" text,
	"geri_alma_zamani" timestamp with time zone,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"guncelleme" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videolar" (
	"id" text PRIMARY KEY NOT NULL,
	"baslik" text,
	"kanal_id" text,
	"ekleyen" uuid,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "yayin_surumleri" (
	"veri_surumu" integer PRIMARY KEY NOT NULL,
	"olusturma" timestamp with time zone DEFAULT now() NOT NULL,
	"kanal_sayisi" integer NOT NULL,
	"video_sayisi" integer NOT NULL,
	"onaylayan" uuid,
	"icerik" jsonb NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ekleme_talepleri" ADD CONSTRAINT "ekleme_talepleri_isleyen_hesaplar_id_fk" FOREIGN KEY ("isleyen") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "engeller" ADD CONSTRAINT "engeller_yapan_hesaplar_id_fk" FOREIGN KEY ("yapan") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kanallar" ADD CONSTRAINT "kanallar_ekleyen_hesaplar_id_fk" FOREIGN KEY ("ekleyen") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "kilitler" ADD CONSTRAINT "kilitler_yapan_hesaplar_id_fk" FOREIGN KEY ("yapan") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "moderasyon_kayitlari" ADD CONSTRAINT "moderasyon_kayitlari_yapan_hesaplar_id_fk" FOREIGN KEY ("yapan") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "oylar" ADD CONSTRAINT "oylar_geri_alan_hesaplar_id_fk" FOREIGN KEY ("geri_alan") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videolar" ADD CONSTRAINT "videolar_kanal_id_kanallar_id_fk" FOREIGN KEY ("kanal_id") REFERENCES "public"."kanallar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videolar" ADD CONSTRAINT "videolar_ekleyen_hesaplar_id_fk" FOREIGN KEY ("ekleyen") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "yayin_surumleri" ADD CONSTRAINT "yayin_surumleri_onaylayan_hesaplar_id_fk" FOREIGN KEY ("onaylayan") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "talepler_tekil" ON "ekleme_talepleri" USING btree ("hedef_turu","anahtar");--> statement-breakpoint
CREATE UNIQUE INDEX "engeller_tekil" ON "engeller" USING btree ("tur","deger");--> statement-breakpoint
CREATE UNIQUE INDEX "hesaplar_eposta_tekil" ON "hesaplar" USING btree (lower("eposta"));--> statement-breakpoint
CREATE UNIQUE INDEX "kanallar_handle_tekil" ON "kanallar" USING btree (lower("handle")) WHERE "kanallar"."handle" is not null;--> statement-breakpoint
CREATE UNIQUE INDEX "kilitler_aktif_tekil" ON "kilitler" USING btree ("hedef_turu","hedef_id") WHERE "kilitler"."acilis_zamani" is null;--> statement-breakpoint
CREATE UNIQUE INDEX "oylar_tekil" ON "oylar" USING btree ("hedef_turu","hedef_id","oge_turu","oge_id","tarayici_id");--> statement-breakpoint
CREATE INDEX "oylar_hedef" ON "oylar" USING btree ("hedef_turu","hedef_id");--> statement-breakpoint
CREATE INDEX "oylar_ip_zaman" ON "oylar" USING btree ("ip_ozeti","guncelleme");