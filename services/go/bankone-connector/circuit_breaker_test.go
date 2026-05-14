package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestCircuitBreaker(t *testing.T) {
	failureCount := 0

	// Mock server that fails
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		failureCount++
		w.WriteHeader(http.StatusInternalServerError)
	}))
	defer server.Close()

	// Configure client to use mock server
	client := &BankOneClient{
		BaseURL:    server.URL,
		HTTPClient: &http.Client{Timeout: 1 * time.Second},
		CB: &CircuitBreaker{
			FailureThreshold: 3,
			RetryTimeout:     2 * time.Second,
		},
	}

	// Trigger failures
	for i := 0; i < 4; i++ {
		_, err := client.GetAccountDetails("12345")
		if err == nil {
			t.Errorf("Expected error at iteration %d, got nil", i)
		}
	}

	// Check if circuit is OPEN
	if client.CB.State != StateOpen {
		t.Errorf("Expected Circuit Breaker state to be OPEN, got %v", client.CB.State)
	}

	// Verify that it doesn't call the server anymore
	currentFailures := failureCount
	client.GetAccountDetails("12345")
	if failureCount != currentFailures {
		t.Errorf("Circuit Breaker called server even when OPEN")
	}
}
