package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/segmentio/kafka-go"
	"gorm.io/gorm"
)

type BalanceUpdateEvent struct {
	AccountNumber string  `json:"account_number"`
	NewBalance    float64 `json:"new_balance"`
	Source        string  `json:"source"`
}

type InvestmentProcessedEvent struct {
	Reference     string  `json:"reference"`
	AccountNumber string  `json:"account_number"`
	Amount        float64 `json:"amount"`
	PoolType      string  `json:"pool_type"`
	Status        string  `json:"status"`
}

func StartKafkaConsumer(db *gorm.DB, rdb *RedisClient) {
	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "localhost:9092"
	}

	// Consumer for balance updates
	go consumeTopic(db, kafkaBrokers, "balance-updates", "account-service-balance-group", func(d *gorm.DB, b []byte) error {
		return handleBalanceUpdate(d, rdb, b)
	})

	// Consumer for investment processing
	go consumeTopic(db, kafkaBrokers, "investment-processed", "account-service-invest-group", handleInvestmentProcessed)
}

func consumeTopic(db *gorm.DB, brokers string, topic string, groupID string, handler func(*gorm.DB, []byte) error) {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  []string{brokers},
		Topic:    topic,
		GroupID:  groupID,
		MinBytes: 10e3,
		MaxBytes: 10e6,
	})

	log.Printf("Started consumer for topic: %s", topic)

	for {
		m, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Printf("error reading message from %s: %v", topic, err)
			break
		}

		if err := handler(db, m.Value); err != nil {
			log.Printf("error handling message from %s: %v", topic, err)
		}
	}
}

func handleBalanceUpdate(db *gorm.DB, rdb *RedisClient, data []byte) error {
	var event BalanceUpdateEvent
	if err := json.Unmarshal(data, &event); err != nil {
		return err
	}

	// Acquire distributed lock for this account
	lockKey := fmt.Sprintf("account:%s", event.AccountNumber)
	locked, token := rdb.AcquireLock(context.Background(), lockKey, 10*time.Second)
	if !locked {
		return fmt.Errorf("failed to acquire lock for account %s", event.AccountNumber)
	}
	defer rdb.ReleaseLock(context.Background(), lockKey, token)

	err := db.Transaction(func(tx *gorm.DB) error {
		var account Account
		if err := tx.Where("account_number = ?", event.AccountNumber).First(&account).Error; err != nil {
			return err
		}

		oldBalance := account.Balance
		account.Balance = event.NewBalance
		if err := tx.Save(&account).Error; err != nil {
			return err
		}

		return tx.Create(&BalanceSyncLog{
			AccountNumber: event.AccountNumber,
			OldBalance:    oldBalance,
			NewBalance:    event.NewBalance,
			Source:        event.Source,
			SyncedAt:      time.Now(),
		}).Error
	})

	if err == nil {
		rdb.SetBalance(event.AccountNumber, event.NewBalance)
	}
	return err
}

func handleInvestmentProcessed(db *gorm.DB, data []byte) error {
	var event InvestmentProcessedEvent
	if err := json.Unmarshal(data, &event); err != nil {
		return err
	}

	log.Printf("Investment Processed: %s, Status: %s", event.Reference, event.Status)

	return db.Transaction(func(tx *gorm.DB) error {
		// Log the investment
		return tx.Create(&InvestmentLog{
			Reference:     event.Reference,
			AccountNumber: event.AccountNumber,
			Amount:        event.Amount,
			PoolType:      event.PoolType,
			Status:        event.Status,
			ProcessedAt:   time.Now(),
		}).Error

		// Note: We might want to deduct balance here if we haven't already.
		// In a real flow, balance deduction usually happens during "PENDING" or "PROCESSING"
		// and is reversed if it "FAILED".
	})
}
