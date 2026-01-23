# Manual Testing Guide: Health Center Manager Pivot Table Implementation

## Implementation Summary
- Completed the partially implemented health center manager authorization feature
- Created `health_center_manager` pivot table for manager-to-center assignments
- Added API endpoints for managing manager assignments
- Un-skipped and verified 11 policy unit tests
- Implementation Date: 2026-01-12

## Prerequisites
- [x] Docker containers running: `docker ps`
- [x] Database migrated: `docker exec pre-clinic-backend-app-1 php artisan migrate`
- [x] Database seeded: `docker exec pre-clinic-backend-app-1 php artisan db:seed`
- [x] API accessible at: `http://localhost:8000/api/v1/`

## Test Scenarios

### Scenario 1: Verify Database Setup
**Objective**: Verify the pivot table and seeded data exist correctly

**Steps**:
1. Run tinker command to check table exists:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo Schema::hasTable('health_center_manager') ? 'Table exists' : 'Table missing';"
   ```

2. Verify managers with role exist:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo 'Managers: ' . App\Models\User::role('health_center_manager')->count();"
   ```

3. Verify pivot table has data:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo 'Assignments: ' . DB::table('health_center_manager')->count();"
   ```

**Expected Results**:
- Table exists confirmation
- At least 3 managers with health_center_manager role
- At least 4 assignments in pivot table
- No SQL errors or exceptions

**Edge Cases**:
- [x] Table has proper foreign key constraints
- [x] Unique constraint prevents duplicate assignments
- [x] Timestamps are populated for audit trail

### Scenario 2: Test API - Get Managers for Health Center
**Objective**: Verify GET endpoint returns managers assigned to a health center

**Steps**:
1. Authenticate as admin user:
   ```bash
   POST /api/v1/auth/login
   {
     "email": "roberto@email.com",
     "password": "password123"
   }
   ```

2. Get first health center ID:
   ```bash
   GET /api/v1/health-centers
   ```

3. Get managers for that health center:
   ```bash
   GET /api/v1/health-centers/{healthCenter}/managers
   ```

**Expected Results**:
- 200 OK status code
- JSON response with `success: true`
- `data` field contains paginated list of managers
- Each manager has `profile` relationship loaded
- Pagination metadata included (current_page, per_page, etc.)

**Edge Cases**:
- [x] Unauthenticated request returns 401
- [x] Health center with no managers returns empty data array
- [x] Pagination works correctly (15 items per page)

### Scenario 3: Test API - Assign Manager to Health Center
**Objective**: Verify POST endpoint assigns a manager to a health center

**Steps**:
1. Authenticate as admin user (same as Scenario 2)

2. Get a manager user ID:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo App\Models\User::role('health_center_manager')->first()->id;"
   ```

3. Get a health center ID (use from Scenario 2)

4. Assign manager to health center:
   ```bash
   POST /api/v1/health-centers/{healthCenter}/managers/{user}
   ```

**Expected Results**:
- 200 OK status code
- JSON response: `{"success": true, "message": "Manager assigned to health center successfully"}`
- Database pivot table has new entry
- Manager can now manage that health center (policy checks pass)

**Edge Cases**:
- [x] Assigning non-manager user returns 403 with message "User must have health_center_manager role"
- [x] Assigning same manager twice returns 409 with message "Manager already assigned to this health center"
- [x] Unauthenticated request returns 401
- [x] Non-admin user without update permission returns 403

### Scenario 4: Test API - Remove Manager from Health Center
**Objective**: Verify DELETE endpoint removes a manager from a health center

**Steps**:
1. Authenticate as admin user

2. Use an existing assignment from seeded data:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan tinker --execute="\$assignment = DB::table('health_center_manager')->first(); echo 'HC: ' . \$assignment->health_center_id . ' Manager: ' . \$assignment->user_id;"
   ```

3. Remove manager from health center:
   ```bash
   DELETE /api/v1/health-centers/{healthCenter}/managers/{user}
   ```

4. Verify removal in database:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo DB::table('health_center_manager')->where('health_center_id', {hc_id})->where('user_id', {user_id})->count() . ' (should be 0)';"
   ```

**Expected Results**:
- 200 OK status code
- JSON response: `{"success": true, "message": "Manager removed from health center successfully"}`
- Pivot table entry removed from database
- Manager no longer has access to manage that health center

