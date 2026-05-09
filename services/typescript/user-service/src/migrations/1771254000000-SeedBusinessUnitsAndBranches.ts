import { MigrationInterface, QueryRunner } from 'typeorm';

export class SeedBusinessUnitsAndBranches1771254000000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Seed Business Units
    const businessUnits = [
      {
        id: 1,
        business_unit_name: 'IT',
        description: 'Information Technology SBU',
        created_by: 2,
      },
      {
        id: 2,
        business_unit_name: 'FINTECH',
        description: 'FINTECH SBU',
        created_by: 2,
      },
      {
        id: 3,
        business_unit_name: 'Shared Services',
        description: 'Shared Services SBU',
        created_by: 2,
      },
      {
        id: 4,
        business_unit_name: 'GDL Finance',
        description: 'GDL Finance SBU',
        created_by: 2,
      },
      {
        id: 5,
        business_unit_name: 'Asset Management',
        description: 'Asset Management Unit SBU',
        created_by: 2,
      },
      {
        id: 6,
        business_unit_name: 'Operations',
        description: 'Operations Unit SBU',
        created_by: 2,
      },
      {
        id: 7,
        business_unit_name: 'Financial Control (FINCON)',
        description: 'Financial Control SBU',
        created_by: 2,
      },
      {
        id: 8,
        business_unit_name: 'Internal Control',
        description: 'Internal Control',
        created_by: 2,
      },
      {
        id: 9,
        business_unit_name: 'Executive Management',
        description: 'Executive Management Team',
        created_by: 3,
      },
    ];

    for (const bu of businessUnits) {
      const exists = await queryRunner.query(
        `SELECT id FROM business_unit WHERE id = ?`,
        [bu.id],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO business_unit (id, business_unit_name, description, created_by) 
                     VALUES (?, ?, ?, ?)`,
          [bu.id, bu.business_unit_name, bu.description, bu.created_by],
        );
      }
    }

    // Seed Office Branches
    const branches = [
      {
        id: 5,
        branch_name: 'Lagos Head Office',
        branch_code: 'GDL_Lagos_100001',
        created_by: 2,
      },
      {
        id: 6,
        branch_name: 'Ibadan Office',
        branch_code: 'GDL_Ibadan_100002',
        created_by: 2,
      },
      {
        id: 7,
        branch_name: 'Abuja Office',
        branch_code: 'GDL_Abuja_100003',
        created_by: 2,
      },
      {
        id: 8,
        branch_name: 'PortHarcourt Office',
        branch_code: 'GDL_PortHa_100004',
        created_by: 2,
      },
    ];

    for (const branch of branches) {
      const exists = await queryRunner.query(
        `SELECT id FROM office_branch WHERE id = ?`,
        [branch.id],
      );
      if (exists.length === 0) {
        await queryRunner.query(
          `INSERT INTO office_branch (id, branch_name, branch_code, created_by) 
                     VALUES (?, ?, ?, ?)`,
          [
            branch.id,
            branch.branch_name,
            branch.branch_code,
            branch.created_by,
          ],
        );
      }
    }
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM business_unit WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9)`,
    );
    await queryRunner.query(
      `DELETE FROM office_branch WHERE id IN (5, 6, 7, 8)`,
    );
  }
}
