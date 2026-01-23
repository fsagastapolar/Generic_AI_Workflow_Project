# Manual Testing Guide: Phase 3 - Full Audit Trail & Access Control System

## Implementation Summary
- **Feature**: Comprehensive version history tracking and flexible access control for medical history entries
- **Implementation Date**: 2026-01-22
- **Phase**: Phase 3 of Medical History System

### Changes Implemented
1. **Audit Trail System**:
   - Created `medical_history_audit_trail` table to track all CRUD operations
   - Implemented model observers in `MedicalHistoryEntry` to automatically log events
   - Added middleware to log 'accessed' events when entries are viewed
   - Created `MedicalHistoryAuditController` for retrieving audit logs

2. **Access Control System**:
   - Created `medical_history_access_grants` table for managing access permissions
   - Created `medical_history_access_audit` table for tracking grant/revoke operations
   - Implemented flexible access control (individual users OR entire roles)
   - Created `MedicalHistoryAccessGrantController` for managing grants
   - Updated `MedicalHistoryEntryPolicy` to enforce access grants

3. **API Endpoints Added**:
   - `GET /api/v1/medical-history/patients/{patientId}/access-grants` - List grants
   - `POST /api/v1/medical-history/patients/{patientId}/access-grants` - Grant access
   - `DELETE /api/v1/medical-history/access-grants/{grantId}` - Revoke access
   - `GET /api/v1/medical-history/patients/{patientId}/access-audit` - View access audit log
   - `GET /api/v1/medical-history/entries/{entryId}/audit` - View entry audit trail

## Prerequisites
- [ ] Docker containers running: `docker ps` (verify `pre-clinic-backend-app-1` is running)
- [ ] Database migrated: `docker exec pre-clinic-backend-app-1 php artisan migrate`
- [ ] Database seeded with test data (users, patients, medical history entries)
- [ ] Frontend running (if testing via UI): `ng serve`
- [ ] Authentication working (able to login as different user roles)

## Test Scenarios

### Scenario 1: Audit Trail for Entry Creation
**Objective**: Verify that creating a medical history entry logs a 'created' event

**Prerequisites**:
- Logged in as a medical professional (doctor/staff)
- Have access to a patient

**Steps**:
1. Create a new medical history entry via API:
   ```
   POST /api/v1/medical-history/entries
   {
     "patient_id": 1,
     "category_id": 1,
     "content": "Test entry for audit trail verification"
   }
   ```
2. Note the entry ID from the response
3. Retrieve the audit trail for the entry:
   ```
   GET /api/v1/medical-history/entries/{entryId}/audit
   ```

**Expected Results**:
- Entry creation succeeds with HTTP 201
- Audit trail response contains at least one record
- Most recent audit record has:
  - `event: "created"`
  - `user_id` matches authenticated user
  - `new_values` contains patient_id, category_id, content, created_by
  - `old_values` is null
  - `ip_address` and `user_agent` are populated
  - `created_at` timestamp is recent

**Edge Cases**:
- [ ] Verify audit trail survives if entry is soft-deleted
- [ ] Verify audit trail is not deleted if entry is force-deleted

---

### Scenario 2: Audit Trail for Entry Updates
**Objective**: Verify that editing a medical history entry logs an 'updated' event with old and new values

**Prerequisites**:
- Logged in as the author of an existing entry
- Have an existing medical history entry

**Steps**:
1. Note the current content of an entry
2. Update the entry via API:
   ```
   PUT /api/v1/medical-history/entries/{entryId}
   {
     "content": "Updated content for testing audit trail"
   }
   ```
3. Retrieve the audit trail:
   ```
   GET /api/v1/medical-history/entries/{entryId}/audit
   ```

**Expected Results**:
- Update succeeds with HTTP 200
- Entry shows `is_edited: true`
- Audit trail contains 'updated' event
- 'updated' event record has:
  - `old_values` contains the original content
  - `new_values` contains the updated content
  - `user_id` matches the authenticated user (author)
  - Timestamp shows when update occurred

**Edge Cases**:
- [ ] Multiple updates create multiple audit records
- [ ] Audit trail preserves full history of changes

---

### Scenario 3: Audit Trail for Entry Deletion and Restoration
**Objective**: Verify that deleting and restoring entries logs appropriate events

**Prerequisites**:
- Logged in as author or health_center_manager
- Have an existing medical history entry

**Steps**:
1. Soft-delete the entry:
   ```
   DELETE /api/v1/medical-history/entries/{entryId}
   ```
2. Retrieve audit trail:
   ```
   GET /api/v1/medical-history/entries/{entryId}/audit
   ```
3. Restore the entry:
   ```
   POST /api/v1/medical-history/entries/{entryId}/restore
   ```
4. Retrieve audit trail again

**Expected Results**:
- Deletion succeeds, entry is soft-deleted
- Audit trail after deletion shows 'deleted' event with:
  - `old_values` contains entry data before deletion
  - `new_values` is null
