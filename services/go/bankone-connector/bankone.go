package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"

	pb "github.com/gdl/bankone-connector/proto"
)

type CircuitBreaker struct {
	FailureCount    int
	Threshold       int
	LastFailureTime time.Time
	OpenDuration    time.Duration
	State           string // "CLOSED", "OPEN", "HALF-OPEN"
}

type BankOneClient struct {
	BaseURL    string
	AuthToken  string
	HTTPClient *http.Client
	CB         *CircuitBreaker
}

func NewBankOneClient(baseURL, authToken string) *BankOneClient {
	return &BankOneClient{
		BaseURL:   baseURL,
		AuthToken: authToken,
		HTTPClient: &http.Client{
			Timeout: 45 * time.Second,
		},
		CB: &CircuitBreaker{
			Threshold:    5,
			OpenDuration: 30 * time.Second,
			State:        "CLOSED",
		},
	}
}

type server struct {
	pb.UnimplementedBankOneServiceServer
	client *BankOneClient
}

func (s *server) CreateAccountQuick(ctx context.Context, req *pb.CreateAccountQuickRequest) (*pb.BankOneResponse, error) {
	path := fmt.Sprintf("/Account/CreateAccountQuick/2?authtoken=%s", s.client.AuthToken)
	body := map[string]interface{}{
		"FirstName":   req.FirstName,
		"LastName":    req.LastName,
		"Email":       req.Email,
		"PhoneNumber": req.Phone,
		"AccountType": req.AccountType,
		"Token":       s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (s *server) GetBalance(ctx context.Context, req *pb.BalanceRequest) (*pb.BalanceResponse, error) {
	path := fmt.Sprintf("/Account/GetAccountByAccountNumber/2?authtoken=%s&accountNumber=%s", s.client.AuthToken, req.AccountNumber)

	resp, err := s.client.get(path)
	if err != nil {
		return nil, err
	}

	// Simple mapping for demonstration, real one would parse the specific BankOne JSON
	return &pb.BalanceResponse{
		Success: resp.Success,
		Balance: 0.0, // Should be parsed from resp.Data
		Message: resp.Message,
	}, nil
}

func (s *server) SetPND(ctx context.Context, req *pb.PNDRequest) (*pb.BankOneResponse, error) {
	var path string
	if req.Active {
		path = "/Account/ActivatePND"
	} else {
		path = "/Account/DeactivatePND"
	}

	body := map[string]interface{}{
		"AccountNo":          req.AccountNumber,
		"AuthenticationCode": s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (s *server) AccountEnquiry(ctx context.Context, req *pb.AccountEnquiryRequest) (*pb.BankOneResponse, error) {
	path := "/Account/AccountEnquiry"
	body := map[string]interface{}{
		"AccountNo":          req.AccountNumber,
		"AuthenticationCode": s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (c *BankOneClient) post(path string, body interface{}) (*pb.BankOneResponse, error) {
	if !c.checkCB() {
		return nil, fmt.Errorf("circuit breaker is OPEN - failing fast")
	}

	url := c.BaseURL + path
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		c.recordFailure()
		return nil, err
	}
	defer resp.Body.Close()
	c.recordSuccess()

	respBody, _ := io.ReadAll(resp.Body)
	return &pb.BankOneResponse{
		Success: resp.StatusCode == http.StatusOK,
		Message: resp.Status,
		Data:    string(respBody),
	}, nil
}

func (c *BankOneClient) checkCB() bool {
	if c.CB.State == "OPEN" {
		if time.Since(c.CB.LastFailureTime) > c.CB.OpenDuration {
			c.CB.State = "HALF-OPEN"
			return true
		}
		return false
	}
	return true
}

func (c *BankOneClient) recordFailure() {
	c.CB.FailureCount++
	c.CB.LastFailureTime = time.Now()
	if c.CB.FailureCount >= c.CB.Threshold {
		c.CB.State = "OPEN"
	}
}

func (c *BankOneClient) recordSuccess() {
	c.CB.FailureCount = 0
	c.CB.State = "CLOSED"
}

func (c *BankOneClient) get(path string) (*pb.BankOneResponse, error) {
	if !c.checkCB() {
		return nil, fmt.Errorf("circuit breaker is OPEN - failing fast")
	}
	url := c.BaseURL + path
	resp, err := c.HTTPClient.Get(url)
	if err != nil {
		c.recordFailure()
		return nil, err
	}
	defer resp.Body.Close()
	c.recordSuccess()

	respBody, _ := io.ReadAll(resp.Body)
	return &pb.BankOneResponse{
		Success: resp.StatusCode == http.StatusOK,
		Message: resp.Status,
		Data:    string(respBody),
	}, nil
}

// Implement other methods (Transactions, BVN, etc) following the same pattern...
func (s *server) CreateCustomerAndAccount(ctx context.Context, req *pb.CreateCustomerRequest) (*pb.BankOneResponse, error) {
	path := fmt.Sprintf("/Account/CreateCustomerAndAccount/2?authtoken=%s", s.client.AuthToken)
	body := map[string]interface{}{
		"FirstName":   req.FirstName,
		"LastName":    req.LastName,
		"PhoneNumber": req.Phone,
		"Email":       req.Email,
		"Token":       s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (s *server) GetTransactions(ctx context.Context, req *pb.TransactionsRequest) (*pb.TransactionsResponse, error) {
	// Implementation for SearchTransactions
	return &pb.TransactionsResponse{Success: true}, nil
}

func (s *server) SetLien(ctx context.Context, req *pb.LienRequest) (*pb.BankOneResponse, error) {
	path := "/Account/PlaceLien"
	if !req.Active {
		path = "/Account/UnPlaceLien"
	}
	body := map[string]interface{}{
		"AccountNo":          req.AccountNumber,
		"Amount":             req.Amount,
		"AuthenticationCode": s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (s *server) GetBVNDetails(ctx context.Context, req *pb.BVNRequest) (*pb.BankOneResponse, error) {
	path := "/Account/BVN/GetBVNDetails"
	body := map[string]interface{}{
		"BVN":                req.Bvn,
		"AuthenticationCode": s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (s *server) InterbankTransfer(ctx context.Context, req *pb.InterbankTransferRequest) (*pb.BankOneResponse, error) {
	path := "/Account/InterBankTransfer"
	body := map[string]interface{}{
		"Amount":                   req.Amount,
		"SourceAccountNumber":      req.SourceAccount,
		"DestinationAccountNumber": req.DestinationAccount,
		"DestinationBankCode":      req.DestinationBankCode,
		"DestinationAccountName":   req.DestinationAccountName,
		"Narration":                req.Narration,
		"TransactionReference":     req.Reference,
		"Token":                    s.client.AuthToken,
	}
	return s.client.post(path, body)
}

func (s *server) GetOtherBankList(ctx context.Context, req *pb.Empty) (*pb.BankOneResponse, error) {
	path := "/Account/GetOtherBankList"
	return s.client.get(fmt.Sprintf("%s?authtoken=%s", path, s.client.AuthToken))
}
