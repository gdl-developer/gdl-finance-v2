package main

import (
	"bytes"
	"context"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	pb "github.com/gdl/symplus-service/proto"
)

type SymplusClient struct {
	BaseURL    string
	ClientKey  string
	PrivateKey string
	PublicKey  string
	mu         sync.RWMutex
	HTTPClient *http.Client
}

func NewSymplusClient(baseURL, clientKey, privateKey, publicKey string) *SymplusClient {
	return &SymplusClient{
		BaseURL:    baseURL,
		ClientKey:  clientKey,
		PrivateKey: privateKey,
		PublicKey:  publicKey,
		HTTPClient: &http.Client{Timeout: 60 * time.Second},
	}
}

type server struct {
	pb.UnimplementedSymplusServiceServer
	client *SymplusClient
}

func (s *server) GetFunds(ctx context.Context, req *pb.Empty) (*pb.SymplusResponse, error) {
	return s.client.call("GET", "/GetFunds/", nil)
}

func (s *server) GetFundAccounts(ctx context.Context, req *pb.FundAccountRequest) (*pb.SymplusResponse, error) {
	path := fmt.Sprintf("/GetFundAccounts/%s", req.CustomerId)
	return s.client.call("GET", path, nil)
}

func (s *server) FundSubscription(ctx context.Context, req *pb.FundSubscriptionRequest) (*pb.SymplusResponse, error) {
	var body interface{}
	json.Unmarshal([]byte(req.Data), &body)
	return s.client.call("POST", "/DoFundSubscription/", body)
}

func (s *server) FundRedemption(ctx context.Context, req *pb.FundRedemptionRequest) (*pb.SymplusResponse, error) {
	var body interface{}
	json.Unmarshal([]byte(req.Data), &body)
	return s.client.call("POST", "/DoFundRedemption/", body)
}

func (s *server) GetFundPrice(ctx context.Context, req *pb.Empty) (*pb.SymplusResponse, error) {
	// Simplified, real path needs SYMPLUS_FUND_ID from env
	return s.client.call("GET", "/GetFundPrice/", nil)
}

func (s *server) DoCashDeposit(ctx context.Context, req *pb.CashDepositRequest) (*pb.SymplusResponse, error) {
	var body interface{}
	json.Unmarshal([]byte(req.Data), &body)
	return s.client.call("POST", "/DoCashDeposit/", body)
}

func (c *SymplusClient) call(method, path string, body interface{}) (*pb.SymplusResponse, error) {
	maxAttempts := 3
	for attempt := 1; attempt <= maxAttempts; attempt++ {
		hash := c.generateHash()
		url := c.BaseURL + path

		var reqBody io.Reader
		if body != nil {
			b, _ := json.Marshal(body)
			reqBody = bytes.NewBuffer(b)
		}

		req, _ := http.NewRequest(method, url, reqBody)
		req.Header.Set("authorization_key", hash)
		req.Header.Set("client_key", c.ClientKey)
		req.Header.Set("Content-Type", "application/json")

		resp, err := c.HTTPClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()

		if resp.StatusCode == http.StatusUnauthorized && attempt < maxAttempts {
			log.Printf("Unauthorized (401) on %s. Rotating key and retrying...", path)
			c.fetchNewPublicKey()
			continue
		}

		respBytes, _ := io.ReadAll(resp.Body)
		return &pb.SymplusResponse{
			Success: resp.StatusCode == http.StatusOK,
			Message: resp.Status,
			Data:    string(respBytes),
		}, nil
	}
	return nil, fmt.Errorf("max attempts reached")
}

func (c *SymplusClient) generateHash() string {
	c.mu.RLock()
	defer c.mu.RUnlock()
	combined := c.PublicKey + c.ClientKey + c.PrivateKey
	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:])
}

func (c *SymplusClient) fetchNewPublicKey() {
	c.mu.Lock()
	defer c.mu.Unlock()

	log.Println("🔄 Fetching new public key from Housemoni ORDS...")
	url := fmt.Sprintf("https://clientportal.housemoni.ng/ords/api/core/v3/GetKey/%s/", c.ClientKey)

	resp, err := http.Get(url)
	if err != nil {
		log.Printf("Failed to fetch public key: %v", err)
		return
	}
	defer resp.Body.Close()

	var result struct {
		Result []struct {
			Security []struct {
				PublicKey string `json:"PublicKey"`
			} `json:"Security"`
		} `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err == nil && len(result.Result) > 0 && len(result.Result[0].Security) > 0 {
		c.PublicKey = result.Result[0].Security[0].PublicKey
		log.Println("✅ Public key updated successfully")
	} else {
		log.Printf("Failed to parse public key response")
	}
}

func (c *SymplusClient) StartKeyRefresher() {
	ticker := time.NewTicker(1 * time.Hour)
	for range ticker.C {
		c.fetchNewPublicKey()
	}
}
