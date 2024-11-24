import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1732444757301 implements MigrationInterface {
    name = 'Name1732444757301'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "content" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "viewedPosts"`);
        await queryRunner.query(`ALTER TABLE "user_entity" ADD "viewedPosts" integer array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "viewedPosts"`);
        await queryRunner.query(`ALTER TABLE "user_entity" ADD "viewedPosts" text array`);
        await queryRunner.query(`ALTER TABLE "messages" ALTER COLUMN "content" SET NOT NULL`);
    }

}
