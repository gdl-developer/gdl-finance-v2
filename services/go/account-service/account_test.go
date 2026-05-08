package main

import (
	"context"
	"testing"
	"time"

	"github.com/alicebob/miniredis/v2"
	"github.com/go-redis/redis/v8"
)

func TestAccountLocking(t *testing.T) {
	// Setup MiniRedis to simulate actual Redis in tests
	s, err := miniredis.Run()
	if err != nil {
		t.Fatalf("failed to start miniredis: %v", err)
	}
	defer s.Close()

	rdb := redis.NewClient(&redis.Options{
		Addr: s.Addr(),
	})
	ctx := context.Background()

	lockKey := "lock:account:12345"

	// 1. First attempt to acquire lock
	success, err := AcquireLock(ctx, rdb, lockKey, 5*time.Second)
	if err != nil || !success {
		t.Errorf("Failed to acquire first lock: %v", err)
	}

	// 2. Second attempt should fail (simulating race condition)
	success2, err := AcquireLock(ctx, rdb, lockKey, 5*time.Second)
	if success2 {
		t.Errorf("Acquired lock that was already held! Critical race condition possible.")
	}

	// 3. Release and retry
	ReleaseLock(ctx, rdb, lockKey)
	success3, err := AcquireLock(ctx, rdb, lockKey, 5*time.Second)
	if !success3 {
		t.Errorf("Failed to re-acquire lock after release")
	}
}

func TestLedgerBalance(t *testing.T) {
	// Mock database setup
	db := SetupTestDB() // Helper to create in-memory SQLite for testing

	repo := &AccountRepository{DB: db}

	account := &Account{AccountNumber: "0012345678", Balance: 1000.0}
	db.Create(account)

	// Test atomic credit
	err := repo.CreditAccount("0012345678", 500.0)
	if err != nil {
		t.Errorf("Credit failed: %v", err)
	}

	var updatedAccount Account
	db.Where("account_number = ?", "0012345678").First(&updatedAccount)

	if updatedAccount.Balance != 1500.0 {
		t.Errorf("Balance mismatch! Expected 1500, got %f", updatedAccount.Balance)
	}
}
