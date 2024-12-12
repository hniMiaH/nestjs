import { MigrationInterface, QueryRunner } from "typeorm";

export class Nnnn1734018090251 implements MigrationInterface {
    name = 'Nnnn1734018090251'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "reactionType" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "reactionType"`);
    }

}
