import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1730384043556 implements MigrationInterface {
    name = 'Name1730384043556'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "followingIds"`);
        await queryRunner.query(`ALTER TABLE "follows" ADD "followerId" character varying`);
        await queryRunner.query(`ALTER TABLE "follows" ADD CONSTRAINT "FK_fdb91868b03a2040db408a53331" FOREIGN KEY ("followerId") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "follows" DROP CONSTRAINT "FK_fdb91868b03a2040db408a53331"`);
        await queryRunner.query(`ALTER TABLE "follows" DROP COLUMN "followerId"`);
        await queryRunner.query(`ALTER TABLE "user_entity" ADD "followingIds" text array`);
    }

}
