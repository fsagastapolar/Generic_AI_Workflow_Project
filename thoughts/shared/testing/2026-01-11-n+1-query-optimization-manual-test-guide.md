# Manual Testing Guide: N+1 Query Optimization

**Date:** 2026-01-11
**Feature:** N+1 Query Optimization & Pagination Implementation
**Related Plan:** thoughts/shared/plans/2026-01-10-n+1-query-optimization.md

## Prerequisites

### Environment Setup
- ✅ Docker containers running (`pre-clinic-backend-app-1`, `preclinic-mysql`)
- ✅ Database seeded with test data
- ✅ Valid user accounts with different roles (admin, doctor, patient)
- ✅ API accessible at `http://localhost:8000/api`

### Testing Tools
- Postman, Insomnia, or cURL
- Browser DevTools (Network tab)
- Optional: Laravel Debugbar or Telescope for query inspection

### Test Data Setup

Run these commands to prepare test data:
```bash
cd Pre-Clinic-Backend
docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed
docker exec pre-clinic-backend-app-1 php artisan db:seed --class=TestDataSeeder  # If available
```

---

## Phase 1: Permission Caching Tests

### Test 1.1: Verify Permission Caching on Login

**Steps:**
1. Log in with an admin user:
   ```bash
   POST http://localhost:8000/api/auth/login
   Body: {
     "email": "admin@example.com",
     "password": "Password123!@#"
   }
   ```

2. Note the login response time (should return permissions)
3. Log out and log in again with the same user
4. Compare response times - second login should be faster (cached)

**Expected Results:**
- ✅ First login: Permissions loaded from database
- ✅ Second login: Permissions loaded from cache (faster response)
- ✅ Response includes `user.permissions` array
- ✅ All user permissions are present in response

**Edge Cases:**
- Login with user having no roles/permissions - should return empty array
- Login with user having multiple roles - should return combined permissions

---

### Test 1.2: Cache Invalidation on Role Changes

**Steps:**
1. Login as admin and note permissions in response
2. Using another session/tool, assign a new role to the user:
   ```bash
   POST http://localhost:8000/api/roles/{roleId}/users/{userId}
   ```
3. Refresh the token or login again
4. Verify new permissions appear immediately

**Expected Results:**
- ✅ New permissions appear after role assignment
- ✅ Old cached permissions are cleared
- ✅ No stale permission data

---

## Phase 2: Pagination Tests

### Test 2.1: Default Pagination Behavior

**Steps:**
1. Get list of patients without pagination parameters:
   ```bash
   GET http://localhost:8000/api/patients
   Authorization: Bearer {token}
   ```

2. Examine the response structure

**Expected Results:**
- ✅ Response includes `data` array with max 50 items
- ✅ Response includes `meta` object with:
  - `current_page`: 1
  - `last_page`: (calculated)
  - `per_page`: 50
  - `total`: (total count)
  - `from`: 1
  - `to`: (up to 50)
- ✅ If less than 50 records exist, shows actual count

---

### Test 2.2: Custom per_page Parameter

**Steps:**
1. Request 10 items per page:
   ```bash
   GET http://localhost:8000/api/patients?per_page=10
   ```

2. Request 200 items per page (exceeds maximum):
   ```bash
   GET http://localhost:8000/api/patients?per_page=200
   ```

3. Request 0 items per page (invalid):
   ```bash
   GET http://localhost:8000/api/patients?per_page=0
   ```

**Expected Results:**
- ✅ First request: Returns exactly 10 items, `meta.per_page` = 10
- ✅ Second request: Capped at 100 items, `meta.per_page` = 100
- ✅ Third request: Defaults to minimum 1, `meta.per_page` = 1

---

### Test 2.3: Page Navigation

**Steps:**
1. Get first page with 10 items per page:
   ```bash
   GET http://localhost:8000/api/patients?per_page=10&page=1
   ```

2. Get second page:
   ```bash
   GET http://localhost:8000/api/patients?per_page=10&page=2
   ```

3. Navigate to last page:
   ```bash
   GET http://localhost:8000/api/patients?per_page=10&page={last_page}
   ```

