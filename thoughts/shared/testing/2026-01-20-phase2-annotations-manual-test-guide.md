# Manual Testing Guide: Phase 2 - Annotations & Basic Audit Tracking

## Implementation Summary
- Added medical history annotations system for collaborative comments
- Medical professionals can annotate entries without modifying original content
- Implemented soft delete tracking (created_by, updated_by, deleted_by)
- Added visual indicators for edited and deleted annotations
- Managers can view soft-deleted annotations and restore them
- Implementation Date: 2026-01-20

## Prerequisites
- [ ] Docker containers running: `docker ps`
- [ ] Database migrated: `docker exec pre-clinic-backend-app-1 php artisan migrate`
- [ ] Database seeded (if needed): `docker exec pre-clinic-backend-app-1 php artisan db:seed`
- [ ] Backend API running on http://localhost:8000
- [ ] API authentication token available for testing
- [ ] Test users with different roles (doctor, staff, health_center_manager)

## Test Scenarios

### Scenario 1: Create Annotation as Medical Professional
**Objective**: Verify medical professionals can create annotations on medical history entries

**Steps**:
1. Authenticate as a user with `doctor`, `staff`, or `medical_director` role
2. Get an existing medical history entry ID
3. Send POST request to `/api/v1/medical-history/entries/{entryId}/annotations`
   ```json
   {
     "content": "Patient showed significant improvement after treatment. Follow-up scheduled."
   }
   ```
4. Verify response status is 200
5. Verify response includes annotation data with:
   - `id`
   - `medical_history_entry_id` matching the entry
   - `content` matching the submitted text
   - `created_by` set to authenticated user ID
   - `is_edited` is false
   - `created_at` timestamp

**Expected Results**:
- Annotation is created successfully
- `created_by` is automatically set to the authenticated user
- Annotation appears in the database
- Author information is included in response

**Edge Cases**:
- [ ] Test with content less than 5 characters (should fail with validation error)
- [ ] Test with content over 5000 characters (should fail with validation error)
- [ ] Test as patient role (should fail with 403 Forbidden)
- [ ] Test without authentication (should fail with 401 Unauthorized)

### Scenario 2: List Annotations for an Entry
**Objective**: Verify medical professionals can view all annotations for a medical history entry

**Steps**:
1. Authenticate as a medical professional
2. Create 2-3 annotations on a medical history entry
3. Send GET request to `/api/v1/medical-history/entries/{entryId}/annotations`
4. Verify response contains all non-deleted annotations
5. Verify annotations are ordered by `created_at` ascending

**Expected Results**:
- All active annotations are returned
- Each annotation includes author profile information
- Annotations are properly ordered chronologically
- Soft-deleted annotations are excluded by default

**Edge Cases**:
- [ ] Test with invalid entry ID (should return 404)
- [ ] Test as patient role (should return 403)
- [ ] Test entry with no annotations (should return empty array)

### Scenario 3: Update Own Annotation
**Objective**: Verify authors can edit their own annotations

**Steps**:
1. Authenticate as a doctor
2. Create an annotation
3. Send PUT request to `/api/v1/medical-history/annotations/{annotationId}`
   ```json
   {
     "content": "Updated annotation: Patient responded well to adjusted dosage."
   }
   ```
4. Verify response status is 200
5. Verify `is_edited` flag is true
6. Verify `updated_by` is set to authenticated user ID
7. Verify `updated_at` timestamp is updated

**Expected Results**:
- Annotation content is updated
- `is_edited` flag is automatically set to true
- `updated_by` tracks who made the edit
- Frontend can display "Edited" indicator

**Edge Cases**:
- [ ] Attempt to edit another user's annotation (should return 403)
- [ ] Test with invalid content (too short/long)
- [ ] Verify author profile is included in response

### Scenario 4: Delete Annotation (Soft Delete)
**Objective**: Verify authors and managers can soft-delete annotations

