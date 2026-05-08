package main

import (
	"time"

	"gorm.io/gorm"
)

type Account struct {
	ID            uint           `gorm:"primaryKey" json:"id"`
	AccountNumber string         `gorm:"uniqueIndex;not null" json:"account_number"`
	UserID        string         `gorm:"index;not null" json:"user_id"`
	Balance       float64        `gorm:"default:0" json:"balance"`
	Currency      string         `gorm:"default:'NGN'" json:"currency"`
	Status        string         `gorm:"default:'ACTIVE'" json:"status"`
	CreatedAt     time.Time      `json:"created_at"`
	UpdatedAt     time.Time      `json:"updated_at"`
	DeletedAt     gorm.DeletedAt `gorm:"index" json:"deleted_at"`
}

type BalanceSyncLog struct {
	ID            uint   `gorm:"primaryKey"`
	AccountNumber string `gorm:"index"`
	OldBalance    float64
	NewBalance    float64
	Source        string // e.g., "BANKONE_WEBHOOK", "RECONCILIATION_JOB"
	SyncedAt      time.Time
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
