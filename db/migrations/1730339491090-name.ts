import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1730339491090 implements MigrationInterface {
    name = 'Name1730339491090'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TABLE "follows" ("id" SERIAL NOT NULL, "followerId" character varying, "followingId" character varying, CONSTRAINT "PK_8988f607744e16ff79da3b8a627" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TYPE "public"."reaction_entity_reactiontype_enum" RENAME TO "reaction_entity_reactiontype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reaction_entity_reactiontype_enum" AS ENUM('Like', 'Love', 'Sad', 'Haha', 'Wow', 'Angry')`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ALTER COLUMN "reactionType" TYPE "public"."reaction_entity_reactiontype_enum" USING "reactionType"::"text"::"public"."reaction_entity_reactiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reaction_entity_reactiontype_enum_old"`);
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_fdb91868b03a2040db408a53331" FOREIGN KEY ("followerId") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_ef463dd9a2ce0d673350e36e0fb" FOREIGN KEY ("followingId") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_ef463dd9a2ce0d673350e36e0fb"`);
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_fdb91868b03a2040db408a53331"`);
        await queryRunner.query(`CREATE TYPE "public"."reaction_entity_reactiontype_enum_old" AS ENUM('Like', 'Love', 'Sad', 'Haha', 'wow', 'Angry')`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ALTER COLUMN "reactionType" TYPE "public"."reaction_entity_reactiontype_enum_old" USING "reactionType"::"text"::"public"."reaction_entity_reactiontype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."reaction_entity_reactiontype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reaction_entity_reactiontype_enum_old" RENAME TO "reaction_entity_reactiontype_enum"`);
        await queryRunner.query(`DROP TABLE "follows"`);
    }

}
