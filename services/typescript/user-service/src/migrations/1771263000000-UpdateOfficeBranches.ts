import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdateOfficeBranches1771263000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Update "Lagos Head Office" to "Lagos Illupeju Branch"
    await queryRunner.query(
      `UPDATE office_branch SET branch_name = 'Lagos Illupeju Branch' WHERE branch_name = 'Lagos Head Office'`,
    );

    // 2. Add "Lagos Ikoyi Head Office branch"
    const ikoyiBranch = {
      id: 9,
      branch_name: 'Lagos Ikoyi Head Office branch',
      branch_code: 'GDL_LagosI_100005',
      created_by: 2,
    };

    const exists = await queryRunner.query(
      `SELECT id FROM office_branch WHERE id = ? OR branch_name = ?`,
      [ikoyiBranch.id, ikoyiBranch.branch_name],
    );

    if (exists.length === 0) {
      await queryRunner.query(
        `INSERT INTO office_branch (id, branch_name, branch_code, created_by) 
                 VALUES (?, ?, ?, ?)`,
        [
          ikoyiBranch.id,
          ikoyiBranch.branch_name,
          ikoyiBranch.branch_code,
          ikoyiBranch.created_by,
        ],
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Revert "Lagos Illupeju Branch" back to "Lagos Head Office"
    await queryRunner.query(
      `UPDATE office_branch SET branch_name = 'Lagos Head Office' WHERE branch_name = 'Lagos Illupeju Branch'`,
    );

    // Remove "Lagos Ikoyi Head Office branch"
    await queryRunner.query(
      `DELETE FROM office_branch WHERE branch_name = 'Lagos Ikoyi Head Office branch'`,
    );
  }
}
