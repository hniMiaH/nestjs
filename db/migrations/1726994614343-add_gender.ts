import { MigrationInterface, QueryRunner } from "typeorm";

export class AddGender1726994614343 implements MigrationInterface {
    name = 'AddGender1726994614343'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" ADD "gender" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user" DROP COLUMN "gender"`);
    }

}
