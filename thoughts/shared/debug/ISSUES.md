# Known Issues - Pre-Clinic Backend

## Issue #1: Missing `health_center_manager` Pivot Table

**Status:** RESOLVED
**Priority:** Medium
**Discovered:** 2026-01-12 (During Phase 1 test coverage implementation)
**Resolved:** 2026-01-12
**Affects:** HealthCenterPolicy authorization for health center managers

---

### Resolution

**Resolution Date:** 2026-01-12
**Resolved By:** Implementation plan completed

**Changes Made:**
1. Created `health_center_manager` pivot table in existing pivot tables migration
2. Added `HealthCenterManagerSeeder` for test data with 3 manager users
3. Un-skipped all 11 unit tests in `HealthCenterPolicyTest` - all passing
4. Added API endpoints (GET/POST/DELETE) to `HealthCenterController`:
   - `GET /api/v1/health-centers/{healthCenter}/managers`
   - `POST /api/v1/health-centers/{healthCenter}/managers/{user}`
   - `DELETE /api/v1/health-centers/{healthCenter}/managers/{user}`
5. Created 7 integration tests in `HealthCenterManagerTest` - all passing
6. Added inverse relationship `managers()` to `HealthCenter` model
7. Fixed bug in `attachDepartment` policy method
8. Added missing roles to `PermissionsDemoSeeder` (admin, health_center_manager, medical_director, hr_manager, technical_supervisor)

**Verification:**
- All 11 previously skipped policy tests now pass (34/34 total in HealthCenterPolicyTest)
- All 7 integration tests pass in HealthCenterManagerTest
- Full database seeding works with manager assignments
- API endpoints respond correctly with proper authorization

**Files Modified:**
- `database/migrations/2025_08_12_999999_create_pivot_tables.php`
- `database/seeders/HealthCenterManagerSeeder.php` (new)
- `database/seeders/DatabaseSeeder.php`
- `database/seeders/PermissionsDemoSeeder.php`
- `database/seeders/ComprehensiveDummySeeder.php`
- `app/Models/HealthCenter.php`
- `app/Policies/HealthCenterPolicy.php`
- `app/Http/Controllers/API/V1/HealthCenterController.php`
- `routes/api.php`
- `tests/Unit/Policies/HealthCenterPolicyTest.php`
- `tests/Feature/API/V1/HealthCenterManagerTest.php` (new)

---

### Description

The `HealthCenterPolicy` contains authorization logic that checks whether a user with the `health_center_manager` role is assigned to manage a specific health center. However, the required database pivot table (`health_center_manager`) does not exist, causing this feature to be incomplete.

### Technical Details

**Location:** `app/Policies/HealthCenterPolicy.php`

**Affected Methods:**
- `update()` - Line 44
- `attachDoctor()` - Line 62
- `attachStaff()` - Line 72
- `attachMedicalStudy()` - Line 82
- `attachDepartment()` - Line 92

**Code Pattern:**
```php
$user->hasRole('health_center_manager') &&
$user->healthCenters->contains($healthCenter->id)
```

**Expected Behavior:**
- A `health_center_manager` should only be able to modify health centers they manage
- The system should track which managers are assigned to which centers via a pivot table

**Current Behavior:**
- Database table `health_center_manager` does not exist
- Attempting to check the relationship causes SQL error: `SQLSTATE[42S02]: Base table or view not found`
- Managers with the role can still perform actions based on role alone (first part of condition)

### Database Schema Required

**Missing Table:** `health_center_manager`

**Expected Structure:**
```sql
CREATE TABLE health_center_manager (
    id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    health_center_id BIGINT UNSIGNED NOT NULL,
    created_at TIMESTAMP NULL,
    updated_at TIMESTAMP NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (health_center_id) REFERENCES health_centers(id) ON DELETE CASCADE,
    UNIQUE KEY unique_manager_center (user_id, health_center_id)
);
```

### Impact Assessment

**Security Impact:** LOW
- Current behavior: Managers with `health_center_manager` role are evaluated only on role, not on specific center assignment
- The role check still prevents unauthorized access
- No security vulnerability, just less granular permission control

**Functionality Impact:** MEDIUM
- Feature is partially implemented but not fully functional
- Health center managers cannot be properly scoped to specific centers
- All managers have access to all centers (via role check alone)

**Test Coverage:**
- 11 unit tests skipped in `tests/Unit/Policies/HealthCenterPolicyTest.php`
- Tests marked with: `markTestSkipped('Requires health_center_manager pivot table which does not exist yet')`
- 23 other policy tests pass (admin, medical_director, hr_manager scenarios)

