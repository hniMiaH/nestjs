import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1729824171442 implements MigrationInterface {
    name = 'Name1729824171442'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "status"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "status" character varying`);
    }

}
