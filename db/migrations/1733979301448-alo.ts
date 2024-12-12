import { MigrationInterface, QueryRunner } from "typeorm";

export class Alo1733979301448 implements MigrationInterface {
    name = 'Alo1733979301448'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "type" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "type"`);
    }

}
