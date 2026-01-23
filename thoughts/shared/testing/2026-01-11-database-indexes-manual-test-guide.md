# Manual Testing Guide: Database Indexes Optimization

## Implementation Summary
- **Feature**: Added database indexes to optimize query performance for frequently accessed fields
- **Critical Review Issue**: #17 - Missing Database Indexes
- **Implementation Date**: 2026-01-11
- **Plan Reference**: `thoughts/shared/plans/2026-01-11-database-indexes-optimization.md`

### Changes Made
Added strategic indexes to 6 tables to improve query performance:

**Phase 1 - High-Priority Tables:**
1. **patients**: Index on `phone_number` for patient lookup
2. **prescriptions**: Composite index on `[patient_id, prescribed_date]` and index on `status`
3. **medical_study_results**: Composite index on `[patient_id, study_date]` and index on `status`
4. **laboratory_results**: Composite index on `[patient_id, test_date]` and index on `status`

**Phase 2 - Supporting Tables:**
5. **doctor_schedules**: Composite index on `[doctor_id, day_of_week]`
6. **patient_medical_histories**: Composite index on `[patient_id, status]`

## Prerequisites
- [ ] Docker containers running: `docker ps` (verify preclinic-mysql and pre-clinic-backend-app-1 are up)
- [ ] Database migrated: `docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed`
- [ ] MySQL client access available (via docker exec or phpMyAdmin at localhost:8080)

## Test Scenarios

### Scenario 1: Verify All Indexes Exist in Database
**Objective**: Confirm all indexes were created successfully

**Steps**:
1. Connect to MySQL container:
   ```bash
   docker exec preclinic-mysql mysql -u preclinic_user -ppreclinic2024 preclinic
   ```

2. Check patients table indexes:
   ```sql
   SHOW INDEXES FROM patients WHERE Key_name LIKE '%phone%';
   ```

3. Check prescriptions table indexes:
   ```sql
   SHOW INDEXES FROM prescriptions;
   ```

4. Check medical_study_results table indexes:
   ```sql
   SHOW INDEXES FROM medical_study_results;
   ```

5. Check laboratory_results table indexes:
   ```sql
   SHOW INDEXES FROM laboratory_results;
   ```

6. Check doctor_schedules table indexes:
   ```sql
   SHOW INDEXES FROM doctor_schedules;
   ```

7. Check patient_medical_histories table indexes:
   ```sql
   SHOW INDEXES FROM patient_medical_histories;
   ```

**Expected Results**:
- `patients_phone_number_index` exists on patients table
- `prescriptions_patient_id_prescribed_date_index` (composite) exists on prescriptions table
- `prescriptions_status_index` exists on prescriptions table
- `medical_study_results_patient_id_study_date_index` (composite) exists on medical_study_results table
- `medical_study_results_status_index` exists on medical_study_results table
- `laboratory_results_patient_id_test_date_index` (composite) exists on laboratory_results table
- `laboratory_results_status_index` exists on laboratory_results table
- `doctor_schedules_doctor_id_day_of_week_index` (composite) exists on doctor_schedules table
- `patient_medical_histories_patient_id_status_index` (composite) exists on patient_medical_histories table
- All index names are under MySQL's 64-character limit
- All indexes show `Index_type` as `BTREE`

**Edge Cases**:
- [ ] Verify indexes are visible (Visible column = YES)
- [ ] Confirm Non_unique = 1 (these are non-unique indexes, not unique constraints)
- [ ] Check composite indexes have correct Seq_in_index values (1, 2, etc.)

---

### Scenario 2: Verify Index Usage with EXPLAIN Queries
**Objective**: Confirm MySQL query optimizer uses the new indexes

**Steps**:
1. Connect to MySQL container as in Scenario 1

2. Test patient phone lookup:
   ```sql
   EXPLAIN SELECT * FROM patients WHERE phone_number = '+1234567890';
   ```

3. Test prescription history query:
   ```sql
   EXPLAIN SELECT * FROM prescriptions
   WHERE patient_id = 1
   ORDER BY prescribed_date DESC;
   ```

4. Test prescription status filtering:
   ```sql
   EXPLAIN SELECT * FROM prescriptions WHERE status = 'active';
   ```