- After restoration, audit trail shows 'restored' event with:
  - `old_values` is null
  - `new_values` contains restored entry data
- Entry is accessible again after restoration

**Edge Cases**:
- [ ] Verify deleted_by field is set on the entry
- [ ] Verify only authorized users can restore

---

### Scenario 4: Access Event Logging
**Objective**: Verify that viewing a medical history entry logs an 'accessed' event

**Prerequisites**:
- Logged in as a medical professional
- Have an existing medical history entry

**Steps**:
1. View a specific entry:
   ```
   GET /api/v1/medical-history/entries/{entryId}
   ```
2. Retrieve the audit trail:
   ```
   GET /api/v1/medical-history/entries/{entryId}/audit
   ```

**Expected Results**:
- Entry retrieval succeeds
- Audit trail contains an 'accessed' event
- 'accessed' event has:
  - `user_id` of the viewer
  - `old_values` and `new_values` are both null
  - `ip_address` and `user_agent` populated
  - Recent timestamp

**Edge Cases**:
- [ ] Each view creates a new 'accessed' record
- [ ] 'accessed' events are logged for all authorized viewers

---

### Scenario 5: Grant Access to Individual User
**Objective**: Verify that a manager can grant access to a specific user (e.g., technician)

**Prerequisites**:
- Logged in as `health_center_manager`
- Have a patient with medical history entries
- Have a technician user who does NOT have access

**Steps**:
1. Verify technician cannot access patient's medical history:
   ```
   GET /api/v1/medical-history/entries?patient_id={patientId}
   ```
   (Login as technician first - should return 403 or empty results)

2. As manager, grant access to technician:
   ```
   POST /api/v1/medical-history/patients/{patientId}/access-grants
   {
     "user_id": {technicianUserId},
     "reason": "Assisting with patient care"
   }
   ```

3. Verify grant was created:
   ```
   GET /api/v1/medical-history/patients/{patientId}/access-grants
   ```

4. As technician, attempt to access patient's medical history again:
   ```
   GET /api/v1/medical-history/entries?patient_id={patientId}
   ```

**Expected Results**:
- Initial access attempt by technician fails (403 or empty)
- Grant creation succeeds with HTTP 201
- Grant record shows:
  - `user_id` = technician's ID
  - `role_name` = null
  - `is_active` = true
  - `granted_by` = manager's ID
  - `reason` is populated
- After grant, technician can successfully view patient's medical history
- Access audit log shows 'granted' event for individual user

**Edge Cases**:
- [ ] Cannot create duplicate active grant for same user+patient
- [ ] Grant applies only to the specific patient
- [ ] Technician can view but not create/edit entries

---

### Scenario 6: Grant Access to Entire Role
**Objective**: Verify that a manager can grant access to all users with a specific role

**Prerequisites**:
- Logged in as `health_center_manager`
- Have a patient with medical history entries
- Have multiple users with 'technician' role

**Steps**:
1. As manager, grant access to entire technician role:
   ```
   POST /api/v1/medical-history/patients/{patientId}/access-grants
   {
     "role_name": "technician",
     "reason": "All technicians need access for lab coordination"
   }
   ```

2. Verify grant was created:
   ```
   GET /api/v1/medical-history/patients/{patientId}/access-grants
   ```

3. As different technician users, verify they can all access the patient's medical history

**Expected Results**:
- Grant creation succeeds
- Grant record shows:
  - `user_id` = null
  - `role_name` = "technician"
  - `is_active` = true
  - `granted_by` = manager's ID
- All users with 'technician' role can access patient's medical history
- Access audit log shows 'granted' event for role

**Edge Cases**:
- [ ] Role name validation (only allowed roles: patient, technician, technical_supervisor)
- [ ] Cannot specify both user_id AND role_name simultaneously
- [ ] New users assigned technician role automatically get access

---

### Scenario 7: Revoke Access Grant
**Objective**: Verify that a manager can revoke previously granted access

**Prerequisites**:
- Logged in as `health_center_manager`
- Have an active access grant (from Scenario 5 or 6)

**Steps**:
1. List current grants:
   ```
   GET /api/v1/medical-history/patients/{patientId}/access-grants
   ```
2. Note an active grant's ID
3. Revoke the grant:
   ```
   DELETE /api/v1/medical-history/access-grants/{grantId}
   {
     "revoke_reason": "Patient care complete, access no longer needed"
   }
   ```
4. Verify grant status updated:
   ```
   GET /api/v1/medical-history/patients/{patientId}/access-grants
   ```
5. As previously granted user, verify access is denied:
   ```
   GET /api/v1/medical-history/entries?patient_id={patientId}
   ```

**Expected Results**:
- Revocation succeeds
- Grant record is updated with:
  - `is_active` = false
  - `revoked_by` = manager's ID
  - `revoked_at` = recent timestamp
  - `revoke_reason` is populated
- Previously granted user can NO LONGER access patient's medical history
- Access audit log shows 'revoked' event

