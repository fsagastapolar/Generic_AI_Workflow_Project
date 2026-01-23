# Manual Testing Guide: Medical History System Phase 1

## Implementation Summary
- **Feature**: Core Medical History Foundation
- **Plan**: `thoughts/shared/plans/2026-01-18-medical-history-system.md` - Phase 1
- **Implementation Date**: 2026-01-18
- **Components**: Medical history entries, categories, author tracking, soft deletes, basic CRUD operations

## Prerequisites
- [x] Docker containers running: `docker ps`
- [x] Database migrated: `docker exec pre-clinic-backend-app-1 php artisan migrate`
- [x] Database seeded: `docker exec pre-clinic-backend-app-1 php artisan db:seed`
- [x] Backend running on port 8000
- [ ] API client (Postman, curl, or similar) configured
- [ ] Authentication token obtained for testing users

## Test User Credentials
All seeded users have password: `password123`

- **Admin**: `admin@preclinic.com` (Super-Admin role)
- **Doctor**: Look for users with doctor role in seeded data
- **Health Center Manager**: Look for users with health_center_manager role
- **Patient**: Look for users with patient role

## Test Scenarios

### Scenario 1: List Medical History Categories
**Objective**: Verify that medical history categories are properly seeded and retrievable

**Steps**:
1. Obtain authentication token for any medical professional (doctor/staff/medical_director)
2. Send GET request to `/api/v1/medical-history/categories`
3. Verify response contains 7 categories

**Expected Results**:
- HTTP Status: 200
- Response contains:
  - Clinical / General
  - Surgical & Trauma
  - Allergies (critical enabled)
  - Mental Health & Psychosocial
  - Physical & Functional
  - Habits & Lifestyle
  - Family History
- Categories ordered by `sort_order`
- Only active categories returned

**Edge Cases**:
- [ ] Unauthenticated request returns 401
- [ ] Patient role can access categories (no restrictions on reading categories)

---

### Scenario 2: Create Medical History Entry
**Objective**: Verify medical professionals can create medical history entries with proper author tracking

**Steps**:
1. Authenticate as doctor
2. Get a patient ID from database: `docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo App\Models\Patient::first()->id;"`
3. Get clinical category ID: Should be ID 1 (clinical-general)
4. Send POST request to `/api/v1/medical-history/entries`:
```json
{
  "patient_id": 1,
  "category_id": 1,
  "content": "Patient diagnosed with hypertension on 2026-01-18. Started on Lisinopril 10mg daily. Blood pressure at visit: 145/95. Patient counseled on lifestyle modifications including reduced sodium intake and regular exercise."
}
```

**Expected Results**:
- HTTP Status: 200 (note: not 201 due to BaseController implementation)
- Response includes:
  - `created_by` set to authenticated doctor's user ID
  - `is_edited` is `false`
  - `created_at` timestamp
  - `updated_by` is `null`
  - `deleted_at` is `null`

**Edge Cases**:
- [ ] Content less than 10 characters returns 422 validation error
- [ ] Content more than 10,000 characters returns 422 validation error
- [ ] Invalid patient_id returns 422 validation error
- [ ] Invalid category_id returns 422 validation error
- [ ] Patient role cannot create entries (returns 403)
- [ ] Unauthenticated request returns 401

---

### Scenario 3: List Medical History Entries for a Patient
**Objective**: Verify entries can be listed with proper eager loading

**Steps**:
1. Authenticate as doctor
2. Send GET request to `/api/v1/medical-history/entries?patient_id=1`

**Expected Results**:
- HTTP Status: 200
- Paginated response with metadata
- Each entry includes:
  - Entry details (id, patient_id, category_id, content, etc.)
  - Loaded relationships: patient, category, author
- Entries ordered by `created_at` DESC (newest first)
- Soft-deleted entries excluded by default

**Edge Cases**:
- [ ] Filter by category: `/api/v1/medical-history/entries?patient_id=1&category_id=3`
- [ ] Pagination works: `/api/v1/medical-history/entries?patient_id=1&per_page=10`
- [ ] Patient role cannot list entries (returns 403)
- [ ] Manager can list entries (returns 200)

---

### Scenario 4: Update Medical History Entry (Author Only)
**Objective**: Verify only the original author can update their entries

**Steps**:
1. Authenticate as the doctor who created an entry
2. Get an entry ID they created
3. Send PUT request to `/api/v1/medical-history/entries/{id}`:
```json
{
  "content": "Updated: Patient diagnosed with hypertension on 2026-01-18. Started on Lisinopril 10mg daily. Follow-up on 2026-01-25 showed improved BP: 130/85. Continue current medication."
}
```

**Expected Results**:
- HTTP Status: 200
- Entry updated successfully
- `is_edited` flag set to `true`
- `updated_by` set to authenticated user ID
- `updated_at` timestamp updated

