package main

import (
	"time"
)

type Transaction struct {
	ID               uint      `gorm:"primaryKey;type:int(11) unsigned" json:"id"`
	UserID           uint      `gorm:"column:user_id;index;type:int(11) unsigned" json:"user_id"`
	TxnRef           string    `gorm:"column:txn_ref;uniqueIndex;type:varchar(50)" json:"txn_ref"`
	RequestRef       string    `gorm:"column:request_ref;uniqueIndex;type:varchar(50)" json:"request_ref"`
	Amount           float64   `gorm:"column:amount;type:decimal(20,2)" json:"amount"`
	Type             string    `gorm:"column:transaction_type;type:varchar(10)" json:"type"` // DEBIT, CREDIT
	Status           string    `gorm:"column:transaction_status;type:varchar(10)" json:"status"`
	InternalStatus   string    `gorm:"column:internal_status;type:varchar(10)" json:"internal_status"`
	Narration        string    `gorm:"column:narration;type:varchar(100)" json:"narration"`
	ChannelID        string    `gorm:"column:channel_id;type:varchar(100)" json:"channel_id"`
	RecipientAccount string    `gorm:"column:recipient_account;type:varchar(50)" json:"recipient_account"`
	RecipientName    string    `gorm:"column:recipient_Name" json:"recipient_name"`
	InstitutionRef   string    `gorm:"column:institution_txn_ref" json:"institution_ref"`
	CreatedAt        time.Time `gorm:"column:createdAt"`
	UpdatedAt        time.Time `gorm:"column:updatedAt"`
}

func (Transaction) TableName() string {
	return "transaction"
}
