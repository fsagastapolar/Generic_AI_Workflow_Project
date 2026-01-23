# Manual Testing Guide: Login Input Validation

## Implementation Summary
- Added input validation to the login endpoint to prevent malformed or malicious data
- Added custom error messages for validation failures
- Addresses Critical Security Review point #5 (Pre-Clinic-System-Critical-Review.md)
- Implementation Date: 2026-01-04

## Prerequisites
- [ ] Docker containers running: `docker ps`
- [ ] Database migrated: `docker exec pre-clinic-backend-app-1 php artisan migrate`
- [ ] Database seeded (if needed): `docker exec pre-clinic-backend-app-1 php artisan db:seed`
- [ ] Test user exists with credentials: `test@example.com` / `password`

## Test Scenarios

### Scenario 1: Valid Login (Baseline Test)
**Objective**: Verify that valid login still works correctly after validation implementation

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide payload:
   ```json
   {
     "email": "test@example.com",
     "password": "password"
   }
   ```
3. Verify response

**Expected Results**:
- HTTP Status: 200
- Response includes:
  - `success: true`
  - `message: "User login successfully."`
  - `data.access_token` (JWT token)
  - `data.token_type: "bearer"`
  - `data.expires_in` (integer)
  - `data.user` object with name, email, roles, permissions

**Edge Cases**:
- [ ] Test with different valid users (if multiple exist)
- [ ] Verify token can be used for subsequent authenticated requests
- [ ] Verify token expiry is set correctly

---

### Scenario 2: Missing Email Field
**Objective**: Verify validation rejects requests with missing email

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide payload with only password:
   ```json
   {
     "password": "password123"
   }
   ```

**Expected Results**:
- HTTP Status: 422
- Response structure:
  ```json
  {
    "success": false,
    "message": "Validation Error.",
    "data": {
      "email": ["Email address is required."]
    }
  }
  ```

**Edge Cases**:
- [ ] Verify exact error message matches custom message
- [ ] Verify only email error is returned (not password error)

---

### Scenario 3: Invalid Email Format
**Objective**: Verify validation rejects invalid email formats

**Steps**:
1. Send POST request to `/api/auth/login`
2. Test with various invalid email formats:
   - `"email": "not-an-email"`
   - `"email": "missing-at-sign.com"`
   - `"email": "@no-local-part.com"`
   - `"email": "spaces in@email.com"`

**Expected Results**:
- HTTP Status: 422
- Response structure:
  ```json
  {
    "success": false,
    "message": "Validation Error.",
    "data": {
      "email": ["Please provide a valid email address."]
    }
  }
  ```

**Edge Cases**:
- [ ] Test with completely invalid format: `"not-an-email"`
- [ ] Test with missing @ symbol: `"invalidemail.com"`
- [ ] Test with spaces: `"test @example.com"`
- [ ] Verify custom error message is shown

---

### Scenario 4: Missing Password Field
**Objective**: Verify validation rejects requests with missing password

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide payload with only email:
   ```json
   {
     "email": "test@example.com"
   }
   ```

**Expected Results**:
- HTTP Status: 422
- Response structure:
  ```json
  {
    "success": false,
    "message": "Validation Error.",
    "data": {
      "password": ["Password is required."]
    }
  }
  ```

**Edge Cases**:
- [ ] Verify exact error message matches custom message
- [ ] Verify only password error is returned (not email error)

---

### Scenario 5: Empty Email
**Objective**: Verify validation rejects empty email strings

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide payload with empty email:
   ```json
   {
     "email": "",
     "password": "password123"
   }
   ```

**Expected Results**:
- HTTP Status: 422
- Response includes email validation error
- Error message: "Email address is required."

**Edge Cases**:
- [ ] Test with empty string: `""`
- [ ] Test with only whitespace: `"   "` (should also fail)

---

### Scenario 6: Empty Password
**Objective**: Verify validation rejects empty password strings

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide payload with empty password:
   ```json
   {
     "email": "test@example.com",
     "password": ""
   }
   ```

**Expected Results**:
- HTTP Status: 422
- Response includes password validation error
- Error message: "Password is required."

**Edge Cases**:
- [ ] Test with empty string: `""`
- [ ] Test with only whitespace: `"   "` (should also fail)