**Edge Cases**:
- [ ] Grant record is not deleted, only marked inactive
- [ ] Cannot revoke the same grant twice
- [ ] Can re-grant access by creating new grant record

---

### Scenario 8: View Access Audit Log
**Objective**: Verify that managers can view complete audit log of all grant/revoke operations

**Prerequisites**:
- Logged in as `health_center_manager`
- Have completed several grant and revoke operations (from previous scenarios)

**Steps**:
1. Retrieve access audit log:
   ```
   GET /api/v1/medical-history/patients/{patientId}/access-audit
   ```

**Expected Results**:
- Audit log retrieval succeeds
- Response contains all grant and revoke operations
- Each audit record includes:
  - `action` ('granted' or 'revoked')
  - `grant_type` ('individual' or 'role')
  - `user_id` (affected user, or 0 for role-based)
  - `role_name` (if role-based grant)
  - `performed_by` (manager who performed the action)
  - `reason` (if provided)
  - `ip_address` and `user_agent`
  - `created_at` timestamp
- Records are ordered by most recent first

**Edge Cases**:
- [ ] Audit log survives grant record changes (immutable)
- [ ] Only managers can view access audit logs

---

### Scenario 9: Authorization Enforcement
**Objective**: Verify that access control is properly enforced by the policy

**Prerequisites**:
- Have users with different roles (doctor, technician, patient)
- Have patients with and without access grants

**Steps**:
1. As technician WITHOUT grant:
   - Attempt to view entry: `GET /api/v1/medical-history/entries/{entryId}` → Should fail (403)
   - Attempt to list entries for patient: `GET /api/v1/medical-history/entries?patient_id={patientId}` → Should fail or return empty

2. As technician WITH grant:
   - View entry: Should succeed
   - List entries for patient: Should return patient's entries

3. As doctor (medical professional):
   - View any entry: Should succeed (default access)
   - List all entries: Should succeed

4. As health_center_manager:
   - View any entry: Should succeed (default access)
   - Manage grants: Should succeed

5. As regular user (non-medical, no grant):
   - Attempt to view entry: Should fail (403)

**Expected Results**:
- Medical professionals (doctor, staff, medical_director) have default access to all entries
- Technicians and other roles require explicit access grants
- Access grants work for both individual users and entire roles
- Proper 403 Unauthorized responses for unauthorized access

**Edge Cases**:
- [ ] Cannot grant access to medical professionals (they already have it)
- [ ] Patient role cannot create entries, only view if granted
- [ ] Access grants do not grant create/edit/delete permissions, only view

---

### Scenario 10: Data Integrity and Security
**Objective**: Verify that audit logs are immutable and secure

**Prerequisites**:
- Have existing audit trail records
- Have existing access audit records

**Steps**:
1. Attempt to update an audit trail record via database or API
2. Attempt to delete an audit trail record
3. Verify audit records contain IP address and user agent
4. Verify timestamps are accurate and in correct timezone

**Expected Results**:
- Audit trail records cannot be modified (no `updated_at` field)
- Audit trail records should not be deletable via normal operations
- All audit records contain security metadata (IP, user agent)
- Timestamps are correctly recorded

**Edge Cases**:
- [ ] Audit records persist even if related user is deleted (onDelete: restrict)
- [ ] Audit records cascade delete only if patient is deleted
- [ ] No API endpoints allow modifying audit records

---

## Regression Testing
Verify that existing functionality still works:
- [ ] Medical professionals can still create, view, edit entries without needing grants
- [ ] Annotation system (Phase 2) still works correctly
- [ ] Soft delete and restore functionality still works
- [ ] Entry indexing and filtering still works
- [ ] Original authorization for create/update/delete still enforced (author-only edit, etc.)

## Known Issues / Limitations
- Audit trail does not track IP/user agent for events triggered by system operations (seeders, etc.)
- Access grants are patient-specific; there is no "grant access to all patients" option
- Access grants only control view permissions; create/edit/delete still require medical professional role

## Rollback Instructions
If critical issues are found:

1. **Stop the app container**:
   ```bash
   docker stop pre-clinic-backend-app-1
   ```

2. **Rollback migrations**:
   ```bash
   docker start pre-clinic-backend-app-1
   docker exec pre-clinic-backend-app-1 php artisan migrate:rollback --step=3
   ```

3. **Remove Phase 3 code changes** (revert Git commits if on feature branch):
   ```bash
   git checkout main -- <files>
   ```

4. **Restart app**:
   ```bash
   docker restart pre-clinic-backend-app-1
   ```

5. **Verify system is stable** by testing basic medical history operations

---

## Notes for Testers
- Use different browser sessions or API clients to test multi-user scenarios
- Clear authentication tokens between user switches
- Use Postman or similar tool for API testing
- Check database directly using phpMyAdmin (http://localhost:8080) to verify audit records
- Test with realistic medical data, not placeholder text
- Pay attention to HIPAA compliance aspects (data logging, access tracking)
