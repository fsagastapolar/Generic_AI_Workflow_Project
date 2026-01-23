# Manual Testing Guide: Phase 4 - Category Management System

## Implementation Summary
- **Feature**: Dynamic category management with suggestion/approval workflow
- **Implementation Date**: 2026-01-22
- **Phase**: 4 of 4 (Medical History System)

### Changes Implemented
- Created `medical_history_category_suggestions` table for category suggestions
- Created `MedicalHistoryCategorySuggestion` model with relationships and scopes
- Created `MedicalHistoryCategoryPolicy` for category CRUD authorization
- Created `MedicalHistoryCategorySuggestionPolicy` for suggestion workflow authorization
- Updated `MedicalHistoryCategoryController` with full CRUD operations
- Created `MedicalHistoryCategorySuggestionController` with suggestion workflow (create, update, delete, approve, reject)
- Added API routes for category CRUD and suggestion workflow
- Registered policies in `AuthServiceProvider`

## Prerequisites
- [x] Docker containers running: `docker ps`
- [x] Database migrated: Phase 4 migration completed successfully
- [ ] Database seeded (if needed): `docker exec pre-clinic-backend-app-1 php artisan db:seed`
- [ ] API testing tool ready (Postman, Insomnia, or curl)
- [ ] Authentication tokens for different user roles (manager, doctor, staff)

## Test Scenarios

### Scenario 1: Category CRUD Operations (Manager Only)

**Objective**: Verify that managers can create, read, update, and delete categories

#### Test 1.1: Create New Category (Manager)
**Steps**:
1. Authenticate as a user with `health_center_manager` or `medical_director` role
2. Send POST request to `/api/v1/medical-history/categories`
   ```json
   {
     "name": "Nutrition & Dietetics",
     "description": "Nutritional assessments and dietary planning",
     "is_critical_enabled": false,
     "sort_order": 10
   }
   ```
3. Verify response status is 201 (Created)

**Expected Results**:
- Response includes created category with auto-generated `slug` ("nutrition-dietetics")
- Category `is_active` defaults to `true`
- Success message: "Category created successfully"

**Edge Cases**:
- [ ] Create category with duplicate name - expect validation error (422)
- [ ] Create category with name > 100 characters - expect validation error
- [ ] Create category without name field - expect validation error
- [ ] Attempt to create as non-manager (doctor/staff) - expect 403 Forbidden

#### Test 1.2: View All Active Categories (Public)
**Steps**:
1. Authenticate as any user (doctor, staff, manager, etc.)
2. Send GET request to `/api/v1/medical-history/categories`
3. Verify response status is 200

**Expected Results**:
- Returns only active categories (`is_active = true`)
- Categories sorted by `sort_order`
- Success message: "Categories retrieved successfully"

#### Test 1.3: View All Categories Including Inactive (Manager Only)
**Steps**:
1. Authenticate as manager or medical director
2. Send GET request to `/api/v1/medical-history/categories/all`
3. Verify response status is 200

**Expected Results**:
- Returns all categories (active and inactive)
- Categories sorted by `sort_order`
- Success message: "All categories retrieved successfully"

**Edge Cases**:
- [ ] Attempt to access as non-manager - expect 403 Forbidden

#### Test 1.4: Update Category (Manager Only)
**Steps**:
1. Authenticate as manager
2. Send PUT request to `/api/v1/medical-history/categories/{categoryId}`
   ```json
   {
     "name": "Nutrition & Diet Management",
     "description": "Updated description",
     "is_critical_enabled": true,
     "sort_order": 15
   }
   ```
3. Verify response status is 200

**Expected Results**:
- Category updated with new values
- Slug regenerated if name changed
- Success message: "Category updated successfully"

**Edge Cases**:
- [ ] Update with duplicate name (different category) - expect validation error
- [ ] Attempt to update as non-manager - expect 403 Forbidden
- [ ] Update non-existent category - expect 404 Not Found

#### Test 1.5: Deactivate Category (Manager Only)
**Steps**:
1. Authenticate as manager
2. Send DELETE request to `/api/v1/medical-history/categories/{categoryId}`
3. Verify response status is 200
4. Verify category is not actually deleted, just marked inactive

**Expected Results**:
- Category `is_active` set to `false`
- Category still exists in database
- Success message: "Category deactivated successfully"

