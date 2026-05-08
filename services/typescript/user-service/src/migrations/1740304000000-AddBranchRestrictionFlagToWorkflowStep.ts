import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddBranchRestrictionFlagToWorkflowStep1740304000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    const hasColumn = await queryRunner.hasColumn(
      'approval_workflow_step',
      'enforce_branch_restriction',
    );
    if (!hasColumn) {
      await queryRunner.addColumn(
        'approval_workflow_step',
        new TableColumn({
          name: 'enforce_branch_restriction',
          type: 'tinyint',
          width: 1,
          default: 0,
        }),
      );
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn(
      'approval_workflow_step',
      'enforce_branch_restriction',
    );
  }
}
