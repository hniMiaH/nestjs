import { MigrationInterface, QueryRunner } from "typeorm";

export class Nameaaa1730521091740 implements MigrationInterface {
    name = 'Nameaaa1730521091740'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD "messageId" uuid`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" ADD CONSTRAINT "FK_769865424e1946a8ba552ed1cc0" FOREIGN KEY ("messageId") REFERENCES "messages"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP CONSTRAINT "FK_769865424e1946a8ba552ed1cc0"`);
        await queryRunner.query(`ALTER TABLE "reaction_entity" DROP COLUMN "messageId"`);
    }

}
