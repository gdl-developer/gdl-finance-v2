package main

import (
	"bytes"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"

	pb "github.com/gdl/symplus-connector/proto"
)

type SymplusClient struct {
	BaseURL    string
	ClientKey  string
	PrivateKey string
	PublicKey  string
	mu         sync.RWMutex
	HTTPClient *http.Client
}

func NewSymplusClient(baseURL, clientKey, privateKey string) *SymplusClient {
	c := &SymplusClient{
		BaseURL:    baseURL,
		ClientKey:  clientKey,
		PrivateKey: privateKey,
		HTTPClient: &http.Client{
			Timeout: 45 * time.Second,
		},
	}
	// Initial key fetch
	c.RotateKey()
	return c
}

func (c *SymplusClient) RotateKey() {
	c.mu.Lock()
	defer c.mu.Unlock()

	url := fmt.Sprintf("https://clientportal.gdl.com.ng/ords/api/core/v3/GetKey/%s/", c.ClientKey)
	resp, err := c.HTTPClient.Get(url)
	if err != nil {
		log.Printf("Failed to rotate Symplus key: %v", err)
		return
	}
	defer resp.Body.Close()

	var result struct {
		Result []struct {
			PublicKey string `json:"public_key"`
			Key       string `json:"key"`
			Security  []struct {
				PublicKey string `json:"PublicKey"`
			} `json:"Security"`
		} `json:"result"`
		PublicKey string `json:"public_key"`
		Key       string `json:"key"`
		Data      string `json:"data"`
	}

	body, _ := io.ReadAll(resp.Body)
	if err := json.Unmarshal(body, &result); err == nil {
		newKey := ""
		if len(result.Result) > 0 {
			res := result.Result[0]
			if res.PublicKey != "" {
				newKey = res.PublicKey
			} else if res.Key != "" {
				newKey = res.Key
			} else if len(res.Security) > 0 {
				newKey = res.Security[0].PublicKey
			}
		} else if result.PublicKey != "" {
			newKey = result.PublicKey
		} else if result.Key != "" {
			newKey = result.Key
		} else if result.Data != "" {
			newKey = result.Data
		}

		if newKey != "" {
			c.PublicKey = newKey
			log.Printf("Symplus Public Key rotated successfully. Length: %d", len(c.PublicKey))
		} else {
			log.Printf("Could not extract public key from Symplus response: %s", string(body))
		}
	} else {
		log.Printf("Failed to unmarshal Symplus key rotation response: %v", err)
	}
}

func (c *SymplusClient) generateAuthKey() string {
	c.mu.RLock()
	publicKey := c.PublicKey
	c.mu.RUnlock()

	combined := fmt.Sprintf("%s%s%s", publicKey, c.ClientKey, c.PrivateKey)
	hash := sha256.Sum256([]byte(combined))
	return hex.EncodeToString(hash[:])
}

func (c *SymplusClient) post(path string, body interface{}) (*pb.SymplusResponse, error) {
	url := c.BaseURL + path
	jsonBody, _ := json.Marshal(body)

	req, _ := http.NewRequest("POST", url, bytes.NewBuffer(jsonBody))
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization-Key", c.generateAuthKey())
	req.Header.Set("Client-Key", c.ClientKey)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	// Handle 401 and retry once with fresh key
	if resp.StatusCode == http.StatusUnauthorized {
		log.Println("Symplus unauthorized, rotating key and retrying...")
		c.RotateKey()
		req.Header.Set("Authorization-Key", c.generateAuthKey())
		resp, err = c.HTTPClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
	}

	respBody, _ := io.ReadAll(resp.Body)
	return &pb.SymplusResponse{
		Success: resp.StatusCode == http.StatusOK,
		Message: resp.Status,
		Data:    string(respBody),
	}, nil
}

func (c *SymplusClient) get(path string) (*pb.SymplusResponse, error) {
	url := c.BaseURL + path
	req, _ := http.NewRequest("GET", url, nil)
	req.Header.Set("Authorization-Key", c.generateAuthKey())
	req.Header.Set("Client-Key", c.ClientKey)

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusUnauthorized {
		c.RotateKey()
		req.Header.Set("Authorization-Key", c.generateAuthKey())
		resp, err = c.HTTPClient.Do(req)
		if err != nil {
			return nil, err
		}
		defer resp.Body.Close()
	}

	respBody, _ := io.ReadAll(resp.Body)
	return &pb.SymplusResponse{
		Success: resp.StatusCode == http.StatusOK,
		Message: resp.Status,
		Data:    string(respBody),
	}, nil
}