**Edge Cases**:
- [ ] Different doctor cannot update entry (returns 403)
- [ ] Manager cannot update entry (returns 403)
- [ ] Can change category_id during update
- [ ] Content validation still applies (min 10, max 10000)

---

### Scenario 5: Soft Delete Entry
**Objective**: Verify author and managers can soft delete entries

**Steps**:
1. Authenticate as the doctor who created an entry
2. Send DELETE request to `/api/v1/medical-history/entries/{id}`
3. Verify entry is soft deleted

**Expected Results**:
- HTTP Status: 200
- Entry soft deleted (not physically removed)
- `deleted_at` timestamp set
- `deleted_by` set to authenticated user ID
- Entry no longer appears in default listings

**Verification**:
```bash
docker exec pre-clinic-backend-app-1 php artisan tinker --execute="echo App\Models\MedicalHistoryEntry::withTrashed()->find({id})->deleted_at;"
```

**Edge Cases**:
- [ ] Author can delete their own entry
- [ ] Health center manager can delete any entry
- [ ] Different doctor cannot delete entry (returns 403)
- [ ] Entry excluded from listings after deletion

---

### Scenario 6: Restore Soft-Deleted Entry
**Objective**: Verify managers can restore soft-deleted entries

**Steps**:
1. Soft delete an entry (Scenario 5)
2. Authenticate as health_center_manager
3. Send POST request to `/api/v1/medical-history/entries/{id}/restore`

**Expected Results**:
- HTTP Status: 200
- Entry restored successfully
- `deleted_at` set to `null`
- Entry appears in listings again

**Edge Cases**:
- [ ] Author can restore their own deleted entry
- [ ] Manager can restore any deleted entry
- [ ] Different doctor cannot restore (returns 403)

---

### Scenario 7: View Soft-Deleted Entries (Manager Only)
**Objective**: Verify managers can view soft-deleted entries with include_deleted parameter

**Steps**:
1. Create and soft delete 2 entries for a patient
2. Create 1 active entry for the same patient
3. Authenticate as health_center_manager
4. Send GET request to `/api/v1/medical-history/entries?patient_id=1&include_deleted=1`

**Expected Results**:
- HTTP Status: 200
- Response includes all 3 entries (2 deleted, 1 active)
- Deleted entries have `deleted_at` timestamp
- Active entry has `deleted_at` as `null`

**Edge Cases**:
- [ ] Doctor cannot use include_deleted (only sees active entries)
- [ ] Without include_deleted=1, only active entry returned
- [ ] Manager can see deleted_by information

---

## Regression Testing
Test that existing functionality still works:
- [ ] Patient CRUD operations still work
- [ ] Appointment system not affected
- [ ] User authentication still works
- [ ] Role-based permissions for other entities unchanged

## Database Integrity Checks

Run these queries to verify data integrity:

```bash
# Check categories exist
docker exec preclinic-mysql mysql -u root -prootpass2024 preclinic -e "SELECT COUNT(*) FROM medical_history_categories;"
# Expected: 7

# Check entries exist
docker exec preclinic-mysql mysql -u root -prootpass2024 preclinic -e "SELECT COUNT(*) FROM medical_history_entries WHERE deleted_at IS NULL;"
# Expected: > 0

# Check author tracking
docker exec preclinic-mysql mysql -u root -prootpass2024 preclinic -e "SELECT COUNT(*) FROM medical_history_entries WHERE created_by IS NULL;"
# Expected: 0 (all entries must have created_by)

# Check soft deletes work
docker exec preclinic-mysql mysql -u root -prootpass2024 preclinic -e "SELECT COUNT(*) FROM medical_history_entries WHERE deleted_at IS NOT NULL;"
# Expected: Shows soft-deleted entries if any exist
```

## Known Issues / Limitations
- BaseController returns 200 for create operations instead of 201 (consistent with existing codebase)
- Project-wide soft deletes not implemented (only medical history system)
- No frontend UI implementation in Phase 1 (backend API only)

## Rollback Instructions
If critical issues are found:

1. **Rollback migrations**:
```bash
docker exec pre-clinic-backend-app-1 php artisan migrate:rollback --step=2
```

2. **Restore old model** (if PatientMedicalHistory backup exists):
- Restore `app/Models/PatientMedicalHistory.php`
- Restore old migration `2025_08_12_201747_create_patient_medical_histories_table.php`

3. **Re-migrate**:
```bash
docker exec pre-clinic-backend-app-1 php artisan migrate
docker exec pre-clinic-backend-app-1 php artisan db:seed
```

## Next Steps
After successful manual testing of Phase 1:
- Proceed to Phase 2: Annotations & Basic Audit Tracking
- Update plan file with Phase 1 completion checkmarks
- Document any issues or improvements for future phases