**Edge Cases**:
- [ ] Attempt to delete as non-manager - expect 403 Forbidden
- [ ] Deactivate already inactive category - should succeed

---

### Scenario 2: Category Suggestion Workflow

**Objective**: Verify that medical professionals can suggest categories and managers can approve/reject them

#### Test 2.1: Create Category Suggestion (Medical Professionals)
**Steps**:
1. Authenticate as doctor, staff, technician, or medical director
2. Send POST request to `/api/v1/medical-history/category-suggestions`
   ```json
   {
     "name": "Sports Medicine",
     "description": "Athletic injuries and performance optimization",
     "is_critical_enabled": false,
     "sort_order": 20
   }
   ```
3. Verify response status is 201

**Expected Results**:
- Suggestion created with status `pending`
- `suggested_by` automatically set to authenticated user ID
- Slug auto-generated from name
- Response includes `suggestedByUser.profile` relationship
- Success message: "Suggestion submitted successfully"

**Edge Cases**:
- [ ] Create suggestion as patient - expect 403 Forbidden (patients not in policy)
- [ ] Create suggestion without name - expect validation error
- [ ] Name > 100 characters - expect validation error

#### Test 2.2: View Suggestions (Role-Based Access)
**Steps**:
1. Authenticate as doctor/staff and send GET to `/api/v1/medical-history/category-suggestions`
2. Verify only own suggestions returned
3. Authenticate as manager and send same GET request
4. Verify all suggestions returned (from all users)

**Expected Results**:
- Non-managers see only their own suggestions
- Managers see all suggestions
- Suggestions sorted by `created_at` descending (newest first)
- Response includes relationships: `suggestedByUser.profile`, `reviewedByUser.profile`, `createdCategory`

**Edge Cases**:
- [ ] Filter by status: `/api/v1/medical-history/category-suggestions?status=pending`
- [ ] Filter by status: `?status=approved`
- [ ] Filter by status: `?status=rejected`

#### Test 2.3: Update Pending Suggestion (Suggester Only)
**Steps**:
1. Authenticate as the user who created a suggestion
2. Send PUT request to `/api/v1/medical-history/category-suggestions/{suggestionId}`
   ```json
   {
     "name": "Sports & Athletic Medicine",
     "description": "Updated description"
   }
   ```
3. Verify response status is 200

**Expected Results**:
- Suggestion updated successfully
- Success message: "Suggestion updated successfully"

**Edge Cases**:
- [ ] Attempt to update another user's suggestion - expect 403 Forbidden
- [ ] Attempt to update approved suggestion - expect 403 Forbidden
- [ ] Attempt to update rejected suggestion - expect 403 Forbidden
- [ ] Update non-existent suggestion - expect 404 Not Found

#### Test 2.4: Delete Pending Suggestion (Suggester Only)
**Steps**:
1. Authenticate as suggester
2. Send DELETE request to `/api/v1/medical-history/category-suggestions/{suggestionId}`
3. Verify response status is 200

**Expected Results**:
- Suggestion deleted from database
- Success message: "Suggestion deleted successfully"

**Edge Cases**:
- [ ] Attempt to delete another user's suggestion - expect 403 Forbidden
- [ ] Attempt to delete approved suggestion - expect 403 Forbidden
- [ ] Attempt to delete rejected suggestion - expect 403 Forbidden

#### Test 2.5: Approve Suggestion (Manager Only)
**Steps**:
1. Authenticate as manager or medical director
2. Send POST request to `/api/v1/medical-history/category-suggestions/{suggestionId}/approve`
   ```json
   {
     "review_notes": "Great suggestion! We need this category."
   }
   ```
3. Verify response status is 200
4. Send GET to `/api/v1/medical-history/categories` to verify category was created

**Expected Results**:
- New category created with suggestion's data
- Suggestion status changed to `approved`
- `reviewed_by` set to manager's user ID
- `reviewed_at` set to current timestamp
- `category_id` linked to newly created category
- Response includes `createdCategory` and `reviewedByUser.profile`
- Success message: "Suggestion approved and category created"

**Edge Cases**:
- [ ] Attempt to approve as non-manager - expect 403 Forbidden
- [ ] Approve already reviewed suggestion - expect 409 Conflict with error message "Suggestion already reviewed"
- [ ] Approve without review_notes - should succeed (review_notes is optional)

