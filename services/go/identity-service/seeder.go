package main

import (
	"log"

	"gorm.io/gorm"
)

func SeedIdentityData(db *gorm.DB) {
	log.Println("[Seeder] Starting Identity Service seeding...")

	// 1. Seed KYC Levels (CBN Standards)
	if db.Migrator().HasTable(&KYCLevel{}) {
		levels := []KYCLevel{
			{Level: 1, Name: "BRONZE", DailyLimit: 50000, MaxBalance: 300000, Requirements: "Phone, Name"},
			{Level: 2, Name: "SILVER", DailyLimit: 200000, MaxBalance: 500000, Requirements: "BVN, Address"},
			{Level: 3, Name: "GOLD", DailyLimit: 1000000, MaxBalance: 10000000, Requirements: "Gov ID, Utility Bill"},
		}

		for _, l := range levels {
			db.Where(KYCLevel{Level: l.Level}).FirstOrCreate(&l)
		}
		log.Println("[Seeder] KYC Levels seeded successfully")
	} else {
		log.Println("[Seeder] Skipping KYC Levels: Table 'kyc_levels' does not exist yet")
	}

	// 2. Seed Standard Security Questions
	if db.Migrator().HasTable(&SecurityQuestion{}) {
		questions := []SecurityQuestion{
			{Question: "What was the name of your first pet?"},
			{Question: "In what city were you born?"},
			{Question: "What is your favorite book?"},
			{Question: "What was the name of your elementary school?"},
			{Question: "What is the name of your favorite childhood friend?"},
		}

		for _, q := range questions {
			db.Where(SecurityQuestion{Question: q.Question}).FirstOrCreate(&q)
		}
		log.Println("[Seeder] Security Questions seeded successfully")
	} else {
		log.Println("[Seeder] Skipping Security Questions: Table 'security_questions' does not exist yet")
	}

	// 3. Seed Basic Roles
	if db.Migrator().HasTable(&Role{}) {
		roles := []Role{
			{Name: "SUPER_ADMIN"},
			{Name: "ADMIN"},
			{Name: "USER"},
			{Name: "COMPLIANCE"},
			{Name: "SUPPORT"},
		}

		for _, r := range roles {
			db.Where(Role{Name: r.Name}).FirstOrCreate(&r)
		}
		log.Println("[Seeder] Roles seeded successfully")
	}
}