5. Test medical study results history:
   ```sql
   EXPLAIN SELECT * FROM medical_study_results
   WHERE patient_id = 1
   ORDER BY study_date DESC;
   ```

6. Test laboratory results history:
   ```sql
   EXPLAIN SELECT * FROM laboratory_results
   WHERE patient_id = 1
   ORDER BY test_date DESC;
   ```

7. Test doctor schedule lookup:
   ```sql
   EXPLAIN SELECT * FROM doctor_schedules
   WHERE doctor_id = 1 AND day_of_week = 'monday';
   ```

8. Test patient medical history by status:
   ```sql
   EXPLAIN SELECT * FROM patient_medical_histories
   WHERE patient_id = 1 AND status = 'active';
   ```

**Expected Results**:
- Each EXPLAIN output should show:
  - `type` = `ref` (index is being used for lookup)
  - `key` = the appropriate index name (e.g., `patients_phone_number_index`)
  - `rows` should be low (indicates efficient filtering)
  - `Extra` should NOT contain "Using filesort" or "Using temporary" for simple queries

**Edge Cases**:
- [ ] If `type` = `ALL`, the index is NOT being used (table scan) - this is a problem
- [ ] If `key` = `NULL`, no index is being used - this is a problem
- [ ] Composite indexes should show both columns in `key` field

---

### Scenario 3: Verify Database Seeding Success
**Objective**: Confirm database can be seeded successfully with indexes in place

