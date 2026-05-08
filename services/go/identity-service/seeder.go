package main

import (
	"gorm.io/gorm"
)

func SeedIdentityData(db *gorm.DB) {
	// 1. Seed KYC Levels (CBN Standards)
	levels := []KYCLevel{
		{Level: 1, Name: "BRONZE", DailyLimit: 50000, MaxBalance: 300000, Requirements: "Phone, Name"},
		{Level: 2, Name: "SILVER", DailyLimit: 200000, MaxBalance: 500000, Requirements: "BVN, Address"},
		{Level: 3, Name: "GOLD", DailyLimit: 1000000, MaxBalance: 10000000, Requirements: "Gov ID, Utility Bill"},
	}

	for _, l := range levels {
		db.FirstOrCreate(&l, KYCLevel{Level: l.Level})
	}

	// 2. Seed Standard Security Questions
	questions := []SecurityQuestion{
		{Question: "What was the name of your first pet?"},
		{Question: "In what city were you born?"},
		{Question: "What is your favorite book?"},
		{Question: "What was the name of your elementary school?"},
		{Question: "What is the name of your favorite childhood friend?"},
	}

	for _, q := range questions {
		db.FirstOrCreate(&q, SecurityQuestion{Question: q.Question})
	}
}