#### Test 2.6: Reject Suggestion (Manager Only)
**Steps**:
1. Authenticate as manager
2. Send POST request to `/api/v1/medical-history/category-suggestions/{suggestionId}/reject`
   ```json
   {
     "review_notes": "This category overlaps with existing 'Clinical Notes' category."
   }
   ```
3. Verify response status is 200

**Expected Results**:
- Suggestion status changed to `rejected`
- `reviewed_by` set to manager's user ID
- `reviewed_at` set to current timestamp
- `review_notes` stored
- No category created
- Response includes `reviewedByUser.profile`
- Success message: "Suggestion rejected"

**Edge Cases**:
- [ ] Attempt to reject as non-manager - expect 403 Forbidden
- [ ] Reject already reviewed suggestion - expect 409 Conflict
- [ ] Reject without review_notes - expect validation error (review_notes required for rejection)

---

### Scenario 3: Integration Testing

**Objective**: Test complete workflows combining multiple operations

#### Test 3.1: Full Suggestion Approval Workflow
**Steps**:
1. Doctor suggests new category
2. Doctor views their suggestions (should see the new one)
3. Manager views all suggestions (should see doctor's suggestion)
4. Manager approves suggestion with notes
5. All users can now see new category in categories list
6. Verify suggestion record links to created category via `category_id`

**Expected Results**:
- Complete workflow executes without errors
- Category is usable immediately after approval
- Audit trail preserved in suggestion record

#### Test 3.2: Suggestion Update and Rejection Workflow
**Steps**:
1. Staff member suggests category
2. Staff member updates their pending suggestion
3. Manager reviews and rejects with reason
4. Staff member can view rejected suggestion with rejection reason
5. Staff member cannot update or delete rejected suggestion

**Expected Results**:
- Rejection reason visible to suggester
- Rejected suggestions are immutable

---

## Regression Testing
Test that existing functionality still works:

- [ ] Phase 1-3 medical history features still function correctly
- [ ] Existing categories remain accessible
- [ ] Medical history entry creation with categories still works
- [ ] Access grants and audit trails unaffected
- [ ] Annotations system unaffected

---

## Database Verification

### Verify Migration
```bash
docker exec pre-clinic-backend-app-1 php artisan migrate:status
```
Expected: `2026_01_18_400001_create_medical_history_category_suggestions_table` shows as "Ran"

### Verify Table Structure
```bash
docker exec pre-clinic-backend-app-1 mysql -u preclinic_user -ppassword preclinic -e "DESCRIBE medical_history_category_suggestions;"
```
Expected columns: id, name, slug, description, is_critical_enabled, sort_order, suggested_by, reviewed_by, status, review_notes, reviewed_at, category_id, created_at, updated_at

### Check Indexes
```bash
docker exec pre-clinic-backend-app-1 mysql -u preclinic_user -ppassword preclinic -e "SHOW INDEXES FROM medical_history_category_suggestions;"
```
Expected indexes:
- Primary key on `id`
- `mhcs_status_idx` on `status, created_at`
- Index on `suggested_by`
- Foreign keys on `suggested_by`, `reviewed_by`, `category_id`

---

## Known Issues / Limitations
- Model's boot method auto-sets `suggested_by` from authenticated user, so tinker testing requires workaround
- Category deletion is soft (sets `is_active = false`) rather than true deletion to preserve data integrity

---

## Rollback Instructions
If critical issues are found:

1. **Rollback migration**:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan migrate:rollback --step=1
   ```

2. **Remove new files** (if needed):
   - `app/Models/MedicalHistoryCategorySuggestion.php`
   - `app/Policies/MedicalHistoryCategoryPolicy.php`
   - `app/Policies/MedicalHistoryCategorySuggestionPolicy.php`
   - `app/Http/Controllers/API/V1/MedicalHistoryCategorySuggestionController.php`

3. **Revert AuthServiceProvider changes**:
   - Remove policy registrations

4. **Revert route changes**:
   - Restore original category routes
   - Remove suggestion routes

5. **Revert MedicalHistoryCategoryController**:
   - Restore original read-only controller

---

## Next Steps
After successful Phase 4 testing:
- All 4 phases of the medical history system are complete
- System ready for frontend integration
- Consider creating comprehensive end-to-end tests
- Document API endpoints for frontend team
