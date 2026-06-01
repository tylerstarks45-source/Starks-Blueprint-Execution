# OpenRouter Integration Validation Checklist

This document serves as a post-build validation guide for the OpenRouter AI integration.

## Pre-Deployment Validation

### 1. Environment Configuration
- [ ] `OPENROUTER_API_KEY` is configured in `.env` file
- [ ] `OPENROUTER_BASE_URL` is set to `https://openrouter.ai/api/v1`
- [ ] `OPENROUTER_TIMEOUT` is set (default: 30000ms)
- [ ] `OPENROUTER_RETRY_COUNT` is set (default: 3)
- [ ] `OPENROUTER_RETRY_DELAY` is set (default: 1000ms)
- [ ] API key is NOT exposed in logs or error messages

### 2. API Key Validation
- [ ] API key format is valid (starts with `sk-or-v1-`)
- [ ] API key is at least 10 characters long
- [ ] API key is stored securely in `.env` file
- [ ] API key is NOT committed to version control

### 3. Endpoint Functionality

#### POST /ai/request
- [ ] Endpoint accepts `{ prompt, model, systemPrompt }` in request body
- [ ] Endpoint validates prompt (required, string, 1-10000 characters)
- [ ] Endpoint validates model (required, must be in valid models list)
- [ ] Endpoint validates systemPrompt (optional, max 5000 characters)
- [ ] Endpoint returns `{ success, response, model, provider, tokens, duration, timestamp }`
- [ ] Token counts are tracked in response (input, output, total)
- [ ] Response includes request duration in milliseconds
- [ ] Invalid input returns 400 status with clear error message
- [ ] API errors are handled gracefully (401, 429, 503, 500)

#### GET /ai/models
- [ ] Endpoint returns list of available models
- [ ] Response format: `{ success, models: [...], count, timestamp }`
- [ ] Each model includes: id, name, provider, contextLength, pricing
- [ ] Model list is fetched from OpenRouter API
- [ ] Response includes total count of available models

#### GET /ai/health
- [ ] Endpoint returns provider health status
- [ ] Response format: `{ success, health: { overallHealth, providers, metrics }, timestamp }`
- [ ] Overall health is one of: 'healthy', 'degraded', 'unavailable'
- [ ] Providers object shows availability and model count per provider
- [ ] Metrics include: responseTime, availabilityPercentage, totalProviders, availableProviders, totalModels
- [ ] Health data is cached for 5 minutes to avoid excessive API calls

#### GET /ai/validate
- [ ] Endpoint tests OpenRouter connectivity
- [ ] Response format: `{ success, connected, message, duration, timestamp }`
- [ ] Returns `connected: true` if API is reachable
- [ ] Returns `connected: false` with human-readable error message if unreachable
- [ ] Includes response duration in milliseconds
- [ ] Timeout is set to 5 seconds

### 4. Error Handling

#### HTTP Error Codes
- [ ] 401 Unauthorized: Returns "API key is invalid or expired"
- [ ] 429 Too Many Requests: Returns "Rate limit exceeded - try again later"
- [ ] 503 Service Unavailable: Returns "OpenRouter service is temporarily unavailable"
- [ ] 500+ Server Errors: Returns "Server error" with status code
- [ ] Network errors: Returns "Connection failed" with human-readable message
- [ ] Timeout errors: Returns "Request timeout" message

#### Error Messages
- [ ] All error messages are human-readable (no raw API errors exposed)
- [ ] API key is NEVER exposed in error messages
- [ ] Error responses include error code for frontend handling
- [ ] Validation errors (400) include specific field information

### 5. Request Validation

#### Prompt Validation
- [ ] Prompt is required (returns 400 if missing)
- [ ] Prompt must be a string (returns 400 if not)
- [ ] Prompt cannot be empty (returns 400 if empty)
- [ ] Prompt cannot exceed 10,000 characters (returns 400 if too long)
- [ ] Error message: "Prompt exceeds maximum length of 10000 characters"

#### Model Validation
- [ ] Model is required (returns 400 if missing)
- [ ] Model must be a string (returns 400 if not)
- [ ] Model must be in valid models list (returns 400 if invalid)
- [ ] Valid models: claude-3.5-sonnet, claude-3-opus, gpt-4-turbo, gpt-4o, gemini-2.0-flash, deepseek-chat
- [ ] Error message lists all valid models

#### System Prompt Validation
- [ ] System prompt is optional (no error if missing)
- [ ] System prompt must be a string if provided (returns 400 if not)
- [ ] System prompt cannot be empty if provided (returns 400 if empty)
- [ ] System prompt cannot exceed 5,000 characters (returns 400 if too long)
- [ ] Error message: "System prompt exceeds maximum length of 5000 characters"

### 6. Logging

