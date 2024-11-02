import { MigrationInterface, QueryRunner } from "typeorm";

export class Kj1730475257749 implements MigrationInterface {
    name = 'Kj1730475257749'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_entity" ADD "viewedPosts" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "viewedPosts"`);
    }

}