---

### Scenario 7: Wrong Type for Password
**Objective**: Verify validation rejects non-string password values

**Steps**:
1. Send POST request to `/api/auth/login`
2. Test with various invalid password types:
   ```json
   {
     "email": "test@example.com",
     "password": ["array", "of", "strings"]
   }
   ```
   ```json
   {
     "email": "test@example.com",
     "password": 12345
   }
   ```
   ```json
   {
     "email": "test@example.com",
     "password": {"key": "value"}
   }
   ```

**Expected Results**:
- HTTP Status: 422
- Response structure:
  ```json
  {
    "success": false,
    "message": "Validation Error.",
    "data": {
      "password": ["Password must be a valid string."]
    }
  }
  ```

**Edge Cases**:
- [ ] Test with array: `["not", "a", "string"]`
- [ ] Test with number: `12345`
- [ ] Test with object: `{"key": "value"}`
- [ ] Test with boolean: `true`

---

### Scenario 8: Missing Both Credentials
**Objective**: Verify validation rejects requests with no credentials

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide empty payload:
   ```json
   {}
   ```

**Expected Results**:
- HTTP Status: 422
- Response structure:
  ```json
  {
    "success": false,
    "message": "Validation Error.",
    "data": {
      "email": ["Email address is required."],
      "password": ["Password is required."]
    }
  }
  ```

**Edge Cases**:
- [ ] Verify both email and password errors are returned
- [ ] Verify custom error messages for both fields

---

### Scenario 9: Invalid Credentials (After Validation Passes)
**Objective**: Verify that after validation passes, authentication still works correctly

**Steps**:
1. Send POST request to `/api/auth/login`
2. Provide valid format but wrong credentials:
   ```json
   {
     "email": "test@example.com",
     "password": "wrong-password"
   }
   ```

**Expected Results**:
- HTTP Status: 422
- Response structure:
  ```json
  {
    "success": false,
    "message": "Unauthorized.",
    "data": {
      "error": "Unauthorized"
    }
  }
  ```

**Notes**:
- This verifies that validation doesn't interfere with authentication
- Error message should be "Unauthorized." not "Validation Error."

**Edge Cases**:
- [ ] Valid email format, wrong password
- [ ] Wrong email, valid password format
- [ ] Both wrong but valid formats

---

## Regression Testing

Verify that existing authentication functionality still works:

- [ ] **Login with valid credentials** works exactly as before
- [ ] **Token generation** produces valid JWT tokens
- [ ] **Token structure** includes all required fields (access_token, token_type, expires_in, user)
- [ ] **User object** includes name, email, roles, permissions
- [ ] **Logout endpoint** still works with valid token
- [ ] **Refresh token endpoint** still works with valid token
- [ ] **Profile endpoint** (/api/auth/me) still works with valid token
- [ ] **Response format** matches existing API patterns (success, message, data structure)

## Testing Tools

You can use any of these tools to perform the tests:

### Using cURL
```bash
# Valid login
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Missing email
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"password":"password123"}'

# Invalid email format
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"not-an-email","password":"password123"}'
```

### Using Postman
1. Import the API collection (if available)
2. Create a new request for each scenario
3. Set method to POST
4. Set URL to `http://localhost:8000/api/auth/login`
5. Set headers: `Content-Type: application/json`
6. Set body (raw JSON) according to each scenario
7. Send and verify response

### Using Insomnia
Similar to Postman - create requests for each scenario and verify responses.

## Known Issues / Limitations

- Pre-existing test failures in PatientApiTest and AuthorizationTest (unrelated to login validation)
- These failures existed before the login validation implementation

## Rollback Instructions

If critical issues are found during testing:

1. **Revert the changes**:
   ```bash
   cd Pre-Clinic-Backend
   git checkout develop -- app/Http/Controllers/API/AuthController.php
   git checkout develop -- tests/Feature/Auth/AuthenticationTest.php
   ```

2. **Verify rollback**:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan test --filter=AuthenticationTest
   ```

3. **Re-seed database** (if needed):
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed
   ```

## Sign-off

**Manual Testing Completed By**: _______________
**Date**: _______________
**Issues Found**: _______________
**Approved for Merge**: [ ] Yes [ ] No
