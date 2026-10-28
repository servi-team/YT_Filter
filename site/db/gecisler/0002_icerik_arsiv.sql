ALTER TABLE "oylar" RENAME COLUMN "geri_alindi" TO "moderasyon_geri_alindi";--> statement-breakpoint
ALTER TABLE "videolar" DROP CONSTRAINT "videolar_kanal_id_kanallar_id_fk";
--> statement-breakpoint
ALTER TABLE "ekleme_talepleri" ADD COLUMN "red_gerekce" text;--> statement-breakpoint
ALTER TABLE "kanallar" ADD COLUMN "avatar" text;--> statement-breakpoint
ALTER TABLE "kanallar" ADD COLUMN "meta_guncelleme" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "kanallar" ADD COLUMN "arsivlendi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "kanallar" ADD COLUMN "arsivleyen" uuid;--> statement-breakpoint
ALTER TABLE "oylar" ADD COLUMN "ziyaretci_geri_alindi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videolar" ADD COLUMN "kanal_adi" text;--> statement-breakpoint
ALTER TABLE "videolar" ADD COLUMN "kanal_handle" text;--> statement-breakpoint
ALTER TABLE "videolar" ADD COLUMN "kanal_avatar" text;--> statement-breakpoint
ALTER TABLE "videolar" ADD COLUMN "meta_guncelleme" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "videolar" ADD COLUMN "arsivlendi" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "videolar" ADD COLUMN "arsivleyen" uuid;--> statement-breakpoint
ALTER TABLE "yayin_surumleri" ADD COLUMN "notlar" text;--> statement-breakpoint
ALTER TABLE "kanallar" ADD CONSTRAINT "kanallar_arsivleyen_hesaplar_id_fk" FOREIGN KEY ("arsivleyen") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "videolar" ADD CONSTRAINT "videolar_arsivleyen_hesaplar_id_fk" FOREIGN KEY ("arsivleyen") REFERENCES "public"."hesaplar"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "engeller_bitis" ON "engeller" USING btree ("bitis");--> statement-breakpoint
CREATE INDEX "kanallar_arsiv" ON "kanallar" USING btree ("arsivlendi");--> statement-breakpoint
CREATE INDEX "videolar_arsiv" ON "videolar" USING btree ("arsivlendi");--> statement-breakpoint
CREATE INDEX "videolar_kanal" ON "videolar" USING btree ("kanal_id");