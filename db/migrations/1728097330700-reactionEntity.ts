import { MigrationInterface, QueryRunner } from "typeorm";

export class ReactionEntity1728097330700 implements MigrationInterface {
    name = 'ReactionEntity1728097330700'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."reaction_entity_reactiontype_enum" AS ENUM('like', 'love', 'sad', 'haha', 'wow', 'angry')`);
        await queryRunner.query(`CREATE TABLE "reaction_entity" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "reactionType" "public"."reaction_entity_reactiontype_enum" NOT NULL, "userId" character varying, "postId" integer, CONSTRAINT "PK_b7a6f92ef8ca527f22c1a733170" PRIMARY KEY ("id"))`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD CONSTRAINT "FK_ec42c5a5dfd35f948b93cdf04f7" FOREIGN KEY ("userId") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD CONSTRAINT "FK_9bb35f70f78a3a7b368d4719474" FOREIGN KEY ("postId") REFERENCES "post_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP CONSTRAINT "FK_9bb35f70f78a3a7b368d4719474"`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP CONSTRAINT "FK_ec42c5a5dfd35f948b93cdf04f7"`);
        await queryRunner.query(`DROP TABLE "reaction_entity"`);
        await queryRunner.query(`DROP TYPE "public"."reaction_entity_reactiontype_enum"`);
    }

}
