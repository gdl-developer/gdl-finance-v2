package main

import (
	"context"
	"testing"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/stretchr/testify/assert"
)

func TestDistributedLock(t *testing.T) {
	// Setup: Requires a local Redis or a mock. 
	// For this test, we assume a local Redis at localhost:6379
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	client := &RedisClient{client: rdb}
	ctx := context.Background()
	key := "test_account_123"

	// 1. First acquisition should succeed
	success, token := client.AcquireLock(ctx, key, 5*time.Second)
	assert.True(t, success)
	assert.NotEmpty(t, token)

	// 2. Second acquisition for same key should fail
	success2, _ := client.AcquireLock(ctx, key, 5*time.Second)
	assert.False(t, success2)

	// 3. Releasing with correct token should succeed
	released := client.ReleaseLock(ctx, key, token)
	assert.True(t, released)

	// 4. Acquisition after release should succeed
	success3, token3 := client.AcquireLock(ctx, key, 5*time.Second)
	assert.True(t, success3)
	assert.NotEmpty(t, token3)

	// Cleanup
	client.ReleaseLock(ctx, key, token3)
}
