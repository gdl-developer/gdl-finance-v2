package main

import (
	"encoding/json"
	"log"
	"net/http"
)

func main() {
	log.Println("Starting Notification Service (Go)...")

	http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status":  "healthy",
			"service": "notification-service",
		})
	})

	log.Println("Listening on :8083")
	if err := http.ListenAndServe(":8083", nil); err != nil {
		log.Fatal(err)
	}
}
