import { MigrationInterface, QueryRunner } from "typeorm";

export class Message1729681984536 implements MigrationInterface {
    name = 'Message1729681984536'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" ADD "status" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "status"`);
    }

}
