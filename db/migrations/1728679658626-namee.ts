import { MigrationInterface, QueryRunner } from "typeorm";

export class Namee1728679658626 implements MigrationInterface {
    name = 'Namee1728679658626'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" RENAME COLUMN "image" TO "images"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "images"`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "images" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "images"`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "images" character varying`);
        await queryRunner.query(`ALTER TABLE "post_entity" RENAME COLUMN "images" TO "image"`);
    }

}
