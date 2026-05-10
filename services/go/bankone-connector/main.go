package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"

	pb "github.com/gdl/bankone-connector/proto"
	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
	"google.golang.org/grpc"
)

type BalanceUpdateEvent struct {
	AccountNumber string  `json:"account_number"`
	NewBalance    float64 `json:"new_balance"`
	Source        string  `json:"source"`
}

func main() {
	godotenv.Load()

	authToken := os.Getenv("BANKONE_AUTHKEY")
	baseURL := os.Getenv("BANKONE_BASEURL")
	kafkaBrokers := os.Getenv("KAFKA_BROKERS")
	if kafkaBrokers == "" {
		kafkaBrokers = "localhost:9092"
	}

	grpcPort := os.Getenv("PORT")
	if grpcPort == "" {
		grpcPort = "50056"
	}

	httpPort := os.Getenv("HTTP_PORT")
	if httpPort == "" {
		httpPort = "8086"
	}

	// Kafka Producer
	writer := &kafka.Writer{
		Addr:     kafka.TCP(kafkaBrokers),
		Topic:    "balance-updates",
		Balancer: &kafka.LeastBytes{},
	}
	defer writer.Close()

	// 1. Start gRPC Server in a goroutine
	go func() {
		lis, err := net.Listen("tcp", ":"+grpcPort)
		if err != nil {
			log.Fatalf("failed to listen: %v", err)
		}

		s := grpc.NewServer()
		client := NewBankOneClient(baseURL, authToken)
		pb.RegisterBankOneServiceServer(s, &server{client: client})

		log.Printf("gRPC BankOne Connector listening at %v", lis.Addr())
		if err := s.Serve(lis); err != nil {
			log.Fatalf("failed to serve gRPC: %v", err)
		}
	}()

	// 2. Start HTTP Webhook Server
	http.HandleFunc("/webhook/bankone", func(w http.ResponseWriter, r *http.Request) {
		handleBankOneWebhook(w, r, writer)
	})

	log.Printf("HTTP BankOne Webhook Server listening at :%s", httpPort)
	if err := http.ListenAndServe(":"+httpPort, nil); err != nil {
		log.Fatalf("failed to serve http: %v", err)
	}
}

func handleBankOneWebhook(w http.ResponseWriter, r *http.Request, writer *kafka.Writer) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	// Note: In production, verify BankOne signature/token here
	var payload struct {
		AccountNumber string  `json:"AccountNumber"`
		Amount        float64 `json:"Amount"`
		Balance       float64 `json:"Balance"`
		TransactionID string  `json:"TransactionID"`
	}

	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, "Invalid payload", http.StatusBadRequest)
		return
	}

	log.Printf("Received BankOne Webhook: Account=%s, Balance=%f, TxID=%s", 
		payload.AccountNumber, payload.Balance, payload.TransactionID)

	// Construct Kafka Event for Account-Service (Shadow Ledger)
	event := BalanceUpdateEvent{
		AccountNumber: payload.AccountNumber,
		NewBalance:    payload.Balance,
		Source:        "BANKONE_WEBHOOK",
	}

	eventBytes, _ := json.Marshal(event)
	err := writer.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(payload.AccountNumber),
		Value: eventBytes,
	})

	if err != nil {
		log.Printf("Failed to publish balance update to Kafka: %v", err)
		http.Error(w, "Internal server error", http.StatusInternalServerError)
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(map[string]string{
		"status":  "success",
		"message": "Webhook processed and dispatched to Kafka",
	})
}
