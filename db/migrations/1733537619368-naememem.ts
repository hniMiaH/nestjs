import { MigrationInterface, QueryRunner } from "typeorm";

export class Naememem1733537619368 implements MigrationInterface {
    name = 'Naememem1733537619368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" ADD "receiverId" character varying`);
        await queryRunner.query(`ALTER TABLE "notifications" ADD CONSTRAINT "FK_d1e9b2452666de3b9b4d271cca0" FOREIGN KEY ("receiverId") REFERENCES "user_entity"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "notifications" DROP CONSTRAINT "FK_d1e9b2452666de3b9b4d271cca0"`);
        await queryRunner.query(`ALTER TABLE "notifications" DROP COLUMN "receiverId"`);
    }

}
