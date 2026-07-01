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
	Type   string                 `json:"type"`   // "INSERT", "UPDATE"
	Table  string                 `json:"table"`  // e.g., "purchase_orders"
	Record map[string]interface{} `json:"record"` // The new/updated record
}

func handleNotificationWebhook(c *gin.Context) {
	var payload WebhookPayload
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	log.Printf("Received Webhook: Table=%s, Type=%s", payload.Table, payload.Type)

	if payload.Type == "UPDATE" {
		status, _ := payload.Record["status"].(string)
		if status == "Approved" || status == "Disetujui" {
			
			var title, body string
			
			if payload.Table == "purchase_orders" {
				poNumber, _ := payload.Record["po_number"].(string)
				title = "PO Disetujui!"
				body = fmt.Sprintf("Purchase Order %s telah disetujui.", poNumber)
			} else if payload.Table == "purchase_requisitions" {
				prNumber, _ := payload.Record["pr_number"].(string)
				title = "PR Disetujui!"
				body = fmt.Sprintf("Purchase Requisition %s telah disetujui.", prNumber)
			} else {
				// Unsupported table
				c.JSON(http.StatusOK, gin.H{"status": "ignored"})
				return
			}
			
			// Get created_by to notify the creator
			createdBy, _ := payload.Record["created_by"].(string)
			if createdBy == "" {
				createdBy = "00000000-0000-0000-0000-000000000000" // dummy if empty
			}
			
			log.Printf("Fetching tokens for creator: %s and purchasing roles...", createdBy)
			tokens, err := fetchTargetFCMTokens(createdBy)
			if err != nil {
				log.Printf("Error fetching tokens: %v", err)
			}

			if len(tokens) == 0 {
				log.Printf("No eligible FCM tokens found. Skipping push notification.")
			} else {
				log.Printf("Found %d eligible tokens to notify.", len(tokens))
				for _, token := range tokens {
					err := sendFirebasePush(token, title, body)
					if err != nil {
						log.Printf("Failed sending to token %s: %v", token, err)
					}
				}
			}

			// Supabase Fallback Insert
			storeID, _ := payload.Record["store_id"].(string)
			if storeID != "" {
				err = insertSupabaseFallback(storeID, title, body, payload.Table)
				if err != nil {
					log.Printf("Supabase Fallback Error: %v", err)
				}
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "processed"})
}

func fetchTargetFCMTokens(creatorID string) ([]string, error) {
	supabaseURL := os.Getenv("SUPABASE_URL")
	supabaseKey := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	if supabaseURL == "" || supabaseKey == "" {
		return nil, fmt.Errorf("supabase credentials not configured")
	}

	// Query users who have an FCM token AND (are owner/manager/purchasing OR created this document)
	// PostgREST syntax: or=(role.in.(owner,manager,purchasing,admin),id.eq.creatorID)
	query := fmt.Sprintf("select=fcm_token&fcm_token=not.is.null&or=(role.in.(owner,manager,purchasing,admin),id.eq.%s)", creatorID)
	reqURL := fmt.Sprintf("%s/rest/v1/users?%s", supabaseURL, query)
	
	req, err := http.NewRequest("GET", reqURL, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("apikey", supabaseKey)
	req.Header.Set("Authorization", "Bearer "+supabaseKey)

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("supabase returned status: %d", resp.StatusCode)
	}

	var users []struct {
		FCMToken string `json:"fcm_token"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&users); err != nil {
		return nil, err
	}

	var tokens []string
	for _, u := range users {
		if u.FCMToken != "" {
			tokens = append(tokens, u.FCMToken)
		}
	}

	return tokens, nil
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

	return nil
}
