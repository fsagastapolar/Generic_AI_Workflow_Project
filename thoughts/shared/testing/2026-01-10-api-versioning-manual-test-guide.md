# Manual Testing Guide: API Versioning Implementation

## Implementation Summary
- **Feature**: URI-based API versioning with `/api/v1/` prefix
- **Implementation Date**: 2026-01-10
- **Plan**: `thoughts/shared/plans/2026-01-10-api-versioning.md`

## Changes Implemented
- All API routes moved from `/api/` to `/api/v1/`
- Controllers reorganized into `App\Http\Controllers\API\V1` namespace
- Frontend environment configurations updated to use `/api/v1/`
- Scramble API documentation integrated
- Version management infrastructure created

## Prerequisites
- [ ] Docker containers running: `docker ps`
- [ ] Backend running: `http://localhost:8000` accessible
- [ ] Frontend running: `ng serve` (if testing frontend integration)
- [ ] Database migrated and seeded: `docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed`
- [ ] Route cache cleared: `docker exec pre-clinic-backend-app-1 php artisan route:clear`

## Test Scenarios

### Scenario 1: Backend - V1 Routes Are Accessible
**Objective**: Verify all API endpoints work with `/api/v1/` prefix

**Steps**:
1. Open Postman or use curl
2. Test public authentication endpoint:
   ```bash
   curl -X POST http://localhost:8000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
   ```
3. Copy the `access_token` from the response
4. Test protected endpoint with token:
   ```bash
   curl -X GET http://localhost:8000/api/v1/doctors \
     -H "Authorization: Bearer YOUR_TOKEN_HERE"
   ```

**Expected Results**:
- Login returns 200 status with JWT token
- Protected endpoints return 200 status with data when authenticated
- No 404 errors

**Edge Cases**:
- [ ] Test with invalid credentials - should return 401
- [ ] Test protected endpoint without token - should return 401
- [ ] Test with expired token - should return 401

### Scenario 2: Backend - Old Routes Return 404
**Objective**: Verify backward compatibility is broken (as intended)

**Steps**:
1. Attempt to access old endpoint without `/v1/`:
   ```bash
   curl -X POST http://localhost:8000/api/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"password"}'
   ```

**Expected Results**:
- Returns 404 Not Found
- Confirms old routes are no longer available

### Scenario 3: API Documentation UI
**Objective**: Verify Scramble documentation is accessible and functional

**Steps**:
1. Open browser and navigate to `http://localhost:8000/docs/api`
2. Verify the documentation UI loads
3. Check that API endpoints are listed
4. Click on `POST /api/v1/auth/login` endpoint
5. Click "Try it out"
6. Enter test credentials and execute
7. Copy the returned JWT token
8. Click the "Authorize" button at the top
9. Enter token as `Bearer YOUR_TOKEN`
10. Test a protected endpoint like `GET /api/v1/doctors`

**Expected Results**:
- Documentation UI loads with Stoplight Elements interface
- All v1 endpoints are visible (60+ routes)
- "Authorize" button is present
- Can successfully test endpoints interactively
- After authorization, protected endpoints return data

**Edge Cases**:
- [ ] OpenAPI JSON accessible at `/docs/api.json`
- [ ] Documentation shows request/response schemas
- [ ] JWT authentication is documented

### Scenario 4: Frontend Integration
**Objective**: Verify frontend successfully communicates with versioned API

**Prerequisites**: Frontend must be running (`ng serve`)

**Steps**:
1. Open browser to `http://localhost:4200`
2. Open browser console (F12) - Network tab
3. Navigate to login page
4. Enter valid credentials and login
5. Observe network requests in console
6. Navigate to Doctors list page
7. Observe network requests for data fetching
8. Try creating a new entity (doctor, patient, etc.)
9. Try editing an existing entity
10. Try deleting an entity

**Expected Results**:
- All network requests go to `/api/v1/` endpoints
- No requests to old `/api/` endpoints
- Login successful and redirects to dashboard
- All CRUD operations work correctly
- No console errors
- Data loads and displays correctly

