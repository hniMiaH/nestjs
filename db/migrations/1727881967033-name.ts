import { MigrationInterface, QueryRunner } from "typeorm";

export class Name1727881967033 implements MigrationInterface {
    name = 'Name1727881967033'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."user_entity_gender_enum" RENAME TO "user_entity_gender_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_entity_gender_enum" AS ENUM('female', 'male')`);
        await queryRunner.query(`ALTER TABLE "user_entity" ALTER COLUMN "gender" TYPE "public"."user_entity_gender_enum" USING "gender"::"text"::"public"."user_entity_gender_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_entity_gender_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_entity_gender_enum_old" AS ENUM('FEMALE', 'MALE')`);
        await queryRunner.query(`ALTER TABLE "user_entity" ALTER COLUMN "gender" TYPE "public"."user_entity_gender_enum_old" USING "gender"::"text"::"public"."user_entity_gender_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."user_entity_gender_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_entity_gender_enum_old" RENAME TO "user_entity_gender_enum"`);
    }

}
