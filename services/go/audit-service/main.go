package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"gorm.io/driver/mysql"
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

	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbUser := os.Getenv("DB_USERNAME")
	dbPass := os.Getenv("DB_PASSWORD")
	dbName := os.Getenv("DB_NAME")

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?charset=utf8mb4&parseTime=True&loc=Local&tls=skip-verify",
		dbUser, dbPass, dbHost, dbPort, dbName)

	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("failed to connect database: %v", err)
	}

	db.AutoMigrate(&AuditLog{})

	// Start Data Retention Worker
	go startDataRetentionWorker(db)

	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "kafka:29092"
	}
	log.Printf("Connecting to Kafka at: %s", kafkaBrokers)
	log.Printf("Connecting to Kafka at: %s", kafkaBrokers)

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

		// Secondary PII Sanitization
		var attrMap map[string]interface{}
		if err := json.Unmarshal([]byte(logEntry.Attributes), &attrMap); err == nil {
			maskFields := []string{"password", "pin", "token", "bvn", "nin", "phone", "account_number", "cvv"}
			sanitized := false
			for _, field := range maskFields {
				if _, ok := attrMap[field]; ok {
					attrMap[field] = "********"
					sanitized = true
				}
				// Check nested in 'body' or 'res' if present
				if body, ok := attrMap["body"].(map[string]interface{}); ok {
					if _, ok := body[field]; ok {
						body[field] = "********"
						sanitized = true
					}
				}
				if res, ok := attrMap["res"].(map[string]interface{}); ok {
					if _, ok := res[field]; ok {
						res[field] = "********"
						sanitized = true
					}
				}
			}
			if sanitized {
				newAttr, _ := json.Marshal(attrMap)
				logEntry.Attributes = string(newAttr)
			}
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