**Edge Cases**:
- [ ] Test with invalid credentials - error message displays
- [ ] Test session timeout - redirects to login
- [ ] Test permissions - unauthorized actions show proper error

### Scenario 5: Route Names
**Objective**: Verify route names are correctly prefixed with `v1.`

**Steps**:
1. List all routes with names:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan route:list --name=v1
   ```
2. Check for auth routes specifically:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan route:list --name=v1.auth
   ```

**Expected Results**:
- Auth routes have names: `v1.login`, `v1.logout`, `v1.refresh`, `v1.me`, `v1.register`
- All named routes include `v1.` prefix
- No duplicate route names

### Scenario 6: Configuration Files
**Objective**: Verify configuration is correct

**Steps**:
1. Check backend API config:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan config:show api
   ```
2. Check frontend environment (dev):
   ```bash
   cat Pre-Clinic-frontend/src/environments/environment.ts
   ```
3. Check frontend environment (prod):
   ```bash
   cat Pre-Clinic-frontend/src/environments/environment.prod.ts
   ```

**Expected Results**:
- Backend `api.current_version` = 'v1'
- Backend `api.supported_versions` contains v1 configuration
- Frontend dev environment: `apiBaseUrl: 'http://localhost:8000/api/v1'`
- Frontend prod environment: `apiBaseUrl: 'https://YOUR_PRODUCTION_DOMAIN/api/v1'`

### Scenario 7: Complete User Workflow (End-to-End)
**Objective**: Test complete user journey through the application

**Steps**:
1. **Login**:
   - Navigate to login page
   - Enter valid credentials
   - Click login button
   - Verify redirect to dashboard

2. **View List**:
   - Navigate to Doctors list
   - Verify doctors load
   - Verify pagination works (if applicable)

3. **Create**:
   - Click "Add Doctor" button
   - Fill in required fields
   - Submit form
   - Verify success message
   - Verify doctor appears in list

4. **Edit**:
   - Click edit button on a doctor
   - Modify a field
   - Save changes
   - Verify success message
   - Verify changes persist

5. **Delete**:
   - Click delete button on a doctor
   - Confirm deletion
   - Verify success message
   - Verify doctor removed from list

6. **Logout**:
   - Click logout button
   - Verify redirect to login page
   - Verify token is cleared

**Expected Results**:
- All operations complete successfully
- No errors in console
- UI updates correctly after each operation
- All network requests use `/api/v1/` endpoints

## Regression Testing
Test that existing functionality still works:
- [ ] User authentication and authorization
- [ ] Patient management CRUD operations
- [ ] Doctor management CRUD operations
- [ ] Appointment management
- [ ] Health center management
- [ ] Roles and permissions management
- [ ] Relationship endpoints (doctor-specialty, health-center-doctor, etc.)

## Performance Verification
- [ ] API response times are comparable to before (no significant degradation)
- [ ] Page load times are normal
- [ ] No memory leaks observed during testing

## Known Issues / Limitations
- None identified during implementation
- This is a breaking change - all API consumers must update to `/api/v1/`

## Rollback Instructions
If critical issues are found:

### Backend Rollback:
```bash
# Navigate to backend directory
cd Pre-Clinic-Backend

# Revert the git changes (if committed)
git revert HEAD

# Clear caches
docker exec pre-clinic-backend-app-1 php artisan route:clear
docker exec pre-clinic-backend-app-1 php artisan config:clear
```

### Frontend Rollback:
Update environment files back to:
```typescript
apiBaseUrl: 'http://localhost:8000/api'
```

## Test Results Checklist
- [ ] All backend V1 routes accessible
- [ ] Old routes return 404 as expected
- [ ] API documentation UI works
- [ ] Frontend successfully integrates with V1 API
- [ ] Route names correctly prefixed
- [ ] Configuration files correct
- [ ] Complete end-to-end workflow successful
- [ ] No regression issues found
- [ ] Performance is acceptable

## Sign-off
**Tested By**: _________________
**Date**: _________________
**Status**: [ ] Pass  [ ] Fail  [ ] Pass with Issues

**Issues Found**:
- _________________
- _________________

**Notes**:
_________________
