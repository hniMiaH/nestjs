import { MigrationInterface, QueryRunner } from "typeorm";

export class Nnnn1729824271116 implements MigrationInterface {
    name = 'Nnnn1729824271116'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."messages_status_enum" AS ENUM('sent', 'delivered', 'read')`);
        await queryRunner.query(`ALTER TABLE "messages" ADD "status" "public"."messages_status_enum" NOT NULL DEFAULT 'sent'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "messages" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."messages_status_enum"`);
    }

}
