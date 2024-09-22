import { MigrationInterface, QueryRunner } from "typeorm";

export class Name11727012564876 implements MigrationInterface {
    name = 'Name11727012564876'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "dob" TIMESTAMP`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "dob"`);
    }

}
