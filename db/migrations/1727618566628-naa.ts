import { MigrationInterface, QueryRunner } from "typeorm";

export class Naa1727618566628 implements MigrationInterface {
    name = 'Naa1727618566628'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" DROP CONSTRAINT "FK_54ec29a0617ccd6e7c3c6935075"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP CONSTRAINT "FK_bab50481adf4ebd156275162664"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "image"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "created_by"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "updated_by"`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "thumbnail" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "createdById" character varying`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD CONSTRAINT "FK_5139c1a38f75b9a37f6636e5ee6" FOREIGN KEY ("createdById") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "post_entity" DROP CONSTRAINT "FK_5139c1a38f75b9a37f6636e5ee6"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "createdById"`);
        await queryRunner.query(`ALTER TABLE "post_entity" DROP COLUMN "thumbnail"`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "updated_by" character varying`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "created_by" character varying`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD "image" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD CONSTRAINT "FK_bab50481adf4ebd156275162664" FOREIGN KEY ("updated_by") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "post_entity" ADD CONSTRAINT "FK_54ec29a0617ccd6e7c3c6935075" FOREIGN KEY ("created_by") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

}
