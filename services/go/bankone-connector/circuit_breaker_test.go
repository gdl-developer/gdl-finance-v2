package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCircuitBreaker(t *testing.T) {
	failureCount := 0

	// Mock server that closes connection to trigger network error
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		failureCount++
		hj, _ := w.(http.Hijacker)
		conn, _, _ := hj.Hijack()
		conn.Close()
	}))
	defer server.Close()

	// Configure client to use mock server
	client := &BankOneClient{
		BaseURL:    server.URL,
		HTTPClient: &http.Client{Timeout: 1 * time.Second},
		CB: &CircuitBreaker{
			Threshold:    3,
			OpenDuration: 2 * time.Second,
			State:        "CLOSED",
		},
	}

	// Trigger failures to open circuit
	for i := 0; i < 3; i++ {
		client.get("/test")
	}

	// Check if circuit is OPEN
	if client.CB.State != "OPEN" {
		t.Errorf("Expected Circuit Breaker state to be OPEN, got %s", client.CB.State)
	}

	// Verify that it doesn't call the server anymore
	currentFailures := failureCount
	client.get("/test")
	if failureCount != currentFailures {
		t.Errorf("Circuit Breaker called server even when OPEN")
	}
}