#### Request Logging
- [ ] All requests are logged using logger (NOT console.log)
- [ ] Request logs include: endpoint, method, model, prompt length
- [ ] Response logs include: status, duration, token counts
- [ ] Error logs include: error message, error code, endpoint
- [ ] API key is NEVER logged
- [ ] Sensitive data is NOT logged

#### History Tracking
- [ ] Request history is maintained (last 100 requests)
- [ ] Error history is maintained (last 100 errors)
- [ ] History can be retrieved via service methods
- [ ] History includes: timestamp, model, status, duration, tokens

### 7. Token Tracking

- [ ] Input tokens are tracked from OpenRouter response
- [ ] Output tokens are tracked from OpenRouter response
- [ ] Total tokens are calculated (input + output)
- [ ] Token counts are included in API response
- [ ] Token counts are logged for analytics

### 8. Performance

- [ ] Request timeout is 30 seconds (configurable)
- [ ] Health check timeout is 5 seconds
- [ ] Health data is cached for 5 minutes
- [ ] Retry logic is implemented (3 retries with exponential backoff)
- [ ] Retry delay starts at 1 second and doubles on each retry
- [ ] Response times are tracked and included in responses

### 9. Frontend Integration

#### API Client Usage
- [ ] Frontend uses `apiServerClient.fetch('/ai/request')` (NO /api/ prefix)
- [ ] Frontend uses `apiServerClient.fetch('/ai/models')` (NO /api/ prefix)
- [ ] Frontend uses `apiServerClient.fetch('/ai/health')` (NO /api/ prefix)
- [ ] Frontend uses `apiServerClient.fetch('/ai/validate')` (NO /api/ prefix)
- [ ] Frontend correctly parses response format
- [ ] Frontend handles error responses gracefully

#### Response Parsing
- [ ] Frontend accesses `data.response` for AI response text
- [ ] Frontend accesses `data.tokens` for token counts
- [ ] Frontend accesses `data.model` for model name
- [ ] Frontend accesses `data.provider` for provider name
- [ ] Frontend accesses `data.duration` for request duration

### 10. Stability

#### Backend Stability
- [ ] No console errors in backend logs
- [ ] No unhandled promise rejections
- [ ] No memory leaks from request history
- [ ] Error middleware catches all errors
- [ ] Server remains stable under load

#### Frontend Stability
- [ ] Frontend remains responsive during API calls
- [ ] Frontend handles network timeouts gracefully
- [ ] Frontend displays error messages to user
- [ ] Frontend can retry failed requests
- [ ] No frontend crashes from API errors

## Post-Deployment Validation

### 1. Production Environment
- [ ] API key is configured in production `.env`
- [ ] CORS_ORIGIN is set appropriately for production domain
- [ ] Timeout values are appropriate for production
- [ ] Retry logic is working as expected
- [ ] Rate limiting is not blocking legitimate requests

### 2. Monitoring
- [ ] Error logs are being captured
- [ ] Request logs are being captured
- [ ] Token usage is being tracked
- [ ] Response times are being monitored
- [ ] Rate limit violations are being logged

### 3. User Experience
- [ ] Users can send AI requests successfully
- [ ] Users receive responses within reasonable time
- [ ] Users see clear error messages on failures
- [ ] Users can see available models
- [ ] Users can check API health status

## Troubleshooting Guide

### Issue: 401 Unauthorized
**Cause:** Invalid or expired API key
**Solution:** 
1. Verify API key in `.env` file
2. Check OpenRouter dashboard for key status
3. Generate new key if necessary
4. Restart API server

### Issue: 429 Too Many Requests
**Cause:** Rate limit exceeded
**Solution:**
1. Implement request queuing on frontend
2. Add delay between requests
3. Check OpenRouter account limits
4. Consider upgrading OpenRouter plan

### Issue: 503 Service Unavailable
**Cause:** OpenRouter service is down
**Solution:**
1. Check OpenRouter status page
2. Wait for service to recover
3. Implement fallback UI for users
4. Log incident for monitoring

### Issue: Timeout Errors
**Cause:** Request taking too long
**Solution:**
1. Check network connectivity
2. Increase timeout value if needed
3. Check OpenRouter service status
4. Reduce prompt size if possible

### Issue: No Response from /ai/models
**Cause:** API key not configured or invalid
**Solution:**
1. Check OPENROUTER_API_KEY in `.env`
2. Verify API key format
3. Test with `/ai/validate` endpoint
4. Check OpenRouter API status

## Sign-Off

- [ ] All validation checks passed
- [ ] No critical issues found
- [ ] API is ready for production
- [ ] Documentation is complete
- [ ] Team is trained on new endpoints

**Validated by:** _______________
**Date:** _______________
**Notes:** _______________