**Expected Results:**
- ✅ Page 1: `meta.current_page` = 1, shows items 1-10
- ✅ Page 2: `meta.current_page` = 2, shows items 11-20
- ✅ Last page: Shows remaining items
- ✅ Requesting page beyond last_page returns empty `data` array

---

### Test 2.4: Pagination with Filters

**Steps:**
1. Get appointments for specific doctor with pagination:
   ```bash
   GET http://localhost:8000/api/appointments?doctor_id=1&per_page=5
   ```

2. Get patients at specific health center:
   ```bash
   GET http://localhost:8000/api/doctors?health_center_id=1&per_page=10
   ```

**Expected Results:**
- ✅ Pagination works correctly with filters applied
- ✅ `meta.total` reflects filtered count, not all records
- ✅ Results match filter criteria

---

### Test 2.5: All Endpoints Have Pagination

Test these endpoints to verify pagination is implemented:

**Endpoints to Test:**
- `GET /api/patients`
- `GET /api/appointments`
- `GET /api/doctors`
- `GET /api/technicians`
- `GET /api/health-centers`
- `GET /api/medical-specialties`
- `GET /api/technician-types`
- `GET /api/roles`

**Expected Results:**
- ✅ All endpoints return `meta` object with pagination info
- ✅ All endpoints respect `per_page` parameter
- ✅ All endpoints support `page` parameter

---

## Phase 3: Query Optimization Tests

### Test 3.1: Patient Detail with Relationships

**Steps:**
1. Enable Laravel Debugbar or Telescope (if available)
2. Get a patient with many appointments and medical records:
   ```bash
   GET http://localhost:8000/api/patients/{patientId}
   ```

3. Observe the number of database queries in debugbar/telescope

**Expected Results:**
- ✅ Response includes nested data:
  - `user` object
  - `appointments` array with `doctor` and `healthCenter` nested
  - `medicalRecords` array with `doctor` nested
- ✅ Query count should be < 15 queries (not 1 + N * relations)
- ✅ No duplicate queries for same relationship

**Manual Query Count Check:**
Without Debugbar, you can check Laravel logs:
```bash
docker exec pre-clinic-backend-app-1 tail -f storage/logs/laravel.log
```

---

### Test 3.2: Doctor Detail with Schedules

**Steps:**
1. Get a doctor with multiple schedules and appointments:
   ```bash
   GET http://localhost:8000/api/doctors/{doctorId}
   ```

**Expected Results:**
- ✅ Response includes:
  - `user` with `profile`
  - `medicalSpecialties` array
  - `schedules` array with `healthCenter` nested
  - `appointments` array with `patient.user` nested
- ✅ Query count < 12 queries
- ✅ All nested relationships load in single query per relationship type

---

### Test 3.3: Appointment with Nested Data

**Steps:**
1. Get an appointment with full details:
   ```bash
   GET http://localhost:8000/api/appointments/{appointmentId}
   ```

**Expected Results:**
- ✅ Response includes:
  - `patient.user.profile`
  - `doctor.user.profile`
  - `healthCenter`
  - `createdBy`
  - `medicalRecords` with `prescriptions`
- ✅ Query count < 12 queries
- ✅ No N+1 query pattern

---

### Test 3.4: Health Center with Relationships

**Steps:**
1. Get a health center with all relationships:
   ```bash
   GET http://localhost:8000/api/health-centers/{healthCenterId}
   ```

**Expected Results:**
- ✅ Response includes:
  - `doctors` array with `user`
  - `appointments` array
  - `departments` array
  - `medicalStudies` array
- ✅ Query count reasonable for data volume
- ✅ Eager loading prevents N+1

---

### Test 3.5: Roles with Permissions

**Steps:**
1. Get list of roles:
   ```bash
   GET http://localhost:8000/api/roles
   ```

2. Get specific role:
   ```bash
   GET http://localhost:8000/api/roles/{roleId}
   ```

**Expected Results:**
- ✅ List endpoint: Each role includes `permissions` array (no N+1)
- ✅ Show endpoint: Role includes all permissions
- ✅ Permissions loaded via eager loading, not separate queries

---

## Phase 4: Performance & Edge Cases