**Steps**:
1. Authenticate as the annotation author
2. Send DELETE request to `/api/v1/medical-history/annotations/{annotationId}`
3. Verify response status is 200
4. Verify annotation is soft-deleted (has `deleted_at` timestamp)
5. Verify `deleted_by` is set to authenticated user ID
6. Verify annotation no longer appears in regular listing
7. As manager, retrieve with `include_deleted=1` parameter
8. Verify soft-deleted annotation appears with deletion metadata

**Expected Results**:
- Annotation is soft-deleted, not permanently removed
- `deleted_by` tracks who deleted it
- Deleted annotation excluded from normal queries
- Managers can view deleted annotations with special parameter

**Edge Cases**:
- [ ] Test deletion by different user (should fail for non-managers)
- [ ] Test deletion by health_center_manager (should succeed)
- [ ] Verify deleted annotation has `deleted_at` and `deleted_by` fields

### Scenario 5: Restore Soft-Deleted Annotation
**Objective**: Verify managers can restore deleted annotations

**Steps**:
1. Create and delete an annotation
2. Authenticate as health_center_manager
3. Send POST request to `/api/v1/medical-history/annotations/{annotationId}/restore`
4. Verify response status is 200
5. Verify `deleted_at` is null
6. Verify annotation appears in regular listing again

**Expected Results**:
- Annotation is restored successfully
- `deleted_at` is cleared
- Annotation visible in normal queries
- Original author and content remain unchanged

**Edge Cases**:
- [ ] Test restore by non-manager (should fail with 403)
- [ ] Test restore of non-deleted annotation (should handle gracefully)

### Scenario 6: Annotations in Medical History Entry Index
**Objective**: Verify medical history entries include annotation count/preview

**Steps**:
1. Authenticate as a medical professional
2. Create a medical history entry
3. Add 2-3 annotations to the entry
4. Send GET request to `/api/v1/medical-history/entries?patient_id={patientId}`
5. Verify each entry includes `annotations` array
6. Verify annotations include author profile information
7. Verify only non-deleted annotations are included

**Expected Results**:
- Entries include embedded annotations
- Annotations are ordered by creation time
- Soft-deleted annotations are excluded
- Frontend can display annotation count without separate API call

**Edge Cases**:
- [ ] Entry with no annotations (should have empty array)
- [ ] Entry with soft-deleted annotations only (should have empty array)
- [ ] Verify annotations include `author.profile` data

### Scenario 7: Manager Viewing Deleted Annotations
**Objective**: Verify managers have special privileges to view deletion history

**Steps**:
1. Create several annotations, delete some
2. Authenticate as health_center_manager
3. Send GET request with `include_deleted=1` parameter
4. Verify both active and deleted annotations are returned
5. Verify deleted annotations have `deleted_at`, `deleted_by`, and `deleter.profile` data

**Expected Results**:
- Manager can see complete audit trail
- Deleted annotations clearly marked
- Deleter information available for accountability
- UI can show "Deleted by {name} on {date}"

**Edge Cases**:
- [ ] Non-manager with `include_deleted=1` (should only see active annotations)
- [ ] Verify deleter profile is loaded in response

## Regression Testing
Test that existing functionality still works:
- [ ] Medical history entry creation still works
- [ ] Medical history entry listing includes annotations
- [ ] Soft delete on entries still functions properly
- [ ] Entry policies remain enforced
- [ ] Entry update/delete permissions unchanged

## Known Issues / Limitations
- None at this time

## Rollback Instructions
If critical issues are found:
1. Rollback migration: `docker exec pre-clinic-backend-app-1 php artisan migrate:rollback`
2. Remove annotation routes from `routes/api.php`
3. Remove annotation policy from `AuthServiceProvider.php`
4. Delete annotation-related files:
   - `app/Models/MedicalHistoryAnnotation.php`
   - `app/Policies/MedicalHistoryAnnotationPolicy.php`
   - `app/Http/Controllers/API/V1/MedicalHistoryAnnotationController.php`
   - `database/migrations/2026_01_18_200001_create_medical_history_annotations_table.php`
5. Restore previous version of `MedicalHistoryEntry.php` model
6. Restore previous version of `MedicalHistoryEntryController.php`
