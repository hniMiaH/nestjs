import { MigrationInterface, QueryRunner } from "typeorm";

export class Nameeeeeeee1728816652374 implements MigrationInterface {
    name = 'Nameeeeeeee1728816652374'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "title"`);
        await queryRunner.query(`ALTER TABLE "comments" ALTER COLUMN "image" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "comments" ALTER COLUMN "image" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "title" character varying`);
    }

}