**Steps**:
1. Drop and recreate database:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed
   ```

2. Verify no errors in migration output

3. Check data was seeded:
   ```bash
   docker exec preclinic-mysql mysql -u preclinic_user -ppreclinic2024 preclinic -e "SELECT COUNT(*) FROM patients;"
   ```

4. Verify all tables have data:
   ```bash
   docker exec preclinic-mysql mysql -u preclinic_user -ppreclinic2024 preclinic -e "
   SELECT
     (SELECT COUNT(*) FROM patients) as patients,
     (SELECT COUNT(*) FROM prescriptions) as prescriptions,
     (SELECT COUNT(*) FROM medical_study_results) as medical_study_results,
     (SELECT COUNT(*) FROM laboratory_results) as laboratory_results,
     (SELECT COUNT(*) FROM doctor_schedules) as doctor_schedules,
     (SELECT COUNT(*) FROM patient_medical_histories) as patient_medical_histories;
   "
   ```

**Expected Results**:
- Migration completes without errors
- Database seeding completes successfully
- All tables contain data (counts > 0)
- Seeding summary shows expected counts:
  - Users: 36
  - Doctors: 10
  - Patients: 20
  - Staff: 5
  - Departments: 5
  - Health Centers: 4

**Edge Cases**:
- [ ] No duplicate key errors during seeding
- [ ] No foreign key constraint violations
- [ ] All relationships properly seeded

---

### Scenario 4: Query Performance Comparison
**Objective**: Measure performance improvement from indexes (optional but recommended)

**Steps**:
1. Enable query profiling:
   ```sql
   SET profiling = 1;
   ```

2. Run a test query multiple times:
   ```sql
   SELECT * FROM patients WHERE phone_number = '+1234567890';
   SELECT * FROM prescriptions WHERE patient_id = 1 ORDER BY prescribed_date DESC;
   SELECT * FROM doctor_schedules WHERE doctor_id = 1 AND day_of_week = 'monday';
   ```

3. View profiling results:
   ```sql
   SHOW PROFILES;
   ```

**Expected Results**:
- Query execution time should be < 0.01 seconds for indexed queries
- With 10,000+ rows, indexed queries should be significantly faster than table scans
- `SHOW PROFILES` should show consistent, fast execution times

**Edge Cases**:
- [ ] Test with larger datasets if available
- [ ] Compare before/after if you have baseline measurements
- [ ] Check slow query log (if enabled) to verify no slow queries

---

### Scenario 5: Application Integration Test
**Objective**: Verify application endpoints still work correctly

**Steps**:
1. Start backend server if not running:
   ```bash
   docker ps
   ```

2. Test API endpoints that use indexed tables (via Postman, curl, or browser):
   - GET `/api/v1/patients` - Should work without errors
   - GET `/api/v1/appointments` - Should use appointment indexes
   - GET `/api/v1/prescriptions` (if endpoint exists) - Should use new prescription indexes

3. Check application logs for errors:
   ```bash
   docker logs pre-clinic-backend-app-1 --tail 50
   ```

**Expected Results**:
- API endpoints return data successfully
- No database-related errors in logs
- Response times remain fast or improve
- No "index not found" or similar database errors

**Note**: Many API endpoints currently return 404 errors due to pre-existing issues unrelated to database indexes. Focus on verifying no NEW errors appear.

**Edge Cases**:
- [ ] Test with authentication tokens if required
- [ ] Verify pagination works correctly
- [ ] Test filtering and sorting on indexed columns

---

### Scenario 6: Index Name Length Validation
**Objective**: Ensure all index names comply with MySQL's 64-character limit

**Steps**:
1. Query all index names and their lengths:
   ```sql
   SELECT
     TABLE_NAME,
     INDEX_NAME,
     LENGTH(INDEX_NAME) as name_length
   FROM information_schema.STATISTICS
   WHERE TABLE_SCHEMA = 'preclinic'
     AND TABLE_NAME IN (
       'patients',
       'prescriptions',
       'medical_study_results',
       'laboratory_results',
       'doctor_schedules',
       'patient_medical_histories'
     )
     AND INDEX_NAME LIKE '%index'
   ORDER BY name_length DESC;
   ```

**Expected Results**:
- All index names have `name_length` <= 64
- Longest index names are around 50-60 characters
- All index names follow Laravel's naming convention: `{table}_{column(s)}_index`

**Edge Cases**:
- [ ] No truncated index names
- [ ] No duplicate index names across tables

---

## Regression Testing
Verify that existing functionality still works:
- [ ] Appointments can be created and retrieved
- [ ] Patient records can be accessed
- [ ] Doctor schedules can be queried
- [ ] Medical records can be saved
- [ ] Existing database relationships remain intact
- [ ] Foreign key constraints still enforce referential integrity

## Known Issues / Limitations
- **Pre-existing test failures**: 105 tests currently fail with 404 errors. These failures existed before the index implementation and are related to missing API routes, not database issues.
- **Index cardinality**: In development with small datasets, cardinality values may be low. In production with larger datasets, index benefits will be more significant.
- **No application code changes**: This implementation only adds database indexes. No application code, models, or controllers were modified.

## Rollback Instructions
If critical issues are found during manual testing:

1. Identify which indexes are causing issues

2. Edit the migration files to remove problematic indexes:
   - Remove the `$table->index(...)` lines from the migration files
   - Files are located in `Pre-Clinic-Backend/database/migrations/`

3. Reset the database:
   ```bash
   docker exec pre-clinic-backend-app-1 php artisan migrate:fresh --seed
   ```

4. Verify the problematic indexes are gone:
   ```sql
   SHOW INDEXES FROM <table_name>;
   ```

5. Report the issue to the development team for investigation

## Performance Monitoring (Post-Implementation)
After deployment, monitor:
1. **Query slow log** - Verify indexed queries are fast (< 100ms)
2. **API response times** - Endpoints using indexed tables should remain fast
3. **Database size** - Should increase negligibly (5-10MB for 100K records)
4. **Index usage statistics** - Use `SHOW INDEX` to monitor cardinality growth

Consider enabling MySQL slow query log in development:
```sql
SET GLOBAL slow_query_log = 'ON';
SET GLOBAL long_query_time = 0.5; -- Log queries > 500ms
```

## Testing Sign-off
- [ ] Scenario 1: All indexes verified in database ✓
- [ ] Scenario 2: EXPLAIN queries show index usage ✓
- [ ] Scenario 3: Database seeding successful ✓
- [ ] Scenario 4: Query performance acceptable ✓
- [ ] Scenario 5: Application endpoints functional ✓
- [ ] Scenario 6: Index names under 64 characters ✓
- [ ] Regression tests passed ✓
- [ ] No critical issues found ✓

**Tested by**: _________________
**Date**: _________________
**Approved by**: _________________
**Date**: _________________
