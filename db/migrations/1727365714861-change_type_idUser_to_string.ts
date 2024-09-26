import { MigrationInterface, QueryRunner } from "typeorm";

export class ChangeTypeIdUserToString1727365714861 implements MigrationInterface {
    name = 'ChangeTypeIdUserToString1727365714861'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."user_gender_enum" RENAME TO "user_gender_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."user_gender_enum" AS ENUM('FEMALE', 'MALE')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "gender" TYPE "public"."user_gender_enum" USING "gender"::"text"::"public"."user_gender_enum"`);
        await queryRunner.query(`DROP TYPE "public"."user_gender_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."user_gender_enum_old" AS ENUM('Nam', 'Nữ')`);
        await queryRunner.query(`ALTER TABLE "user" ALTER COLUMN "gender" TYPE "public"."user_gender_enum_old" USING "gender"::"text"::"public"."user_gender_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."user_gender_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."user_gender_enum_old" RENAME TO "user_gender_enum"`);
    }

}
