import { MigrationInterface, QueryRunner } from "typeorm";

export class AddComment1728915705424 implements MigrationInterface {
    name = 'AddComment1728915705424'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD "commentId" uuid`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD CONSTRAINT "FK_f9e07d55754de296cb687950023" FOREIGN KEY ("commentId") REFERENCES "comments"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP CONSTRAINT "FK_f9e07d55754de296cb687950023"`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP COLUMN "commentId"`);
    }

}
