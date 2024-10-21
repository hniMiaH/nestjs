import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTag1728398102989 implements MigrationInterface {
    name = 'AddTag1728398102989'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "tags" json`);
        await queryRunner.query(`ALTER TABLE "post_entity" ALTER COLUMN "status" SET DEFAULT '0'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" ALTER COLUMN "status" SET DEFAULT '1'`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "tags"`);
    }

}
