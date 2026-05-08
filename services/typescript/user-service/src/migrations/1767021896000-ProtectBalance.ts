import { MigrationInterface, QueryRunner } from 'typeorm';

export class ProtectBalance1767021896000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    // 1. Create Audit Table
    // This table will store the history of all changes to virtual_wallet
    await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS virtual_wallet_audit (
                audit_id INT AUTO_INCREMENT PRIMARY KEY,
                wallet_id INT,
                user_id INT,
                old_balance DECIMAL(20,2),
                new_balance DECIMAL(20,2),
                old_total_credited DECIMAL(20,2),
                new_total_credited DECIMAL(20,2),
                old_total_debited DECIMAL(20,2),
                new_total_debited DECIMAL(20,2),
                changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                changed_by VARCHAR(50) DEFAULT 'SYSTEM', -- Can be updated by app context if needed
                action_type VARCHAR(20)
            )
        `);

    // 1.5. Data Reset: Clear all history and reset balances
    // As requested, we are wiping the slate clean before applying strict controls
    await queryRunner.query(`DELETE FROM virtual_wallet_transaction`);

    await queryRunner.query(`
            UPDATE virtual_wallet 
            SET current_balance = 0.00, 
                total_credited = 0.00, 
                total_debited = 0.00
        `);

    // 2. Trigger: Prevent reducing total_credited or total_debited & Enforce Balance Formula
    // This ensures the ledger is append-only and the balance is mathematically correct
    await queryRunner.query(`
            CREATE TRIGGER prevent_balance_reduction
            BEFORE UPDATE ON virtual_wallet
            FOR EACH ROW
            BEGIN
                -- Enforce Monotonicity
                IF NEW.total_credited < OLD.total_credited THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'total_credited cannot decrease';
                END IF;
                IF NEW.total_debited < OLD.total_debited THEN
                    SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'total_debited cannot decrease';
                END IF;

                -- Enforce Safety: Recalculate current_balance from the immutable totals
                -- This prevents anyone from manually setting "current_balance" to a value that doesn't match history
                SET NEW.current_balance = NEW.total_credited - NEW.total_debited;
            END;
        `);

    // 3. Trigger: Log changes to Audit Table
    await queryRunner.query(`
            CREATE TRIGGER audit_wallet_changes
            AFTER UPDATE ON virtual_wallet
            FOR EACH ROW
            BEGIN
                INSERT INTO virtual_wallet_audit (
                    wallet_id, user_id, 
                    old_balance, new_balance,
                    old_total_credited, new_total_credited,
                    old_total_debited, new_total_debited,
                    action_type
                ) VALUES (
                    OLD.id, OLD.user_id,
                    OLD.current_balance, NEW.current_balance,
                    OLD.total_credited, NEW.total_credited,
                    OLD.total_debited, NEW.total_debited,
                    'UPDATE'
                );
            END;
        `);

    // 4. Trigger: Prevent tampering with Transaction History
    // Transactions should be Immutable once created
    await queryRunner.query(`
            CREATE TRIGGER protect_transaction_history_update
            BEFORE UPDATE ON virtual_wallet_transaction
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions are immutable and cannot be updated';
            END;
        `);

    await queryRunner.query(`
            CREATE TRIGGER protect_transaction_history_delete
            BEFORE DELETE ON virtual_wallet_transaction
            FOR EACH ROW
            BEGIN
                SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Transactions are immutable and cannot be deleted';
            END;
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS protect_transaction_history_delete`,
    );
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS protect_transaction_history_update`,
    );
    await queryRunner.query(`DROP TRIGGER IF EXISTS audit_wallet_changes`);
    await queryRunner.query(`DROP TRIGGER IF EXISTS prevent_balance_reduction`);
    await queryRunner.query(`DROP TABLE IF EXISTS virtual_wallet_audit`);
  }
}