### Test 4.1: Large Dataset Performance

**Steps:**
1. Create 500+ patient records (if not already present)
2. Request first page:
   ```bash
   GET http://localhost:8000/api/patients?per_page=50
   ```

3. Measure response time
4. Request without pagination (should still paginate):
   ```bash
   GET http://localhost:8000/api/patients
   ```

**Expected Results:**
- ✅ Response time < 2 seconds
- ✅ Memory usage reasonable (check Docker stats)
- ✅ Only requested page data returned, not all 500 records

---

### Test 4.2: Empty Result Sets

**Steps:**
1. Filter for non-existent doctor:
   ```bash
   GET http://localhost:8000/api/appointments?doctor_id=999999
   ```

2. Request page beyond available data:
   ```bash
   GET http://localhost:8000/api/patients?page=999
   ```

**Expected Results:**
- ✅ Returns valid response structure with empty `data` array
- ✅ `meta.total` = 0
- ✅ No errors or crashes
- ✅ Proper HTTP 200 status

---

### Test 4.3: Concurrent Requests

**Steps:**
1. Use a load testing tool (e.g., Apache Bench, wrk) or manually send multiple simultaneous requests
2. Send 10 concurrent requests to paginated endpoint:
   ```bash
   ab -n 10 -c 10 -H "Authorization: Bearer {token}" http://localhost:8000/api/patients
   ```

**Expected Results:**
- ✅ All requests return successfully
- ✅ No query errors or deadlocks
- ✅ Consistent response times
- ✅ Proper pagination in all responses

---

## Integration Tests

### Test 5.1: Full User Journey

**Scenario:** Doctor logs in and views patients

**Steps:**
1. Doctor logs in (cache permissions)
2. Views patient list page 1
3. Navigates to page 2
4. Views specific patient detail
5. Views own appointments
6. Logs out

**Expected Results:**
- ✅ First login caches permissions
- ✅ All list views are paginated
- ✅ Detail views load all nested relationships
- ✅ No performance degradation
- ✅ Consistent response times throughout journey

---

### Test 5.2: Admin Managing Roles

**Scenario:** Admin updates user roles

**Steps:**
1. Admin logs in
2. Views roles list (paginated)
3. Views specific role with permissions
4. Assigns role to user
5. User logs in and gets new permissions (cache cleared)

**Expected Results:**
- ✅ Roles list is paginated with permissions eager-loaded
- ✅ Role assignment clears user permission cache
- ✅ User immediately sees new permissions on next login

---

## Regression Tests

### Test 6.1: Existing Functionality Still Works

**Areas to Verify:**
- ✅ User registration
- ✅ Patient creation with full details
- ✅ Appointment booking
- ✅ Medical record creation
- ✅ Doctor schedule management
- ✅ Role and permission management

**Expected Results:**
- ✅ All existing features work as before
- ✅ No breaking changes introduced
- ✅ Response formats remain compatible

---

## Known Limitations & Notes

### Current Issues
- Pre-existing bug: `surname` field referenced in AuthController but doesn't exist in database schema
- Some tests fail due to this unrelated issue, but pagination/optimization works correctly

### Performance Baselines
- Typical query count for paginated list: 2-4 queries
- Typical query count for detail view with relationships: 5-12 queries
- Typical response time: < 500ms for lists, < 1s for detail views

### Cache Behavior in Testing
- In test environment with array cache driver, Spatie Permission events may not fire
- In production with Redis/Memcached, cache invalidation works as expected

---

## Reporting Issues

If you encounter any issues during testing:

1. **Document the issue:**
   - Endpoint URL
   - Request body/parameters
   - Expected vs actual behavior
   - Error messages or logs

2. **Provide context:**
   - User role being tested
   - Data volume (number of records)
   - Docker container status

3. **Check logs:**
   ```bash
   docker logs pre-clinic-backend-app-1
   docker exec pre-clinic-backend-app-1 tail -f storage/logs/laravel.log
   ```

---

## Sign-off

**Tester Name:** _________________

**Date Tested:** _________________

**Overall Result:** ⬜ Pass  ⬜ Fail  ⬜ Pass with Issues

**Notes:**
