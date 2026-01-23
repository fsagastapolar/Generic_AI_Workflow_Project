# Manual Testing Guide: API Versioning Migration to /api/v1/

## Implementation Summary
- Migrated all API routes from /api/* to /api/v1/*
- Updated backend route registration in bootstrap/app.php
- Updated exception handling to check for api/v1/* pattern
- Updated 10 backend test files to use new paths
- Frontend was already configured for /api/v1/ endpoints (no changes needed)
- Implementation Date: 2026-01-11

## Prerequisites
- [ ] Docker containers running: `docker ps`
  - Verify `pre-clinic-backend-app-1` is running
  - Verify `preclinic-mysql` is running
- [ ] Backend accessible: http://localhost
- [ ] Frontend running (if testing UI): Navigate to Pre-Clinic-frontend directory
- [ ] Test user credentials available (check database seeders)

## Test Scenarios

### Scenario 1: Route Registration Verification
**Objective**: Verify routes are correctly registered with v1 prefix

**Steps**:
1. Run: `docker exec pre-clinic-backend-app-1 php artisan route:list --path=api/v1`
2. Verify all routes have `api/v1/` prefix
3. Check that old `api/` routes don't exist: `docker exec pre-clinic-backend-app-1 php artisan route:list --path=api/health-centers`

**Expected Results**:
- All routes show as `api/v1/*`
- Route count is 98 routes (excluding header lines)
- Old route command returns: "Your application doesn't have any routes matching the given criteria"
- Routes include: auth, doctors, patients, health-centers, appointments, etc.

### Scenario 2: Authentication Flow via API
**Objective**: Verify auth endpoints work with new paths using direct API calls

**Steps**:
1. **Register** (requires admin token):
   ```bash
   # First login as admin to get token
   curl -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'

   # Then register new user (use token from above)
   curl -X POST http://localhost/api/v1/auth/register \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE" \
     -d '{"name":"Test User","email":"test@example.com","password":"ValidPass123!","password_confirmation":"ValidPass123!"}'
   ```

2. **Login**:
   ```bash
   curl -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"ValidPass123!"}'
   ```

3. **Get Profile** (use token from login):
   ```bash
   curl -X POST http://localhost/api/v1/auth/me \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

4. **Logout**:
   ```bash
   curl -X POST http://localhost/api/v1/auth/logout \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

5. **Test old endpoint returns 404**:
   ```bash
   curl -X POST http://localhost/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"password"}'
   ```

**Expected Results**:
- Login returns 200 with `access_token` in response
- /me endpoint returns 200 with user data
- Logout succeeds with 200 status
- Old `/api/auth/login` returns 404 Not Found

### Scenario 3: Resource Endpoints (Doctors Example)
**Objective**: Verify CRUD operations work on new paths

**Steps**:
1. **List doctors**:
   ```bash
   curl -X GET http://localhost/api/v1/doctors \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

2. **Get specific doctor**:
   ```bash
   curl -X GET http://localhost/api/v1/doctors/1 \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

3. **Filter doctors by health center**:
   ```bash
   curl -X GET "http://localhost/api/v1/doctors?health_center_id=1" \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

4. **Test old path returns 404**:
   ```bash
   curl -X GET http://localhost/api/doctors \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

**Expected Results**:
- GET /api/v1/doctors returns 200 with paginated list of doctors
- GET /api/v1/doctors/1 returns 200 with doctor details
- Filtered request works correctly
- Old path (`/api/doctors`) returns 404

### Scenario 4: Backend Test Suite
**Objective**: Verify all tests pass with new versioned routes

**Steps**:
1. Run full test suite:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan test
   ```

2. Run specific test file to verify:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan test tests/Feature/Auth/AuthenticationTest.php
   ```

**Expected Results**:
- 161 tests pass successfully
- 5 pre-existing failures unrelated to API versioning:
  - PatientApiTest failures (controller `validated()` method issue)
  - RelationshipManagementTest failure (unique constraint in database)
- All routing-related tests pass
- No new failures introduced by API versioning changes

### Scenario 5: Frontend Integration (If Frontend Running)
**Objective**: Verify frontend communicates with backend correctly

**Steps**:
1. Start frontend application (if not running)
2. Open browser and navigate to frontend URL
3. Open browser DevTools → Network tab
4. Perform login through UI
5. Navigate to Doctors list page
6. Navigate to Patients list page
7. Monitor all API calls in Network tab

**Expected Results**:
- All API calls use `/api/v1/` paths
- No 404 errors in console
- No `/api/` (without v1) requests visible
- Login works correctly
- Data loads successfully from backend
- Features work as expected

### Scenario 6: Error Handling for API Routes
**Objective**: Verify error responses are JSON formatted for versioned API routes

**Steps**:
1. **Unauthenticated request to protected endpoint**:
   ```bash
   curl -X GET http://localhost/api/v1/doctors
   ```

2. **Invalid credentials**:
   ```bash
   curl -X POST http://localhost/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"wrong@example.com","password":"wrongpassword"}'
   ```

3. **Non-existent route**:
   ```bash
   curl -X GET http://localhost/api/v1/nonexistent
   ```

**Expected Results**:
- Unauthenticated returns 401 with JSON: `{"message": "Unauthenticated."}`
- Invalid credentials return 422 with JSON error details
- Non-existent route returns 404 (may not be JSON, that's OK)
- Errors under `api/v1/*` return JSON format (not HTML)

## Edge Cases

### Query Parameters
**Test**: Verify query parameters work correctly
```bash
curl -X GET "http://localhost/api/v1/patients?per_page=10&page=2" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
**Expected**: Returns paginated results correctly

### Nested Routes
**Test**: Verify nested resource routes work
```bash
curl -X GET http://localhost/api/v1/health-centers/1/doctors \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
**Expected**: Returns doctors associated with health center

### Pagination
**Test**: Verify pagination metadata is correct
```bash
curl -X GET "http://localhost/api/v1/doctors?per_page=5" \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```
**Expected**: Response includes meta object with pagination details

## Regression Testing
Test that existing functionality still works:

- [ ] User authentication and authorization
- [ ] Role-based access control (admin, doctor, patient, etc.)
- [ ] Relationships (doctors ↔ health centers, patients ↔ appointments)
- [ ] Validation error messages
- [ ] Database operations (CRUD)
- [ ] Permission caching
- [ ] Query optimization (no N+1 queries)

## Known Issues / Limitations

### Breaking Changes
- **Breaking change**: Old `/api/*` endpoints no longer work
- All API clients must update to use `/api/v1/` paths
- Frontend was already configured correctly, so no frontend changes were needed

### Pre-existing Test Failures
The following test failures exist but are **unrelated to API versioning**:
1. **PatientApiTest** (4 failures): Controller method `validated()` doesn't exist
   - Affects: test_patient_can_update_own_profile and related tests
   - Root cause: Controller code issue, not routing

2. **RelationshipManagementTest** (1 failure): Unique constraint violation
   - Affects: test_can_create_and_manage_technician_types
   - Root cause: Database factory seeding issue, not routing

These failures existed before the API versioning migration and are tracked separately.

## Rollback Instructions
If critical issues are found during manual testing:

1. **Revert bootstrap/app.php changes**:
   ```php
   // In Pre-Clinic-Backend/bootstrap/app.php
   // Restore simplified routing (around line 10-15)
   ->withRouting(
       web: __DIR__.'/../routes/web.php',
       api: __DIR__.'/../routes/api.php',  // Restore this line
       commands: __DIR__.'/../routes/console.php',
       health: '/up',
       // Remove 'then:' callback completely
   )

   // Revert exception handler check (around line 30)
   if ($request->is('api/*')) {  // Back to api/* instead of api/v1/*
   ```

2. **Revert test files**: Use git to restore original test files
   ```bash
   cd Pre-Clinic-Backend
   git checkout -- tests/Feature/
   ```

3. **Clear caches**:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan route:clear
   docker exec pre-clinic-backend-app-1 php artisan config:clear
   docker exec pre-clinic-backend-app-1 php artisan cache:clear
   docker exec pre-clinic-backend-app-1 php artisan optimize:clear
   ```

4. **Verify rollback**:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan route:list --path=api
   docker exec pre-clinic-backend-app-1 php artisan test
   ```

5. **Revert frontend** (if changes were made):
   - In this case, frontend didn't need changes, so no rollback needed

## Implementation Notes

### Files Modified
- **Backend**:
  - `Pre-Clinic-Backend/bootstrap/app.php` (route registration and exception handling)
  - 10 test files in `Pre-Clinic-Backend/tests/Feature/`

- **Frontend**:
  - No changes needed (already configured for `/api/v1/`)

### Routes Migrated
- Total routes: 98 API routes
- All routes now use `api/v1/` prefix
- Includes: auth, doctors, patients, appointments, health-centers, medical-specialties, departments, roles, technicians, etc.

### Testing Status
- ✅ 161 backend tests passing
- ⚠️ 5 pre-existing failures (unrelated to API versioning)
- ✅ All authentication tests passing
- ✅ All pagination tests passing
- ✅ All authorization tests passing
- ✅ Route registration verified
- ✅ Old routes confirmed removed

## Deployment Checklist

Before deploying to production:

- [ ] All manual testing scenarios completed successfully
- [ ] Frontend tested and working with new endpoints
- [ ] Database migrations are up to date
- [ ] Environment variables checked (API_BASE_URL in frontend .env)
- [ ] API documentation updated to reflect new paths
- [ ] Team members notified of the breaking change
- [ ] Rollback plan understood and tested
- [ ] Monitoring/logging configured to track 404 errors
- [ ] Consider coordinated deployment (backend + frontend together)

## Success Criteria Met

✅ All routes registered with `/api/v1/` prefix
✅ Old `/api/*` routes return 404
✅ Backend tests updated and passing (161 tests)
✅ Frontend already configured correctly
✅ Exception handling updated for versioned routes
✅ Manual testing guide created
✅ Rollback procedure documented

## Contact / Support

If you encounter issues during manual testing:
1. Check the rollback instructions above
2. Verify Docker containers are running
3. Check Laravel logs: `docker exec pre-clinic-backend-app-1 tail -f storage/logs/laravel.log`
4. Review route list to confirm routes are registered correctly
