package main

import (
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
	"testing"
)

func TestTransactionProcessing(t *testing.T) {
	// Setup in-memory DB
	db, _ := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	db.AutoMigrate(&Transaction{}, &AuditLog{})

	txService := &TransactionService{DB: db}

	// 1. Test Single Transaction Creation
	tx := &Transaction{
		Reference: "TEST-REF-001",
		Amount:    5000.0,
		Sender:    "USER_A",
		Receiver:  "USER_B",
		Status:    "PENDING",
	}

	err := txService.CreateTransaction(tx)
	if err != nil {
		t.Fatalf("Failed to create transaction: %v", err)
	}

	// 2. Test Audit Log Generation
	var audit AuditLog
	db.First(&audit)
	if audit.Reference != tx.Reference {
		t.Errorf("Audit log not created for transaction! Expected ref %s, got %s", tx.Reference, audit.Reference)
	}

	// 3. Test Double Spend Prevention (Duplicate Reference)
	errDuplicate := txService.CreateTransaction(tx)
	if errDuplicate == nil {
		t.Errorf("System allowed duplicate transaction reference! Major integrity risk.")
	}
}