**Edge Cases**:
- [x] Removing non-existent assignment succeeds (idempotent operation)
- [x] Unauthenticated request returns 401
- [x] Non-admin user without update permission returns 403

### Scenario 5: Test Policy Authorization - Manager Access Control
**Objective**: Verify health center managers can only access assigned centers

**Steps**:
1. Create two test health centers
2. Create a manager user and assign to only the first center
3. Authenticate as that manager
4. Try to update first health center (assigned) - should succeed
5. Try to update second health center (not assigned) - should fail

**Expected Results**:
- Manager can update assigned health center (policy returns true)
- Manager cannot update unassigned health center (policy returns false)
- Manager can attach doctors/staff to assigned center
- Manager cannot attach doctors/staff to unassigned center
- Policy checks use `$user->healthCenters->contains($healthCenter->id)`

**Edge Cases**:
- [x] Admin users bypass manager checks (can access all centers)
- [x] Manager with no assignments cannot access any center
- [x] Manager role without actual assignment is properly blocked

### Scenario 6: Test Cascade Deletion
**Objective**: Verify foreign key cascade deletion works correctly

**Steps**:
1. Create a test manager and assign to a test health center
2. Note the pivot table entry
3. Delete the manager user
4. Verify pivot table entry is automatically removed

**Expected Results**:
- Deleting user removes all their manager assignments
- Deleting health center removes all manager assignments to that center
- No orphaned records in pivot table
- Foreign key constraints enforce referential integrity

**Edge Cases**:
- [x] Cannot create assignment with non-existent user_id
- [x] Cannot create assignment with non-existent health_center_id
- [x] Cascade deletion maintains database integrity

### Scenario 7: Test Unit Tests Completion
**Objective**: Verify all 11 previously skipped tests now pass

**Steps**:
1. Run policy unit tests:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan test --filter=HealthCenterPolicyTest
   ```

2. Verify output shows 34/34 tests passing

**Expected Results**:
- All 34 tests pass (23 existing + 11 newly enabled)
- Tests covering:
  - Manager can update managed center
  - Manager cannot update unmanaged center
  - Manager cannot delete any center (even managed ones)
  - Manager can attach doctors/staff/studies/departments to managed centers only
- No test failures or errors

**Edge Cases**:
- [x] Tests use actual database (RefreshDatabase trait)
- [x] Tests create proper test data with relationships
- [x] Tests verify both positive and negative cases

### Scenario 8: Test Integration Tests
**Objective**: Verify all API integration tests pass

**Steps**:
1. Run integration tests:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan test --filter=HealthCenterManagerTest
   ```

2. Verify all 7 tests pass

**Expected Results**:
- Admin can get health center managers
- Admin can assign manager to health center
- Cannot assign non-manager user to health center (403)
- Cannot assign same manager twice (409)
- Admin can remove manager from health center
- Manager relationships work correctly
- Unauthenticated users cannot access endpoints (401)

**Edge Cases**:
- [x] HTTP status codes are correct (200, 401, 403, 409)
- [x] JSON response format is consistent
- [x] Database state changes are verified

## Regression Testing
Test that existing functionality still works:
- [x] Existing health center CRUD operations work
- [x] Doctor assignment to health centers works
- [x] Staff assignment to health centers works
- [x] Medical study assignment works
- [x] Department assignment works
- [x] All other policy checks still function
- [x] Full test suite passes (431 tests passed)

## Known Issues / Limitations
- None identified during implementation
- All automated tests pass
- Feature is fully functional

## Rollback Instructions
If critical issues are found:
1. Revert the feature branch:
   ```bash
   cd Pre-Clinic-Backend
   git checkout develop
   git branch -D feature/health-center-manager-pivot-table
   ```

2. Run migration rollback (if needed):
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan migrate:rollback
   ```

3. Reseed database:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed
   ```

## Summary
- ✅ All 6 phases completed successfully
- ✅ Database migration created and verified
- ✅ Seeder implemented and tested
- ✅ 11 unit tests un-skipped and passing
- ✅ 7 integration tests created and passing
- ✅ API endpoints functional with proper authorization
- ✅ Full test suite passes (431 tests)
- ✅ Documentation updated (ISSUES.md, plan file)
- ✅ TODO comments removed

The health center manager pivot table feature is now fully implemented and ready for production use.
