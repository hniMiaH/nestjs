import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1728678974178 implements MigrationInterface {
    name = 'Name1728678974178'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" RENAME COLUMN "images" TO "image"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "image" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "image" text array`);
        await queryRunner.query(`ALTER TABLE "post_entity" RENAME COLUMN "image" TO "images"`);
    }

}
