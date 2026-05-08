package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/redis/go-redis/v9"
)

type RedisClient struct {
	client *redis.Client
}

func InitRedis() *RedisClient {
	addr := os.Getenv("REDIS_ADDR")
	if addr == "" {
		addr = "localhost:6379"
	}

	rdb := redis.NewClient(&redis.Options{
		Addr:     addr,
		Password: "", // no password set
		DB:       0,  // use default DB
	})

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	if _, err := rdb.Ping(ctx).Result(); err != nil {
		log.Printf("Could not connect to Redis: %v", err)
	} else {
		log.Println("Successfully connected to Redis")
	}

	return &RedisClient{client: rdb}
}

func (r *RedisClient) SetBalance(accountNumber string, balance float64) {
	ctx := context.Background()
	key := fmt.Sprintf("balance:%s", accountNumber)
	err := r.client.Set(ctx, key, balance, 24*time.Hour).Err()
	if err != nil {
		log.Printf("Redis error setting balance: %v", err)
	}
}

func (r *RedisClient) GetBalance(accountNumber string) (float64, bool) {
	ctx := context.Background()
	key := fmt.Sprintf("balance:%s", accountNumber)
	val, err := r.client.Get(ctx, key).Float64()
	if err != nil {
		return 0, false
	}
	return val, true
}

// AcquireLock attempts to acquire a distributed lock for a specific key.
func (r *RedisClient) AcquireLock(ctx context.Context, key string, expiration time.Duration) (bool, string) {
	lockKey := fmt.Sprintf("lock:%s", key)
	token := fmt.Sprintf("%d", time.Now().UnixNano())

	// Use SET with NX (Only if not exist) and PX (Expiration)
	success, err := r.client.SetNX(ctx, lockKey, token, expiration).Result()
	if err != nil || !success {
		return false, ""
	}
	return true, token
}

// ReleaseLock releases a distributed lock if the token matches.
func (r *RedisClient) ReleaseLock(ctx context.Context, key string, token string) bool {
	lockKey := fmt.Sprintf("lock:%s", key)

	// Lua script to ensure atomicity: only delete if the token matches
	script := `
		if redis.call("get", KEYS[1]) == ARGV[1] then
			return redis.call("del", KEYS[1])
		else
			return 0
		end
	`
	res, err := r.client.Eval(ctx, script, []string{lockKey}, token).Int64()
	return err == nil && res == 1
}
