# Manual Testing Guide: Remove Dual Authentication Systems - Standardize on JWT

## Implementation Summary
- Removed Laravel Sanctum package completely from the Pre-Clinic Backend system
- Standardized on JWT (php-open-source-saver/jwt-auth) as the sole authentication system
- Cleaned up all Sanctum references from codebase and documentation
- Implementation Date: 2026-01-04
- Related Plan: `thoughts/shared/plans/2026-01-04-remove-dual-auth-standardize-jwt.md`

## Prerequisites
- [x] Docker containers running: `docker ps` (verify pre-clinic-backend-app-1, preclinic-mysql, preclinic-phpmyadmin)
- [x] Sanctum package removed from composer.json
- [x] Sanctum config file deleted
- [x] Personal access tokens migration removed
- [x] User model no longer uses HasApiTokens trait
- [x] Dev dependencies reinstalled (PHPUnit available for testing)
- [x] Laravel config and route caches cleared
- [x] Automated tests show 127/134 passing (7 pre-existing failures unrelated to this change)

## Test Scenarios

### Scenario 1: JWT Authentication - Login Flow
**Objective**: Verify JWT token generation works correctly and returns proper structure

**Steps**:
1. Ensure Docker containers are running: `docker ps`
2. Test login via cURL or Postman:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email": "admin@preclinic.com", "password": "password"}'
   ```

**Expected Results**:
- Status code: 200 OK
- Response JSON structure:
  ```json
  {
    "access_token": "<jwt_token_string>",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@preclinic.com",
      "roles": ["Super-Admin"],
      "permissions": [...]
    }
  }
  ```
- The `access_token` should be a valid JWT (three parts separated by dots: header.payload.signature)
- No errors in Laravel logs

**Edge Cases**:
- [ ] Test with invalid credentials - should return 401 Unauthorized
- [ ] Test with missing email field - should return validation error
- [ ] Test with missing password field - should return validation error
- [ ] Test with non-existent user email - should return 401 Unauthorized

---

### Scenario 2: Protected Route Access with JWT Token
**Objective**: Verify protected routes accept valid JWT tokens and return user data

**Steps**:
1. Copy the `access_token` from Scenario 1
2. Test authenticated endpoint:
   ```bash
   curl -X POST http://localhost:8000/api/auth/me \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
   ```

**Expected Results**:
- Status code: 200 OK
- Response contains authenticated user data:
  ```json
  {
    "success": true,
    "data": {
      "id": 1,
      "name": "Admin User",
      "email": "admin@preclinic.com",
      ...
    },
    "message": "User profile retrieved successfully"
  }
  ```
- User data matches the logged-in user from Scenario 1

**Edge Cases**:
- [ ] Test without Authorization header - should return 401 Unauthorized
- [ ] Test with malformed token - should return 401 Unauthorized
- [ ] Test with "Bearer" prefix missing - should return 401 Unauthorized
- [ ] Test with expired token - should return 401 Unauthorized (if TTL has passed)

---

### Scenario 3: JWT Token Refresh
**Objective**: Verify token refresh endpoint generates new valid tokens

**Steps**:
1. Use a valid JWT token from Scenario 1
2. Request token refresh:
   ```bash
   curl -X POST http://localhost:8000/api/auth/refresh \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
   ```

**Expected Results**:
- Status code: 200 OK
- Response contains new JWT token:
  ```json
  {
    "access_token": "<new_jwt_token>",
    "token_type": "bearer",
    "expires_in": 3600,
    "user": {...}
  }
  ```
- New token is different from the original token
- New token works for authenticated requests
- Old token is invalidated (blacklisted)

**Edge Cases**:
- [ ] Test with invalid token - should return 401 Unauthorized
- [ ] Test with already-refreshed token - should fail (token blacklisted)
- [ ] Verify old token no longer works after refresh

---

### Scenario 4: JWT Token Logout and Blacklisting
**Objective**: Verify logout properly invalidates JWT tokens

**Steps**:
1. Use a valid JWT token from Scenario 1
2. Logout:
   ```bash
   curl -X POST http://localhost:8000/api/auth/logout \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
   ```
3. Attempt to use the same token for a protected route:
   ```bash
   curl -X POST http://localhost:8000/api/auth/me \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
   ```

**Expected Results**:
- Step 2: Status code 200 OK with success message
- Step 3: Status code 401 Unauthorized (token should be blacklisted)
- Error message indicating token is invalid or blacklisted

**Edge Cases**:
- [ ] Test logout without token - should return 401 Unauthorized
- [ ] Test double logout (logout with already-blacklisted token) - should return 401

---

### Scenario 5: User Registration with JWT
**Objective**: Verify new user registration creates account and returns JWT token

**Steps**:
1. Register new user:
   ```bash
   curl -X POST http://localhost:8000/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{
       "name": "Test User",
       "email": "testuser@example.com",
       "password": "SecurePassword123!",
       "password_confirmation": "SecurePassword123!"
     }'
   ```

**Expected Results**:
- Status code: 201 Created
- Response contains JWT token for new user
- New user can immediately use token for authenticated requests
- User is created in database

**Edge Cases**:
- [ ] Test with existing email - should return validation error
- [ ] Test with weak password - should return validation error
- [ ] Test with mismatched password confirmation - should return validation error
- [ ] Test with missing required fields - should return validation errors

---

### Scenario 6: Verify No Sanctum Dependencies Remain
**Objective**: Confirm Sanctum is completely removed from the system

**Steps**:
1. Check composer.json: `grep "sanctum" Pre-Clinic-Backend/composer.json`
2. Check composer.lock: `grep "sanctum" Pre-Clinic-Backend/composer.lock`
3. Check for config file: `ls Pre-Clinic-Backend/config/sanctum.php`
4. Check for migration: `ls Pre-Clinic-Backend/database/migrations/*personal_access_tokens*`
5. Check User model: `grep "HasApiTokens" Pre-Clinic-Backend/app/Models/User.php`
6. Check vendor directory: `ls Pre-Clinic-Backend/vendor/laravel/ | grep sanctum`

**Expected Results**:
- All commands should return no results or "No such file or directory"
- No Sanctum package in dependencies
- No Sanctum configuration files
- No Sanctum traits in User model
- No Sanctum in vendor directory

---

### Scenario 7: Multi-Resource API Access with JWT
**Objective**: Verify JWT authentication works across all API endpoints

**Steps**:
1. Login and obtain JWT token (Scenario 1)
2. Test various protected endpoints:
   ```bash
   # Test patients endpoint
   curl -X GET http://localhost:8000/api/patients \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"

   # Test doctors endpoint
   curl -X GET http://localhost:8000/api/doctors \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"

   # Test appointments endpoint
   curl -X GET http://localhost:8000/api/appointments \
     -H "Authorization: Bearer <YOUR_ACCESS_TOKEN>"
   ```

**Expected Results**:
- All endpoints return appropriate data based on user permissions
- JWT authentication works consistently across all routes
- No errors related to authentication mechanism
- Authorization (permissions) may vary by user role (403 errors expected for unauthorized actions)

**Edge Cases**:
- [ ] Test each endpoint without token - should return 401
- [ ] Test with different user roles (doctor, patient, admin) - permissions should vary
- [ ] Verify CORS headers are present for cross-origin requests

---

## Regression Testing
Test that existing functionality still works after Sanctum removal:

### Authentication & Authorization
- [ ] JWT login works for all user types (admin, doctor, patient, staff, technician)
- [ ] JWT token refresh works correctly
- [ ] JWT token logout and blacklisting works
- [ ] Protected routes require valid JWT tokens
- [ ] Role-based permissions still enforced (Spatie Permission package)
- [ ] Super-Admin bypass still works via Gate::before

### API Functionality
- [ ] All resource CRUD operations work (patients, doctors, appointments, etc.)
- [ ] Relationship management endpoints work (doctor-department, doctor-specialty, etc.)
- [ ] Permission checks work correctly (403 for unauthorized actions)
- [ ] Validation errors return properly formatted responses

### System Stability
- [ ] No errors in Laravel logs related to authentication
- [ ] Application loads without configuration errors
- [ ] Composer autoload works correctly
- [ ] Tests pass (127/134 passing, 7 pre-existing failures unrelated to this change)

---

## Angular Frontend Testing (If Frontend Available)

### Prerequisites
- [ ] Angular development server running
- [ ] Backend API accessible at http://localhost:8000

### Frontend Authentication Flow
1. **Login Test**:
   - Navigate to login page
   - Enter valid credentials
   - Verify successful login and redirect
   - Check that JWT token is stored (localStorage/sessionStorage)
   - Verify Authorization header includes "Bearer <token>"

2. **Protected Routes Test**:
   - Navigate to protected routes (dashboard, patient list, etc.)
   - Verify data loads successfully
   - Check network tab for Authorization headers in API requests

3. **Logout Test**:
   - Click logout button
   - Verify token is cleared from storage
   - Verify redirect to login page
   - Attempt to access protected route - should redirect to login

4. **Token Expiration Test**:
   - Wait for token to expire (default: 60 minutes)
   - Attempt to access protected route
   - Verify automatic logout or token refresh (depending on frontend implementation)

**Expected Results**:
- Frontend continues to work exactly as before
- No changes needed to Angular app (API contract unchanged)
- JWT tokens work seamlessly with existing frontend authentication

---

## Performance Testing

### Baseline Metrics to Monitor
- [ ] Login endpoint response time (<500ms expected)
- [ ] Protected route response time (<200ms expected)
- [ ] Token refresh response time (<300ms expected)
- [ ] No performance degradation vs. previous Sanctum+JWT setup

### Load Testing (Optional)
- [ ] Test concurrent login requests (10-50 users)
- [ ] Test token validation under load
- [ ] Monitor memory usage and CPU during authentication

---

## Known Issues / Limitations

### Pre-Existing Test Failures (Unrelated to Sanctum Removal)
The following tests were failing before this change and remain failing:

1. **PatientController Issues (5 tests)**:
   - `test_admin_can_create_patient`
   - `test_medical_director_can_create_patient`
   - `test_admin_can_update_patient`
   - `test_medical_director_can_update_patient`
   - `test_patient_can_update_own_profile`
   - **Issue**: Code bug calling `$request->validated()` on Request object instead of FormRequest
   - **Fix Needed**: Update PatientController to use FormRequest or proper validation

2. **Permission/Authorization Issues (2 tests)**:
   - `test_authenticated_user_can_list_patients`
   - `test_user_registration_requires_edit_articles_permission`
   - **Issue**: Permission/policy configuration issues
   - **Fix Needed**: Review PatientPolicy and permission seeding

### Post-Implementation Notes
- Sanctum package completely removed (saved ~5MB in vendor directory)
- Only JWT authentication remains - simpler, cleaner architecture
- No frontend changes required - API contract unchanged
- Documentation updated to reflect JWT-only architecture
- Migration file removed - future fresh installs won't create unused tables

---

## Rollback Instructions

If critical issues are found during manual testing:

1. **Restore Sanctum Package**:
   ```bash
   # Add back to composer.json require section
   "laravel/sanctum": "^4.0"

   # Reinstall
   docker exec pre-clinic-backend-app-1 composer update
   ```

2. **Restore User Model**:
   ```bash
   git checkout develop -- Pre-Clinic-Backend/app/Models/User.php
   ```

3. **Restore Config File**:
   ```bash
   git checkout develop -- Pre-Clinic-Backend/config/sanctum.php
   ```

4. **Restore Migration**:
   ```bash
   git checkout develop -- Pre-Clinic-Backend/database/migrations/2024_08_15_000309_create_personal_access_tokens_table.php
   ```

5. **Regenerate Autoload**:
   ```bash
   docker exec pre-clinic-backend-app-1 composer dump-autoload
   docker exec pre-clinic-backend-app-1 php artisan config:clear
   docker exec pre-clinic-backend-app-1 php artisan route:clear
   ```

All rollback operations use git to restore original files - no data loss risk.

---

## Success Criteria Checklist

### Phase 1: Package and Code Removal
- [x] Sanctum package removed from composer.json
- [x] Sanctum package removed from vendor directory
- [x] HasApiTokens trait removed from User model
- [x] User model loads without errors
- [x] Composer autoload regenerated successfully

### Phase 2: Configuration Cleanup
- [x] config/sanctum.php deleted
- [x] personal_access_tokens migration deleted
- [x] No code references to Sanctum remain
- [x] Laravel config cache cleared
- [x] Laravel route cache cleared

### Phase 3: Documentation and Testing
- [x] Documentation updated (removed all Sanctum references)
- [x] Authentication tests pass (37/39, 2 pre-existing failures)
- [x] Full test suite acceptable (127/134, 7 pre-existing failures)
- [x] JWT configuration verified intact

### Manual Verification (Complete During Testing)
- [ ] Login endpoint returns valid JWT tokens
- [ ] Protected routes require JWT authorization
- [ ] Token refresh generates new valid tokens
- [ ] Logout blacklists tokens correctly
- [ ] User registration returns JWT tokens
- [ ] No Sanctum dependencies remain in codebase
- [ ] Multi-resource API access works with JWT
- [ ] Frontend authentication works (if tested)

---

## Testing Sign-Off

**Tester Name**: ___________________________

**Date Tested**: ___________________________

**Test Results**:
- [ ] All critical scenarios passed
- [ ] All edge cases tested
- [ ] Regression testing completed
- [ ] Frontend testing completed (if applicable)
- [ ] No new issues introduced

**Issues Found**:
_____________________________________________________________
_____________________________________________________________
_____________________________________________________________

**Recommendation**:
- [ ] Approve - Ready for production
- [ ] Approve with notes - Minor issues documented
- [ ] Reject - Critical issues found, requires fixes

---

*This manual testing guide ensures comprehensive verification of the Sanctum removal and JWT-only authentication implementation.*
