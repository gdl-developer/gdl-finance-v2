package main

import (
	"context"
	"encoding/json"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
)

type AuditLog struct {
	gorm.Model
	UserID          string `json:"user_id"`
	UserType        string `json:"user_type"`
	UserName        string `json:"user_name"`
	Roles           string `json:"roles"`
	ActionPerformed string `json:"action_performed"`
	IPAddress       string `json:"ip_address"`
	Attributes      string `json:"attributes"`
}

func startDataRetentionWorker(db *gorm.DB) {
	ticker := time.NewTicker(24 * time.Hour)
	for range ticker.C {
		// Delete records older than 90 days
		cutoff := time.Now().AddDate(0, 0, -90)
		result := db.Where("created_at < ?", cutoff).Delete(&AuditLog{})
		if result.Error != nil {
			log.Printf("error during data retention cleanup: %v", result.Error)
		} else {
			log.Printf("deleted %d old audit logs", result.RowsAffected)
		}
	}
}

func main() {
	godotenv.Load()

	dsn := "host=" + os.Getenv("DB_HOST") + " user=" + os.Getenv("DB_USERNAME") + " password=" + os.Getenv("DB_PASSWORD") + " dbname=" + os.Getenv("DB_NAME") + " port=" + os.Getenv("DB_PORT") + " sslmode=require"
	db, err := gorm.Open(postgres.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	db.AutoMigrate(&AuditLog{})

	// Start Data Retention Worker (Phase 2.3)
	go startDataRetentionWorker(db)

	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "localhost:9092"
	}

	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  []string{kafkaBrokers},
		Topic:    "SECURITY_EVENT",
		GroupID:  "audit-service-group",
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
	})

	log.Println("Audit Service started, consuming from Kafka...")

	for {
		m, err := reader.ReadMessage(context.Background())
		if err != nil {
			log.Printf("error while reading message: %v", err)
			break
		}

		var logEntry AuditLog
		if err := json.Unmarshal(m.Value, &logEntry); err != nil {
			log.Printf("error unmarshaling log entry: %v", err)
			continue
		}

		if err := db.Create(&logEntry).Error; err != nil {
			log.Printf("error saving log entry to DB: %v", err)
			continue
		}

		log.Printf("Logged action: %s by user: %s", logEntry.ActionPerformed, logEntry.UserID)
	}

	if err := reader.Close(); err != nil {
		log.Fatal("failed to close reader:", err)
	}
}
