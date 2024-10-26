import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1729935870463 implements MigrationInterface {
    name = 'Name1729935870463'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."reaction_entity_reactiontype_enum" RENAME TO "reaction_entity_reactiontype_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."reaction_entity_reactiontype_enum" AS ENUM('Like', 'Love', 'Sad', 'Haha', 'wow', 'Angry')`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ALTER COLUMN "reactionType" TYPE "public"."reaction_entity_reactiontype_enum" USING "reactionType"::"text"::"public"."reaction_entity_reactiontype_enum"`);
        await queryRunner.query(`DROP TYPE "public"."reaction_entity_reactiontype_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reaction_entity_reactiontype_enum_old" AS ENUM('like', 'love', 'sad', 'haha', 'wow', 'angry')`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ALTER COLUMN "reactionType" TYPE "public"."reaction_entity_reactiontype_enum_old" USING "reactionType"::"text"::"public"."reaction_entity_reactiontype_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."reaction_entity_reactiontype_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."reaction_entity_reactiontype_enum_old" RENAME TO "reaction_entity_reactiontype_enum"`);
    }

}
