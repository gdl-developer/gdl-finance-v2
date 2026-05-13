package main

import (
	"time"

	"gorm.io/gorm"
)

type Account struct {
	ID            uint    `gorm:"primaryKey;type:int(11) unsigned" json:"id"`
	AccountNumber string  `gorm:"column:nuban_account;uniqueIndex" json:"account_number"`
	UserID        uint    `gorm:"column:user_id;index;type:int(11) unsigned;not null" json:"user_id"`
	UserRef       string  `gorm:"column:user_account_ref;uniqueIndex" json:"user_account_ref"`
	Balance       float64 `gorm:"column:available_balance;default:0" json:"balance"`
	LedgerBalance float64 `gorm:"column:ledger_balance;default:0" json:"ledger_balance"`
	Currency      string  `gorm:"column:currency;default:'NGN'" json:"currency"`
	Status        string  `gorm:"column:account_status;default:'ACTIVE'" json:"status"`
	AccountType   string  `gorm:"column:account_type" json:"account_type"`

	// Core BankOne Account
	BankOneAccount string  `json:"bankone_account"`
	BankOneBalance float64 `json:"bankone_balance"`

	// Virtual Accounts (UBA & RMB)
	UBALedgerAccount string  `json:"uba_ledger_account"`
	UBALedgerBalance float64 `json:"uba_ledger_balance"`

	RMBAccount string  `json:"rmb_account"`
	RMBBalance float64 `json:"rmb_balance"`

	CreatedAt time.Time      `json:"created_at"`
	UpdatedAt time.Time      `json:"updated_at"`
	DeletedAt gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

func (Account) TableName() string {
	return "nuban_account"
}

type BalanceSyncLog struct {
	ID            uint      `gorm:"primaryKey"`
	AccountNumber string    `gorm:"index"`
	OldBalance    float64   `json:"old_balance"`
	NewBalance    float64   `json:"new_balance"`
	Source        string    `json:"source"`
	SyncedAt      time.Time `json:"synced_at"`
}

type InvestmentLog struct {
	gorm.Model
	Reference     string `gorm:"uniqueIndex"`
	AccountNumber string `gorm:"index"`
	Amount        float64
	PoolType      string
	Status        string
	ProcessedAt   time.Time
}

type TransactionAuditLog struct {
	ID            uint      `gorm:"primaryKey"`
	CorrelationID string    `gorm:"index"`
	UserID        string    `gorm:"index"`
	Action        string    `json:"action"` // e.g., "WITHDRAWAL", "DEPOSIT", "SYNC"
	Payload       string    `gorm:"type:text"`
	Status        string    `json:"status"`
	ErrorMessage  string    `json:"error_message"`
	CreatedAt     time.Time `json:"created_at"`
}
