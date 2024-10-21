import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1729409127386 implements MigrationInterface {
    name = 'Name1729409127386'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_4875672591221a61ace66f2d4f9"`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP CONSTRAINT "FK_f9e07d55754de296cb687950023"`);
        await queryRunner.query(`ALTER TABLE "comments" RENAME COLUMN "parentCommentId" TO "parent_id"`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_d6f93329801a93536da4241e386" FOREIGN KEY ("parent_id") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD CONSTRAINT "FK_f9e07d55754de296cb687950023" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP CONSTRAINT "FK_f9e07d55754de296cb687950023"`);
        await queryRunner.query(`ALTER TABLE "comments" DROP CONSTRAINT "FK_d6f93329801a93536da4241e386"`);
        await queryRunner.query(`ALTER TABLE "comments" RENAME COLUMN "parent_id" TO "parentCommentId"`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD CONSTRAINT "FK_f9e07d55754de296cb687950023" FOREIGN KEY ("commentId") REFERENCES "comment_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "comments" ADD CONSTRAINT "FK_4875672591221a61ace66f2d4f9" FOREIGN KEY ("parentCommentId") REFERENCES "comments"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