### Affected Test Cases

The following test methods are currently skipped:

1. `test_health_center_manager_can_update_managed_center()`
2. `test_health_center_manager_cannot_update_unmanaged_center()`
3. `test_health_center_manager_cannot_delete_health_center()`
4. `test_health_center_manager_can_attach_doctor_to_managed_center()`
5. `test_health_center_manager_cannot_attach_doctor_to_unmanaged_center()`
6. `test_health_center_manager_can_attach_staff_to_managed_center()`
7. `test_health_center_manager_cannot_attach_staff_to_unmanaged_center()`
8. `test_health_center_manager_can_attach_medical_study_to_managed_center()`
9. `test_health_center_manager_cannot_attach_medical_study_to_unmanaged_center()`
10. `test_health_center_manager_can_attach_department_to_managed_center()`
11. `test_health_center_manager_cannot_attach_department_to_unmanaged_center()`

### Workarounds Applied

**Model Relationship Added:**
- Added `healthCenters()` relationship to `app/Models/User.php` (line 111-115)
- Prevents runtime errors when the relationship is accessed
- Returns empty collection when table doesn't exist

**Tests Documented:**
- All affected tests marked as skipped with clear reason
- Tests remain in codebase for when issue is resolved

### Recommended Solution

**Option 1: Complete the Feature (RECOMMENDED)**

1. Create migration for `health_center_manager` pivot table
2. Add seeder data to assign existing managers to centers
3. Create API endpoints for managing assignments:
   - `POST /api/v1/users/{user}/health-centers/{healthCenter}` - Assign manager
   - `DELETE /api/v1/users/{user}/health-centers/{healthCenter}` - Unassign manager
   - `GET /api/v1/users/{user}/health-centers` - List managed centers
4. Un-skip the 11 tests and verify they pass
5. Add integration tests for the new API endpoints

**Migration Example:**
```php
// database/migrations/YYYY_MM_DD_create_health_center_manager_table.php
public function up()
{
    Schema::create('health_center_manager', function (Blueprint $table) {
        $table->id();
        $table->foreignId('user_id')->constrained()->onDelete('cascade');
        $table->foreignId('health_center_id')->constrained()->onDelete('cascade');
        $table->timestamps();

        $table->unique(['user_id', 'health_center_id']);
        $table->index('user_id');
        $table->index('health_center_id');
    });
}
```

**Option 2: Remove Incomplete Feature**

If the feature is not needed:
1. Remove the `&& $user->healthCenters->contains(...)` checks from policy
2. Simplify to role-only checks
3. Remove the `healthCenters()` relationship from User model
4. Delete the 11 skipped tests

**Option 3: Defer Implementation**

Keep current state:
- Tests remain skipped and documented
- Feature can be completed in future sprint
- No immediate impact on functionality

### Steps to Resolve

1. **Create Migration:**
   ```bash
   php artisan make:migration create_health_center_manager_table
   ```

2. **Run Migration:**
   ```bash
   php artisan migrate
   ```

3. **Un-skip Tests:**
   - Edit `tests/Unit/Policies/HealthCenterPolicyTest.php`
   - Remove `markTestSkipped()` calls from the 11 methods
   - Restore original test implementation

4. **Verify Tests:**
   ```bash
   php artisan test --filter=HealthCenterPolicyTest
   ```

5. **Add API Management:**
   - Create `HealthCenterManagerController` for assignment management
   - Add routes in `routes/api.php`
   - Create integration tests

6. **Document Feature:**
   - Update API documentation
   - Add to user guide for assigning managers to centers

### Related Files

**Policy:**
- `app/Policies/HealthCenterPolicy.php` (lines 44, 62, 72, 82, 92)

**Model:**
- `app/Models/User.php` (lines 111-115) - Relationship added as workaround

**Tests:**
- `tests/Unit/Policies/HealthCenterPolicyTest.php` (11 skipped tests)

**Routes:**
- None yet (API endpoints need to be created)

**Migrations:**
- Missing migration file

### Notes

- This issue was discovered during comprehensive test coverage implementation (Phase 1)
- The policy code suggests this feature was planned but never completed
- No existing code actually uses the `healthCenters` relationship on User model
- Current role-based authorization is still secure, just less granular

---

## Reporting New Issues

When adding new issues to this file:

1. Use descriptive headings
2. Include discovery date and context
3. Provide technical details with file/line references
4. Assess impact (security, functionality, testing)
5. Suggest concrete solutions
6. Link to related code and tests
