package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"

	"firebase.google.com/go/v4/messaging"
	"github.com/gin-gonic/gin"
)

// WebhookPayload represents the expected JSON payload from Supabase Webhook
type WebhookPayload struct {
	Type   string                 `json:"type"` // "INSERT", "UPDATE"
	Table  string                 `json:"table"` // e.g., "purchase_orders"
	Record map[string]interface{} `json:"record"` // The new/updated record
}

func handleNotificationWebhook(c *gin.Context) {
	var payload WebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Received Webhook: Table=%s, Type=%s", payload.Table, payload.Type)

	// Example Logic: When a PO is approved
	if payload.Table == "purchase_orders" && payload.Type == "UPDATE" {
		status, _ := payload.Record["status"].(string)
		if status == "Approved" {
			storeID, _ := payload.Record["store_id"].(string)
			poNumber, _ := payload.Record["po_number"].(string)
			
			// 1. Send Push Notification via Firebase
			title := "PO Disetujui!"
			body := fmt.Sprintf("Purchase Order %s telah disetujui.", poNumber)
			
			// In a real app, you would fetch the FCM token of the Manager from Supabase first
			// fcmToken := fetchManagerFCMToken(storeID)
			fcmToken := "dummy-token-for-now" 
			
			err := sendFirebasePush(fcmToken, title, body)
			if err != nil {
				log.Printf("FCM Error: %v", err)
			}

			// 2. Insert into Supabase `notifications` table as Fallback
			err = insertSupabaseFallback(storeID, "PO Approved", body, "purchase_order")
			if err != nil {
				log.Printf("Supabase Fallback Error: %v", err)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "processed"})
}

func sendFirebasePush(token, title, body string) error {
	if fcmClient == nil {
		return fmt.Errorf("FCM client is not initialized")
	}

	message := &messaging.Message{
		Notification: &messaging.Notification{
			Title: title,
			Body:  body,
		},
		Token: token,
	}

	response, err := fcmClient.Send(context.Background(), message)
	if err != nil {
		return err
	}
	
	log.Printf("Successfully sent FCM message: %s", response)
	return nil
}

func insertSupabaseFallback(storeID, title, message, notifType string) error {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return fmt.Errorf("supabase credentials not configured")
	}

	payload := map[string]interface{}{
		"store_id":   storeID,
		"title":      title,
		"message":    message,
		"type":       notifType,
		"is_read":    false,
		"created_at": "now()",
	}

	jsonValue, _ := json.Marshal(payload)
	
	req, err := http.NewRequest("POST", fmt.Sprintf("%s/rest/v1/notifications", supabaseURL), bytes.NewBuffer(jsonValue))
	if err != nil {
		return err
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Prefer", "return=minimal")

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return fmt.Errorf("supabase returned status: %d", resp.StatusCode)
	}

	log.Printf("Successfully inserted fallback notification to Supabase")
	return nil
}
