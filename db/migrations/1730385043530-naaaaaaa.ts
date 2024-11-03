import { MigrationInterface, QueryRunner } from "typeorm";

export class Naaaaaaa1730385043530 implements MigrationInterface {
    name = 'Naaaaaaa1730385043530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_entity" ADD "followers" text array`);
        await queryRunner.query(`ALTER TABLE "user_entity" ADD "followings" text array`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "followings"`);
        await queryRunner.query(`ALTER TABLE "user_entity" DROP COLUMN "followers"`);
    }

}
