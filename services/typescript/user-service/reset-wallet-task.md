# Resetting Wallet Balances

## Objective

Safely clear all queryable history and reset balances to 0 for testing purposes, bypassing the newly added security triggers.

## Steps

1. Create `src/scripts/reset-wallets.ts`
2. Connect to DB using `ormconfig`
3. Drop protection trigger
4. Truncate `virtual_wallet_transaction`
5. Reset `virtual_wallet` totals to 0
6. Re-create protection trigger
7. Execute script
