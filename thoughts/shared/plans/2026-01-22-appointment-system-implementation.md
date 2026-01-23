# Comprehensive Appointment System Implementation Plan

## Overview

This plan outlines the implementation of a complete appointment scheduling system for the PreClinic medical center management platform. The system will support multiple professional types (doctors, kinesiologists, psychologists, nurses, technicians), complex scheduling patterns (weekly, bi-weekly, date ranges, exceptions), and various appointment types (consultations, medical studies, procedures) with multi-staff assignments and approval workflows.

## Current State Analysis

### Existing Infrastructure

**Models:**
- `Doctor` model with relationships to specialties, appointments, schedules, health centers
- `Appointment` model (placeholder) with basic fields: patient_id, doctor_id, health_center_id, appointment_date, duration_minutes, status, reason, notes, created_by
- `DoctorSchedule` model with weekly recurring schedules: doctor_id, health_center_id, day_of_week (enum), start_time, end_time, is_available
- `MedicalSpecialty` model with many-to-many relationship to doctors
- `Technician` model with relationships to health centers and technician types
- `MedicalStudy` model (catalog of studies like MRI, CT scan) with relationships to doctors and technicians
- `Staff` model for general staff members
- `Patient` model with medical history and appointments

**Database Migrations:**
- `create_appointments_table.php` - Basic appointment structure (placeholder)
- `create_doctor_schedules_table.php` - Weekly schedule with day_of_week enum
- `create_pivot_tables.php` - Many-to-many relationships including medical_specialties_doctors, medical_studies_doctors, medical_studies_technicians

**Patterns Identified:**
- Audit trail pattern: Immutable audit tables with JSON snapshots, static helper methods, model boot events (medical_history_audit_trail)
- Soft delete pattern: SoftDeletes trait with deleted_by tracking (medical_history_entries)
- Created/modified tracking: created_by, updated_by, deleted_by fields with automatic population via boot events
- Event listeners: Observer pattern and closure-based listeners for cache invalidation
- Enum fields: Extensive use of database enums for status fields and constrained values

### Key Limitations

1. **Single Professional Type**: Only doctors can have schedules and appointments
2. **Simple Schedules**: Only weekly recurring patterns, no bi-weekly, date ranges, or exceptions
3. **Single Time Block**: Cannot represent multiple time blocks per day (e.g., 9am-12pm, then 2pm-5pm)
4. **No Specialty Selection**: Schedules don't specify which specialties are available during that time
5. **Single Staff Assignment**: Appointments only link to one doctor, cannot handle multi-disciplinary procedures
6. **No Assignment Workflow**: No concept of unassigned appointments or assignment requests/approvals
7. **No Status History**: Status changes aren't tracked
8. **Fixed Buffer Times**: No customizable buffer times per professional, specialty, or study type
9. **No Conflict Prevention**: No validation for double-booking or schedule conflicts

## Desired End State

### System Capabilities

**Professional Management:**
- Doctors, healthcare professionals (kinesiologists, psychologists), nurses, and technicians can all have schedules
- Each professional type has appropriate appointment capabilities:
  - Doctors: consultations, studies, procedures
  - Healthcare professionals: consultations only
  - Nurses: procedures only (as team members)
  - Technicians: studies and procedures only (as team members)

**Flexible Scheduling:**
- Weekly recurring patterns (current)
- Bi-weekly patterns with start date
- Date ranges (valid_from, valid_to)
- Schedule exceptions (vacation days, specific date overrides)
- Multiple time blocks per day
- Schedule belongs to specific health center and department
- Each schedule shows one or more specialties available

**Appointment Types:**
- Consultation: Patient meets with doctor or healthcare professional
- Study: Medical study/imaging (MRI, CT scan, etc.) with optional doctor and/or technician assignment
- Procedure: Complex procedures requiring multiple staff with defined roles

**Appointment Assignment:**
- Appointments created by professional: automatically assigned to them
- Appointments created by manager/head: can be left unassigned
- Unassigned appointments invisible to patients
- Staff can request assignment (approval workflow)
- Managers/heads can enable auto-claim mode

**Multi-Staff Coordination:**
- Studies and procedures can have multiple staff assigned
- Each assignment has a role (Lead Surgeon, Anesthesiologist, Nurse, or custom "Other")
- Assignment history tracked for auditing

**Conflict Prevention:**
- Prevent double-booking (same professional, overlapping times)
- Prevent simultaneous schedules at different health centers
- Warn about schedules during blocked/vacation periods

**Buffer Times:**
- Customizable per study type
- Customizable per professional
- Customizable per specialty
- Safety margin for appointments extending past estimated duration

**Audit & History:**
- Track who created/modified appointments
- Full status change history
- Reassignment history for study appointments
- Soft delete with deleted_by tracking

**Permissions & Notifications:**
- Professionals manage own schedules
- Managers/heads can create/modify others' schedules
- Notifications sent when schedules are modified by others

### Verification Method

**Automated Testing:**
- Database migrations run successfully
- All models have proper relationships
- Factory and seeder data creates valid schedules and appointments
- Unit tests verify business logic (conflict detection, buffer time calculation)
- Integration tests verify appointment booking workflows

**Manual Testing:**
- Create schedules with all recurrence types
- Book appointments of each type
- Verify conflict prevention
- Test assignment request workflow
- Verify notifications are sent

## What We're NOT Doing

**Out of Scope:**
1. **Online Patient Booking Portal**: Frontend integration is future work
2. **Payment Processing**: Appointment fees and billing
3. **Reminder Notifications**: SMS/email reminders before appointments
4. **Calendar Integration**: Export to Google Calendar, Outlook, etc.
5. **Waitlist Management**: Automatic rebooking when slots open up
6. **Analytics Dashboard**: Reporting on appointment metrics
7. **Video Consultation Integration**: Telemedicine capabilities
8. **Equipment Reservation**: Booking specific rooms or medical equipment
9. **Insurance Verification**: Checking patient insurance eligibility
10. **Schedule Templates**: Reusable schedule templates (future enhancement)

## Complete Data Model Design

### New Tables

#### 1. healthcare_professionals

Stores non-doctor professionals who can provide consultations (kinesiologists, psychologists, etc.).

```php
Schema::create('healthcare_professionals', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->enum('professional_type', ['kinesiologist', 'psychologist', 'nutritionist', 'physiotherapist', 'other']);
    $table->string('license_number')->nullable();
    $table->date('license_expiry')->nullable();
    $table->text('certifications')->nullable();
    $table->decimal('consultation_fee', 10, 2)->nullable();
    $table->boolean('is_active')->default(true);
    $table->text('biography')->nullable();
    $table->string('emergency_contact_name')->nullable();
    $table->string('emergency_phone_number')->nullable();
    $table->timestamps();

    $table->index(['professional_type', 'is_active']);
    $table->unique('user_id');
});
```

**Relationships:**
- belongsTo User
- hasMany ProfessionalSchedule
- morphMany Appointment (as 'schedulable')
- belongsToMany HealthCenter (via pivot)
- belongsToMany Department (via pivot)

#### 2. nurses

Stores nurses who can participate in procedures.

```php
Schema::create('nurses', function (Blueprint $table) {
    $table->id();
    $table->foreignId('user_id')->constrained()->onDelete('cascade');
    $table->string('license_number');
    $table->date('license_expiry')->nullable();
    $table->text('certifications')->nullable();
    $table->boolean('is_active')->default(true);
    $table->string('emergency_contact_name')->nullable();
    $table->string('emergency_phone_number')->nullable();
    $table->timestamps();

    $table->index('is_active');
    $table->unique('user_id');
});
```

**Relationships:**
- belongsTo User
- hasMany ProfessionalSchedule (if nurses have schedules)
- belongsToMany HealthCenter (via pivot)
- belongsToMany Department (via pivot)

#### 3. professional_schedules

Unified schedule table for all professional types (doctors, healthcare professionals, nurses if they have schedules).

```php
Schema::create('professional_schedules', function (Blueprint $table) {
    $table->id();

    // Polymorphic relationship to professional (Doctor, HealthcareProfessional, Nurse)
    $table->morphs('schedulable'); // schedulable_id, schedulable_type

    $table->foreignId('health_center_id')->constrained()->onDelete('restrict');
    $table->foreignId('department_id')->constrained()->onDelete('restrict');

    // Basic time block
    $table->enum('day_of_week', ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']);
    $table->time('start_time');
    $table->time('end_time');

    // Recurrence pattern
    $table->enum('recurrence_type', ['weekly', 'biweekly'])->default('weekly');
    $table->date('recurrence_start_date')->nullable(); // For bi-weekly patterns

    // Date range validity
    $table->date('valid_from')->nullable();
    $table->date('valid_to')->nullable();

    // Availability flag
    $table->boolean('is_active')->default(true);

    // Tracking
    $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
    $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('restrict');

    $table->timestamps();

    // Indexes for performance
    $table->index(['schedulable_type', 'schedulable_id', 'day_of_week', 'is_active'], 'prof_sched_lookup');
    $table->index(['health_center_id', 'department_id', 'day_of_week'], 'prof_sched_location');
    $table->index(['valid_from', 'valid_to'], 'prof_sched_validity');
});
```

**Relationships:**
- morphTo Schedulable (Doctor, HealthcareProfessional, Nurse)
- belongsTo HealthCenter
- belongsTo Department
- belongsToMany MedicalSpecialty (via schedule_specialties)
- hasMany ScheduleException
- belongsTo User (created_by)
- belongsTo User (updated_by)

#### 4. schedule_specialties

Links schedules to the medical specialties available during that time.

```php
Schema::create('schedule_specialties', function (Blueprint $table) {
    $table->id();
    $table->foreignId('professional_schedule_id')->constrained()->onDelete('cascade');
    $table->foreignId('medical_specialty_id')->constrained()->onDelete('cascade');
    $table->timestamps();

    $table->unique(['professional_schedule_id', 'medical_specialty_id'], 'sched_spec_unique');
});
```

**Relationships:**
- belongsTo ProfessionalSchedule
- belongsTo MedicalSpecialty

#### 5. schedule_exceptions

Handles vacation days, holidays, and schedule overrides.

```php
Schema::create('schedule_exceptions', function (Blueprint $table) {
    $table->id();
    $table->foreignId('professional_schedule_id')->nullable()->constrained()->onDelete('cascade');

    // Polymorphic relationship to professional (for vacation days not tied to specific schedule)
    $table->morphs('exceptionable'); // exceptionable_id, exceptionable_type

    $table->enum('exception_type', ['vacation', 'holiday', 'override', 'unavailable']);
    $table->date('exception_date');

    // For override type: new time block
    $table->time('override_start_time')->nullable();
    $table->time('override_end_time')->nullable();

    $table->text('reason')->nullable();
    $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
    $table->timestamps();

    $table->index(['exceptionable_type', 'exceptionable_id', 'exception_date'], 'sched_exc_lookup');
    $table->index('exception_date');
});
```

**Relationships:**
- belongsTo ProfessionalSchedule (optional)
- morphTo Exceptionable (Doctor, HealthcareProfessional)
- belongsTo User (created_by)

#### 6. appointments

Complete replacement for current appointments table.

```php
Schema::create('appointments', function (Blueprint $table) {
    $table->id();

    // Patient
    $table->foreignId('patient_id')->constrained()->onDelete('cascade');

    // Location
    $table->foreignId('health_center_id')->constrained()->onDelete('restrict');
    $table->foreignId('department_id')->nullable()->constrained()->onDelete('restrict');

    // Appointment type and related entity
    $table->enum('appointment_type', ['consultation', 'study', 'procedure']);
    $table->foreignId('medical_study_id')->nullable()->constrained()->onDelete('restrict'); // For study/procedure types
    $table->foreignId('medical_specialty_id')->nullable()->constrained()->onDelete('restrict'); // For consultations

    // Scheduling
    $table->dateTime('appointment_date');
    $table->integer('duration_minutes')->default(30);
    $table->integer('buffer_minutes')->default(0); // Safety margin

    // Status
    $table->enum('status', [
        'draft',           // Created but not complete
        'pending',         // Awaiting assignment (for unassigned)
        'scheduled',       // Fully assigned and scheduled
        'confirmed',       // Patient confirmed
        'in_progress',     // Currently happening
        'completed',       // Finished successfully
        'cancelled',       // Cancelled
        'no_show'          // Patient didn't show up
    ])->default('draft');

    // Details
    $table->text('reason')->nullable();
    $table->text('notes')->nullable();
    $table->text('cancellation_reason')->nullable();

    // Visibility
    $table->boolean('visible_to_patients')->default(true); // False for unassigned appointments

    // Tracking
    $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
    $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('restrict');
    $table->foreignId('deleted_by')->nullable()->constrained('users')->onDelete('restrict');

    $table->timestamps();
    $table->softDeletes();

    // Indexes
    $table->index(['patient_id', 'appointment_date', 'status'], 'appt_patient_lookup');
    $table->index(['health_center_id', 'appointment_date'], 'appt_location_date');
    $table->index(['appointment_type', 'medical_study_id'], 'appt_study_lookup');
    $table->index(['status', 'visible_to_patients'], 'appt_visibility');
});
```

**Relationships:**
- belongsTo Patient
- belongsTo HealthCenter
- belongsTo Department (optional)
- belongsTo MedicalStudy (optional, for study/procedure types)
- belongsTo MedicalSpecialty (optional, for consultations)
- hasMany AppointmentStaff
- hasMany AppointmentStatusHistory
- hasMany AppointmentAssignmentRequest
- belongsTo User (created_by, updated_by, deleted_by)

#### 7. appointment_staff

Multi-staff assignments for appointments with roles.

```php
Schema::create('appointment_staff', function (Blueprint $table) {
    $table->id();
    $table->foreignId('appointment_id')->constrained()->onDelete('cascade');

    // Polymorphic relationship to staff member (Doctor, HealthcareProfessional, Nurse, Technician)
    $table->morphs('staffable'); // staffable_id, staffable_type

    // Role in this appointment
    $table->enum('role', [
        'primary_consultant',     // Main doctor for consultation
        'lead_surgeon',           // Primary surgeon for procedures
        'assistant_surgeon',      // Assisting surgeon
        'anesthesiologist',       // Anesthesia provider
        'nurse',                  // Nursing staff
        'technician',             // Technical operator (MRI, etc.)
        'radiologist',            // Reads imaging studies
        'specialist_consultant',  // Specialty consultant
        'other'                   // Custom role
    ])->default('other');

    $table->string('custom_role')->nullable(); // For 'other' role type

    // Assignment tracking
    $table->enum('assignment_status', ['assigned', 'confirmed', 'declined'])->default('assigned');
    $table->foreignId('assigned_by')->constrained('users')->onDelete('restrict');
    $table->timestamp('assigned_at');
    $table->timestamp('confirmed_at')->nullable();

    $table->timestamps();

    $table->index(['appointment_id', 'staffable_type', 'staffable_id'], 'appt_staff_lookup');
    $table->index(['staffable_type', 'staffable_id'], 'staff_appointments');
});
```

**Relationships:**
- belongsTo Appointment
- morphTo Staffable (Doctor, HealthcareProfessional, Nurse, Technician)
- belongsTo User (assigned_by)

#### 8. appointment_status_history

Tracks all status changes for auditing.

```php
Schema::create('appointment_status_history', function (Blueprint $table) {
    $table->id();
    $table->foreignId('appointment_id')->constrained()->onDelete('cascade');
    $table->string('old_status');
    $table->string('new_status');
    $table->text('reason')->nullable();
    $table->foreignId('changed_by')->constrained('users')->onDelete('restrict');
    $table->string('ip_address', 45)->nullable();
    $table->text('user_agent')->nullable();
    $table->timestamp('created_at');

    // No updated_at - immutable log

    $table->index(['appointment_id', 'created_at'], 'appt_status_history_lookup');
    $table->index('changed_by');
});
```

**Relationships:**
- belongsTo Appointment
- belongsTo User (changed_by)

**Pattern**: Follows medical_history_audit_trail pattern - immutable with created_at only, captures IP and user agent.

#### 9. appointment_assignment_requests

Handles the request/approval workflow for claiming unassigned appointments.

```php
Schema::create('appointment_assignment_requests', function (Blueprint $table) {
    $table->id();
    $table->foreignId('appointment_id')->constrained()->onDelete('cascade');

    // Polymorphic relationship to requesting staff member
    $table->morphs('requestor'); // requestor_id, requestor_type

    $table->enum('requested_role', [
        'primary_consultant',
        'lead_surgeon',
        'assistant_surgeon',
        'anesthesiologist',
        'nurse',
        'technician',
        'radiologist',
        'specialist_consultant',
        'other'
    ]);
    $table->string('custom_role')->nullable();

    $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
    $table->text('request_notes')->nullable();
    $table->text('response_notes')->nullable();

    $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('restrict');
    $table->timestamp('reviewed_at')->nullable();

    $table->timestamps();

    $table->index(['appointment_id', 'status'], 'appt_request_lookup');
    $table->index(['requestor_type', 'requestor_id'], 'requestor_lookup');
});
```

**Relationships:**
- belongsTo Appointment
- morphTo Requestor (Doctor, HealthcareProfessional, Nurse, Technician)
- belongsTo User (reviewed_by)

#### 10. buffer_times

Customizable buffer times by professional, specialty, and study type.

```php
Schema::create('buffer_times', function (Blueprint $table) {
    $table->id();

    // What this buffer time applies to
    $table->enum('buffer_type', ['professional', 'specialty', 'study_type']);

    // Polymorphic relationship to professional (for professional type)
    $table->morphs('bufferable'); // bufferable_id, bufferable_type

    // Foreign keys (nullable, only one should be set based on buffer_type)
    $table->foreignId('medical_specialty_id')->nullable()->constrained()->onDelete('cascade');
    $table->foreignId('medical_study_id')->nullable()->constrained()->onDelete('cascade');

    // Buffer time in minutes
    $table->integer('buffer_minutes');

    // Priority: higher priority overrides lower (professional > specialty > study_type)
    $table->integer('priority')->default(0);

    $table->boolean('is_active')->default(true);
    $table->timestamps();

    $table->index(['buffer_type', 'bufferable_type', 'bufferable_id'], 'buffer_lookup');
    $table->index(['medical_specialty_id', 'is_active']);
    $table->index(['medical_study_id', 'is_active']);
});
```

**Relationships:**
- morphTo Bufferable (Doctor, HealthcareProfessional, Technician)
- belongsTo MedicalSpecialty (optional)
- belongsTo MedicalStudy (optional)

**Business Logic**: When calculating buffer time for an appointment, check in priority order:
1. Professional-specific buffer
2. Specialty-specific buffer
3. Study type-specific buffer
4. Default system buffer

### New Pivot Tables

#### 11. healthcare_professional_health_center

```php
Schema::create('healthcare_professional_health_center', function (Blueprint $table) {
    $table->id();
    $table->foreignId('healthcare_professional_id')->constrained()->onDelete('cascade');
    $table->foreignId('health_center_id')->constrained()->onDelete('cascade');
    $table->timestamps();

    $table->unique(['healthcare_professional_id', 'health_center_id'], 'hc_prof_hc_unique');
});
```

#### 12. healthcare_professional_department

```php
Schema::create('healthcare_professional_department', function (Blueprint $table) {
    $table->id();
    $table->foreignId('healthcare_professional_id')->constrained()->onDelete('cascade');
    $table->foreignId('department_id')->constrained()->onDelete('cascade');
    $table->boolean('is_head')->default(false);
    $table->timestamps();

    $table->unique(['healthcare_professional_id', 'department_id'], 'hc_prof_dept_unique');
});
```

#### 13. nurse_health_center

```php
Schema::create('nurse_health_center', function (Blueprint $table) {
    $table->id();
    $table->foreignId('nurse_id')->constrained()->onDelete('cascade');
    $table->foreignId('health_center_id')->constrained()->onDelete('cascade');
    $table->timestamps();

    $table->unique(['nurse_id', 'health_center_id']);
});
```

#### 14. nurse_department

```php
Schema::create('nurse_department', function (Blueprint $table) {
    $table->id();
    $table->foreignId('nurse_id')->constrained()->onDelete('cascade');
    $table->foreignId('department_id')->constrained()->onDelete('cascade');
    $table->timestamps();

    $table->unique(['nurse_id', 'department_id']);
});
```

### Modified Existing Tables

**No breaking changes to existing tables.** The current `appointments` and `doctor_schedules` tables will remain as historical data. New appointments will use the new `appointments` table, and new schedules will use `professional_schedules`.

**Migration Strategy:**
- Create all new tables
- Do NOT drop old tables (preserve historical data)
- New code will use new tables
- Optional: Create read-only views for backward compatibility

## Implementation Approach

### Strategy

**Phased Implementation** with the following principles:
1. **Database First**: Create all tables and relationships before business logic
2. **Bottom-Up**: Start with foundational models (professionals, schedules) before complex features (appointments, assignments)
3. **Testing at Each Phase**: Each phase must pass automated tests before proceeding
4. **Seeders for Development**: Create comprehensive seeders to populate test data
5. **No Frontend Changes**: Backend only, frontend integration is future work

### Key Technical Decisions

**1. Polymorphic Relationships**: Use Laravel's morphTo/morphMany for:
- Schedules (schedulable: Doctor/HealthcareProfessional/Nurse)
- Appointment staff (staffable: Doctor/HealthcareProfessional/Nurse/Technician)
- Schedule exceptions (exceptionable: Doctor/HealthcareProfessional)
- Buffer times (bufferable: Doctor/HealthcareProfessional/Technician)
- Assignment requests (requestor: Doctor/HealthcareProfessional/Nurse/Technician)

**2. Enum Constraints**: Use database enums for:
- appointment_type, status
- recurrence_type, exception_type
- role, assignment_status
- buffer_type
- All constrained choice fields

**3. Audit Trail Pattern**: Apply medical_history_audit_trail pattern to appointments:
- Immutable status history table
- Model boot events for automatic tracking
- IP address and user agent capture

**4. Soft Deletes**: Apply to appointments only (following existing pattern)

**5. Conflict Detection**: Business logic in service classes, not database constraints:
- Check for overlapping appointments when booking
- Check for simultaneous schedules at different health centers
- Check for schedules during exception periods

## Implementation Phases

### Phase 1: Foundation - Professional Models & Health Center Relationships

**Objective**: Create the new professional type models and establish their relationships with health centers and departments.

#### Changes Required

##### 1.1 Create HealthcareProfessional Model & Migration

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_healthcare_professionals_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('healthcare_professionals', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->enum('professional_type', [
                'kinesiologist',
                'psychologist',
                'nutritionist',
                'physiotherapist',
                'other'
            ]);
            $table->string('license_number')->nullable();
            $table->date('license_expiry')->nullable();
            $table->text('certifications')->nullable();
            $table->decimal('consultation_fee', 10, 2)->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('biography')->nullable();
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_phone_number')->nullable();
            $table->timestamps();

            $table->index(['professional_type', 'is_active']);
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('healthcare_professionals');
    }
};
```

**Model**: `app/Models/HealthcareProfessional.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class HealthcareProfessional extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'professional_type',
        'license_number',
        'license_expiry',
        'certifications',
        'consultation_fee',
        'is_active',
        'biography',
        'emergency_contact_name',
        'emergency_phone_number',
    ];

    protected $casts = [
        'license_expiry' => 'date',
        'consultation_fee' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function healthCenters()
    {
        return $this->belongsToMany(HealthCenter::class, 'healthcare_professional_health_center');
    }

    public function departments()
    {
        return $this->belongsToMany(Department::class, 'healthcare_professional_department')
            ->withPivot('is_head')
            ->withTimestamps();
    }

    public function schedules()
    {
        return $this->morphMany(ProfessionalSchedule::class, 'schedulable');
    }

    public function appointments()
    {
        return $this->morphMany(AppointmentStaff::class, 'staffable');
    }

    public function bufferTimes()
    {
        return $this->morphMany(BufferTime::class, 'bufferable');
    }
}
```

##### 1.2 Create Nurse Model & Migration

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_nurses_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('nurses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('license_number');
            $table->date('license_expiry')->nullable();
            $table->text('certifications')->nullable();
            $table->boolean('is_active')->default(true);
            $table->string('emergency_contact_name')->nullable();
            $table->string('emergency_phone_number')->nullable();
            $table->timestamps();

            $table->index('is_active');
            $table->unique('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nurses');
    }
};
```

**Model**: `app/Models/Nurse.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Nurse extends Model
{
    use HasFactory;

    protected $fillable = [
        'user_id',
        'license_number',
        'license_expiry',
        'certifications',
        'is_active',
        'emergency_contact_name',
        'emergency_phone_number',
    ];

    protected $casts = [
        'license_expiry' => 'date',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function healthCenters()
    {
        return $this->belongsToMany(HealthCenter::class, 'nurse_health_center');
    }

    public function departments()
    {
        return $this->belongsToMany(Department::class, 'nurse_department');
    }

    public function appointments()
    {
        return $this->morphMany(AppointmentStaff::class, 'staffable');
    }
}
```

##### 1.3 Create Pivot Tables

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_professional_pivot_tables.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Healthcare Professional - Health Center
        Schema::create('healthcare_professional_health_center', function (Blueprint $table) {
            $table->id();
            $table->foreignId('healthcare_professional_id')->constrained()->onDelete('cascade');
            $table->foreignId('health_center_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(
                ['healthcare_professional_id', 'health_center_id'],
                'hc_prof_hc_unique'
            );
        });

        // Healthcare Professional - Department
        Schema::create('healthcare_professional_department', function (Blueprint $table) {
            $table->id();
            $table->foreignId('healthcare_professional_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->boolean('is_head')->default(false);
            $table->timestamps();

            $table->unique(
                ['healthcare_professional_id', 'department_id'],
                'hc_prof_dept_unique'
            );
        });

        // Nurse - Health Center
        Schema::create('nurse_health_center', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nurse_id')->constrained()->onDelete('cascade');
            $table->foreignId('health_center_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['nurse_id', 'health_center_id']);
        });

        // Nurse - Department
        Schema::create('nurse_department', function (Blueprint $table) {
            $table->id();
            $table->foreignId('nurse_id')->constrained()->onDelete('cascade');
            $table->foreignId('department_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(['nurse_id', 'department_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('nurse_department');
        Schema::dropIfExists('nurse_health_center');
        Schema::dropIfExists('healthcare_professional_department');
        Schema::dropIfExists('healthcare_professional_health_center');
    }
};
```

##### 1.4 Create Seeders

**Seeder**: `database/seeders/HealthcareProfessionalSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\HealthcareProfessional;
use App\Models\User;
use App\Models\HealthCenter;
use App\Models\Department;
use Illuminate\Database\Seeder;

class HealthcareProfessionalSeeder extends Seeder
{
    public function run(): void
    {
        $types = ['kinesiologist', 'psychologist', 'nutritionist', 'physiotherapist'];
        $healthCenters = HealthCenter::all();
        $departments = Department::all();

        foreach ($types as $type) {
            for ($i = 1; $i <= 3; $i++) {
                $user = User::create([
                    'name' => ucfirst($type) . ' ' . $i,
                    'email' => strtolower($type) . $i . '@preclinic.com',
                    'password' => bcrypt('password'),
                    'email_verified_at' => now(),
                ]);

                $professional = HealthcareProfessional::create([
                    'user_id' => $user->id,
                    'professional_type' => $type,
                    'license_number' => 'LIC-' . strtoupper(substr($type, 0, 3)) . '-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                    'license_expiry' => now()->addYears(2),
                    'consultation_fee' => rand(50, 150),
                    'is_active' => true,
                    'biography' => "Experienced $type with expertise in patient care.",
                ]);

                // Attach to random health centers
                $professional->healthCenters()->attach(
                    $healthCenters->random(rand(1, 2))->pluck('id')
                );

                // Attach to random departments
                $professional->departments()->attach(
                    $departments->random(rand(1, 2))->pluck('id')
                );
            }
        }
    }
}
```

**Seeder**: `database/seeders/NurseSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\Nurse;
use App\Models\User;
use App\Models\HealthCenter;
use App\Models\Department;
use Illuminate\Database\Seeder;

class NurseSeeder extends Seeder
{
    public function run(): void
    {
        $healthCenters = HealthCenter::all();
        $departments = Department::all();

        for ($i = 1; $i <= 10; $i++) {
            $user = User::create([
                'name' => 'Nurse ' . $i,
                'email' => 'nurse' . $i . '@preclinic.com',
                'password' => bcrypt('password'),
                'email_verified_at' => now(),
            ]);

            $nurse = Nurse::create([
                'user_id' => $user->id,
                'license_number' => 'LIC-NRS-' . str_pad($i, 4, '0', STR_PAD_LEFT),
                'license_expiry' => now()->addYears(2),
                'is_active' => true,
            ]);

            // Attach to random health centers
            $nurse->healthCenters()->attach(
                $healthCenters->random(rand(1, 3))->pluck('id')
            );

            // Attach to random departments
            $nurse->departments()->attach(
                $departments->random(rand(1, 3))->pluck('id')
            );
        }
    }
}
```

#### Success Criteria

##### Automated Verification:
- [x] Migrations run successfully: `docker exec -it preclinic-app php artisan migrate`
- [x] Models exist and are importable
- [x] Seeders run without errors: `docker exec -it preclinic-app php artisan db:seed --class=HealthcareProfessionalSeeder`
- [x] Seeders run without errors: `docker exec -it preclinic-app php artisan db:seed --class=NurseSeeder`
- [x] Relationships work correctly (test in tinker):
  ```
  $prof = App\Models\HealthcareProfessional::first()
  $prof->user
  $prof->healthCenters
  $prof->departments
  ```

##### Manual Verification:
- [ ] Database tables created with correct schema
- [ ] Foreign keys and indexes created
- [ ] Seeded data appears in database

---

### Phase 2: Advanced Scheduling System

**Objective**: Implement the flexible schedule system with recurrence patterns, exceptions, and specialty selection.

#### Changes Required

##### 2.1 Create ProfessionalSchedule Model & Migration

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_professional_schedules_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('professional_schedules', function (Blueprint $table) {
            $table->id();

            // Polymorphic relationship to professional
            $table->morphs('schedulable'); // schedulable_id, schedulable_type

            $table->foreignId('health_center_id')->constrained()->onDelete('restrict');
            $table->foreignId('department_id')->constrained()->onDelete('restrict');

            // Basic time block
            $table->enum('day_of_week', [
                'monday', 'tuesday', 'wednesday', 'thursday',
                'friday', 'saturday', 'sunday'
            ]);
            $table->time('start_time');
            $table->time('end_time');

            // Recurrence pattern
            $table->enum('recurrence_type', ['weekly', 'biweekly'])->default('weekly');
            $table->date('recurrence_start_date')->nullable();

            // Date range validity
            $table->date('valid_from')->nullable();
            $table->date('valid_to')->nullable();

            // Availability flag
            $table->boolean('is_active')->default(true);

            // Tracking
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('restrict');

            $table->timestamps();

            // Indexes for performance
            $table->index(
                ['schedulable_type', 'schedulable_id', 'day_of_week', 'is_active'],
                'prof_sched_lookup'
            );
            $table->index(['health_center_id', 'department_id', 'day_of_week'], 'prof_sched_location');
            $table->index(['valid_from', 'valid_to'], 'prof_sched_validity');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('professional_schedules');
    }
};
```

**Model**: `app/Models/ProfessionalSchedule.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProfessionalSchedule extends Model
{
    use HasFactory;

    protected $fillable = [
        'schedulable_id',
        'schedulable_type',
        'health_center_id',
        'department_id',
        'day_of_week',
        'start_time',
        'end_time',
        'recurrence_type',
        'recurrence_start_date',
        'valid_from',
        'valid_to',
        'is_active',
        'created_by',
        'updated_by',
    ];

    protected $casts = [
        'recurrence_start_date' => 'date',
        'valid_from' => 'date',
        'valid_to' => 'date',
        'is_active' => 'boolean',
    ];

    // Relationships
    public function schedulable()
    {
        return $this->morphTo();
    }

    public function healthCenter()
    {
        return $this->belongsTo(HealthCenter::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function specialties()
    {
        return $this->belongsToMany(
            MedicalSpecialty::class,
            'schedule_specialties',
            'professional_schedule_id',
            'medical_specialty_id'
        );
    }

    public function exceptions()
    {
        return $this->hasMany(ScheduleException::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    // Boot events for auto-tracking
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($schedule) {
            if (auth()->check()) {
                $schedule->created_by = auth()->id();
            }
        });

        static::updating(function ($schedule) {
            if (auth()->check()) {
                $schedule->updated_by = auth()->id();
            }
        });
    }

    // Business logic methods
    public function isValidOnDate(\DateTime $date): bool
    {
        // Check if date is within valid range
        if ($this->valid_from && $date < $this->valid_from) {
            return false;
        }

        if ($this->valid_to && $date > $this->valid_to) {
            return false;
        }

        // Check day of week matches
        $dayName = strtolower($date->format('l'));
        if ($dayName !== $this->day_of_week) {
            return false;
        }

        // Check biweekly pattern
        if ($this->recurrence_type === 'biweekly' && $this->recurrence_start_date) {
            $daysDiff = $date->diff($this->recurrence_start_date)->days;
            if ($daysDiff % 14 !== 0) {
                return false;
            }
        }

        return true;
    }

    public function hasExceptionOnDate(\DateTime $date): bool
    {
        $dateString = $date->format('Y-m-d');

        return $this->exceptions()
            ->where('exception_date', $dateString)
            ->exists();
    }
}
```

##### 2.2 Create Schedule Specialties Pivot Table

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_schedule_specialties_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_specialties', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_schedule_id')->constrained()->onDelete('cascade');
            $table->foreignId('medical_specialty_id')->constrained()->onDelete('cascade');
            $table->timestamps();

            $table->unique(
                ['professional_schedule_id', 'medical_specialty_id'],
                'sched_spec_unique'
            );
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_specialties');
    }
};
```

##### 2.3 Create Schedule Exceptions Model & Migration

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_schedule_exceptions_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('schedule_exceptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('professional_schedule_id')->nullable()->constrained()->onDelete('cascade');

            // Polymorphic relationship to professional (for vacation days not tied to specific schedule)
            $table->morphs('exceptionable'); // exceptionable_id, exceptionable_type

            $table->enum('exception_type', ['vacation', 'holiday', 'override', 'unavailable']);
            $table->date('exception_date');

            // For override type: new time block
            $table->time('override_start_time')->nullable();
            $table->time('override_end_time')->nullable();

            $table->text('reason')->nullable();
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->timestamps();

            $table->index(
                ['exceptionable_type', 'exceptionable_id', 'exception_date'],
                'sched_exc_lookup'
            );
            $table->index('exception_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('schedule_exceptions');
    }
};
```

**Model**: `app/Models/ScheduleException.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ScheduleException extends Model
{
    use HasFactory;

    protected $fillable = [
        'professional_schedule_id',
        'exceptionable_id',
        'exceptionable_type',
        'exception_type',
        'exception_date',
        'override_start_time',
        'override_end_time',
        'reason',
        'created_by',
    ];

    protected $casts = [
        'exception_date' => 'date',
    ];

    // Relationships
    public function professionalSchedule()
    {
        return $this->belongsTo(ProfessionalSchedule::class);
    }

    public function exceptionable()
    {
        return $this->morphTo();
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Boot events
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($exception) {
            if (auth()->check()) {
                $exception->created_by = auth()->id();
            }
        });
    }
}
```

##### 2.4 Update Professional Models with Schedule Relationship

Add to `Doctor.php`:
```php
public function professionalSchedules()
{
    return $this->morphMany(ProfessionalSchedule::class, 'schedulable');
}

public function scheduleExceptions()
{
    return $this->morphMany(ScheduleException::class, 'exceptionable');
}
```

Similar additions to `HealthcareProfessional.php` and `Nurse.php` (if nurses have schedules).

##### 2.5 Create Seeder

**Seeder**: `database/seeders/ProfessionalScheduleSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\Doctor;
use App\Models\HealthcareProfessional;
use App\Models\ProfessionalSchedule;
use App\Models\ScheduleException;
use App\Models\MedicalSpecialty;
use App\Models\Department;
use Illuminate\Database\Seeder;

class ProfessionalScheduleSeeder extends Seeder
{
    public function run(): void
    {
        $this->seedDoctorSchedules();
        $this->seedHealthcareProfessionalSchedules();
        $this->seedScheduleExceptions();
    }

    private function seedDoctorSchedules(): void
    {
        $doctors = Doctor::with(['healthCenters', 'departments', 'medicalSpecialties'])->get();
        $workdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        $timeSlots = [
            ['start' => '08:00:00', 'end' => '12:00:00'],
            ['start' => '13:00:00', 'end' => '17:00:00'],
            ['start' => '09:00:00', 'end' => '13:00:00'],
            ['start' => '14:00:00', 'end' => '18:00:00']
        ];

        foreach ($doctors as $doctor) {
            if ($doctor->healthCenters->isEmpty() || $doctor->departments->isEmpty()) {
                continue;
            }

            $selectedDays = array_rand(array_flip($workdays), rand(3, 5));
            $selectedDays = is_array($selectedDays) ? $selectedDays : [$selectedDays];

            foreach ($selectedDays as $day) {
                $slot = $timeSlots[array_rand($timeSlots)];
                $healthCenter = $doctor->healthCenters->random();
                $department = $doctor->departments->random();

                $schedule = ProfessionalSchedule::create([
                    'schedulable_id' => $doctor->id,
                    'schedulable_type' => Doctor::class,
                    'health_center_id' => $healthCenter->id,
                    'department_id' => $department->id,
                    'day_of_week' => $day,
                    'start_time' => $slot['start'],
                    'end_time' => $slot['end'],
                    'recurrence_type' => rand(0, 10) > 8 ? 'biweekly' : 'weekly',
                    'recurrence_start_date' => rand(0, 10) > 8 ? now() : null,
                    'valid_from' => rand(0, 10) > 7 ? now() : null,
                    'valid_to' => rand(0, 10) > 7 ? now()->addMonths(6) : null,
                    'is_active' => true,
                    'created_by' => 1,
                ]);

                // Attach specialties
                if ($doctor->medicalSpecialties->isNotEmpty()) {
                    $specialties = $doctor->medicalSpecialties->random(rand(1, min(2, $doctor->medicalSpecialties->count())));
                    $schedule->specialties()->attach($specialties->pluck('id'));
                }
            }
        }
    }

    private function seedHealthcareProfessionalSchedules(): void
    {
        $professionals = HealthcareProfessional::with(['healthCenters', 'departments'])->get();
        $workdays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday'];
        $timeSlots = [
            ['start' => '09:00:00', 'end' => '13:00:00'],
            ['start' => '14:00:00', 'end' => '18:00:00']
        ];

        foreach ($professionals as $professional) {
            if ($professional->healthCenters->isEmpty() || $professional->departments->isEmpty()) {
                continue;
            }

            $selectedDays = array_rand(array_flip($workdays), rand(2, 4));
            $selectedDays = is_array($selectedDays) ? $selectedDays : [$selectedDays];

            foreach ($selectedDays as $day) {
                $slot = $timeSlots[array_rand($timeSlots)];
                $healthCenter = $professional->healthCenters->random();
                $department = $professional->departments->random();

                ProfessionalSchedule::create([
                    'schedulable_id' => $professional->id,
                    'schedulable_type' => HealthcareProfessional::class,
                    'health_center_id' => $healthCenter->id,
                    'department_id' => $department->id,
                    'day_of_week' => $day,
                    'start_time' => $slot['start'],
                    'end_time' => $slot['end'],
                    'recurrence_type' => 'weekly',
                    'is_active' => true,
                    'created_by' => 1,
                ]);
            }
        }
    }

    private function seedScheduleExceptions(): void
    {
        $schedules = ProfessionalSchedule::limit(20)->get();

        foreach ($schedules->random(10) as $schedule) {
            // Vacation day
            ScheduleException::create([
                'professional_schedule_id' => $schedule->id,
                'exceptionable_id' => $schedule->schedulable_id,
                'exceptionable_type' => $schedule->schedulable_type,
                'exception_type' => 'vacation',
                'exception_date' => now()->addDays(rand(30, 90)),
                'reason' => 'Personal vacation',
                'created_by' => 1,
            ]);
        }

        // Holiday (affects all professionals)
        $doctors = Doctor::limit(5)->get();
        foreach ($doctors as $doctor) {
            ScheduleException::create([
                'exceptionable_id' => $doctor->id,
                'exceptionable_type' => Doctor::class,
                'exception_type' => 'holiday',
                'exception_date' => now()->addMonths(2)->setDay(25), // Christmas or similar
                'reason' => 'National Holiday',
                'created_by' => 1,
            ]);
        }
    }
}
```

#### Success Criteria

##### Automated Verification:
- [ ] Migrations run successfully: `docker exec -it preclinic-app php artisan migrate`
- [ ] Polymorphic relationships work in tinker:
  ```
  $sched = App\Models\ProfessionalSchedule::first()
  $sched->schedulable  // Returns Doctor or HealthcareProfessional
  ```
- [ ] Seeder runs successfully: `docker exec -it preclinic-app php artisan db:seed --class=ProfessionalScheduleSeeder`
- [ ] Business logic methods work:
  ```
  $sched = App\Models\ProfessionalSchedule::first()
  $sched->isValidOnDate(new DateTime('2026-02-10'))
  ```

##### Manual Verification:
- [ ] Schedules created with various recurrence patterns
- [ ] Schedule exceptions created
- [ ] Specialties attached to schedules
- [ ] Polymorphic relationships correctly reference doctors and healthcare professionals

---

### Phase 3: New Appointment System

**Objective**: Create the comprehensive appointment system with multiple types, multi-staff assignments, and status tracking.

#### Changes Required

##### 3.1 Create Appointments Table

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_new_appointments_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointments', function (Blueprint $table) {
            $table->id();

            // Patient
            $table->foreignId('patient_id')->constrained()->onDelete('cascade');

            // Location
            $table->foreignId('health_center_id')->constrained()->onDelete('restrict');
            $table->foreignId('department_id')->nullable()->constrained()->onDelete('restrict');

            // Appointment type and related entity
            $table->enum('appointment_type', ['consultation', 'study', 'procedure']);
            $table->foreignId('medical_study_id')->nullable()->constrained()->onDelete('restrict');
            $table->foreignId('medical_specialty_id')->nullable()->constrained()->onDelete('restrict');

            // Scheduling
            $table->dateTime('appointment_date');
            $table->integer('duration_minutes')->default(30);
            $table->integer('buffer_minutes')->default(0);

            // Status
            $table->enum('status', [
                'draft',
                'pending',
                'scheduled',
                'confirmed',
                'in_progress',
                'completed',
                'cancelled',
                'no_show'
            ])->default('draft');

            // Details
            $table->text('reason')->nullable();
            $table->text('notes')->nullable();
            $table->text('cancellation_reason')->nullable();

            // Visibility
            $table->boolean('visible_to_patients')->default(true);

            // Tracking
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->onDelete('restrict');

            $table->timestamps();
            $table->softDeletes();

            // Indexes
            $table->index(['patient_id', 'appointment_date', 'status'], 'appt_patient_lookup');
            $table->index(['health_center_id', 'appointment_date'], 'appt_location_date');
            $table->index(['appointment_type', 'medical_study_id'], 'appt_study_lookup');
            $table->index(['status', 'visible_to_patients'], 'appt_visibility');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointments');
    }
};
```

**Model**: `app/Models/NewAppointment.php` (will replace old Appointment model later)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class NewAppointment extends Model
{
    use HasFactory, SoftDeletes;

    protected $table = 'appointments'; // Will use new appointments table

    protected $fillable = [
        'patient_id',
        'health_center_id',
        'department_id',
        'appointment_type',
        'medical_study_id',
        'medical_specialty_id',
        'appointment_date',
        'duration_minutes',
        'buffer_minutes',
        'status',
        'reason',
        'notes',
        'cancellation_reason',
        'visible_to_patients',
        'created_by',
        'updated_by',
        'deleted_by',
    ];

    protected $casts = [
        'appointment_date' => 'datetime',
        'visible_to_patients' => 'boolean',
        'deleted_at' => 'datetime',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function healthCenter()
    {
        return $this->belongsTo(HealthCenter::class);
    }

    public function department()
    {
        return $this->belongsTo(Department::class);
    }

    public function medicalStudy()
    {
        return $this->belongsTo(MedicalStudy::class);
    }

    public function medicalSpecialty()
    {
        return $this->belongsTo(MedicalSpecialty::class);
    }

    public function staff()
    {
        return $this->hasMany(AppointmentStaff::class);
    }

    public function statusHistory()
    {
        return $this->hasMany(AppointmentStatusHistory::class);
    }

    public function assignmentRequests()
    {
        return $this->hasMany(AppointmentAssignmentRequest::class);
    }

    public function creator()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function updater()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    // Boot events
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($appointment) {
            if (auth()->check()) {
                $appointment->created_by = auth()->id();
            }
        });

        static::updating(function ($appointment) {
            if (auth()->check()) {
                $appointment->updated_by = auth()->id();
            }

            // Track status changes
            if ($appointment->isDirty('status')) {
                AppointmentStatusHistory::create([
                    'appointment_id' => $appointment->id,
                    'old_status' => $appointment->getOriginal('status'),
                    'new_status' => $appointment->status,
                    'changed_by' => auth()->id(),
                    'ip_address' => request()->ip(),
                    'user_agent' => request()->userAgent(),
                ]);
            }
        });

        static::deleting(function ($appointment) {
            if ($appointment->isForceDeleting()) {
                return;
            }
            if (auth()->check()) {
                $appointment->deleted_by = auth()->id();
                $appointment->save();
            }
        });
    }
}
```

##### 3.2 Create Appointment Staff Table

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_appointment_staff_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_staff', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->onDelete('cascade');

            // Polymorphic relationship to staff member
            $table->morphs('staffable'); // staffable_id, staffable_type

            // Role in this appointment
            $table->enum('role', [
                'primary_consultant',
                'lead_surgeon',
                'assistant_surgeon',
                'anesthesiologist',
                'nurse',
                'technician',
                'radiologist',
                'specialist_consultant',
                'other'
            ])->default('other');

            $table->string('custom_role')->nullable();

            // Assignment tracking
            $table->enum('assignment_status', ['assigned', 'confirmed', 'declined'])->default('assigned');
            $table->foreignId('assigned_by')->constrained('users')->onDelete('restrict');
            $table->timestamp('assigned_at');
            $table->timestamp('confirmed_at')->nullable();

            $table->timestamps();

            $table->index(['appointment_id', 'staffable_type', 'staffable_id'], 'appt_staff_lookup');
            $table->index(['staffable_type', 'staffable_id'], 'staff_appointments');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_staff');
    }
};
```

**Model**: `app/Models/AppointmentStaff.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentStaff extends Model
{
    use HasFactory;

    protected $table = 'appointment_staff';

    protected $fillable = [
        'appointment_id',
        'staffable_id',
        'staffable_type',
        'role',
        'custom_role',
        'assignment_status',
        'assigned_by',
        'assigned_at',
        'confirmed_at',
    ];

    protected $casts = [
        'assigned_at' => 'datetime',
        'confirmed_at' => 'datetime',
    ];

    // Relationships
    public function appointment()
    {
        return $this->belongsTo(NewAppointment::class, 'appointment_id');
    }

    public function staffable()
    {
        return $this->morphTo();
    }

    public function assignedBy()
    {
        return $this->belongsTo(User::class, 'assigned_by');
    }

    // Boot events
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($staff) {
            if (auth()->check()) {
                $staff->assigned_by = auth()->id();
            }
            $staff->assigned_at = now();
        });
    }
}
```

##### 3.3 Create Appointment Status History Table

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_appointment_status_history_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_status_history', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->onDelete('cascade');
            $table->string('old_status');
            $table->string('new_status');
            $table->text('reason')->nullable();
            $table->foreignId('changed_by')->constrained('users')->onDelete('restrict');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->timestamp('created_at');

            $table->index(['appointment_id', 'created_at'], 'appt_status_history_lookup');
            $table->index('changed_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_status_history');
    }
};
```

**Model**: `app/Models/AppointmentStatusHistory.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentStatusHistory extends Model
{
    use HasFactory;

    const UPDATED_AT = null; // Immutable log

    protected $table = 'appointment_status_history';

    protected $fillable = [
        'appointment_id',
        'old_status',
        'new_status',
        'reason',
        'changed_by',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // Relationships
    public function appointment()
    {
        return $this->belongsTo(NewAppointment::class, 'appointment_id');
    }

    public function changedBy()
    {
        return $this->belongsTo(User::class, 'changed_by');
    }
}
```

##### 3.4 Create Appointment Assignment Requests Table

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_appointment_assignment_requests_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('appointment_assignment_requests', function (Blueprint $table) {
            $table->id();
            $table->foreignId('appointment_id')->constrained('appointments')->onDelete('cascade');

            // Polymorphic relationship to requesting staff member
            $table->morphs('requestor'); // requestor_id, requestor_type

            $table->enum('requested_role', [
                'primary_consultant',
                'lead_surgeon',
                'assistant_surgeon',
                'anesthesiologist',
                'nurse',
                'technician',
                'radiologist',
                'specialist_consultant',
                'other'
            ]);
            $table->string('custom_role')->nullable();

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('request_notes')->nullable();
            $table->text('response_notes')->nullable();

            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->timestamp('reviewed_at')->nullable();

            $table->timestamps();

            $table->index(['appointment_id', 'status'], 'appt_request_lookup');
            $table->index(['requestor_type', 'requestor_id'], 'requestor_lookup');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('appointment_assignment_requests');
    }
};
```

**Model**: `app/Models/AppointmentAssignmentRequest.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AppointmentAssignmentRequest extends Model
{
    use HasFactory;

    protected $fillable = [
        'appointment_id',
        'requestor_id',
        'requestor_type',
        'requested_role',
        'custom_role',
        'status',
        'request_notes',
        'response_notes',
        'reviewed_by',
        'reviewed_at',
    ];

    protected $casts = [
        'reviewed_at' => 'datetime',
    ];

    // Relationships
    public function appointment()
    {
        return $this->belongsTo(NewAppointment::class, 'appointment_id');
    }

    public function requestor()
    {
        return $this->morphTo();
    }

    public function reviewer()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    // Boot events
    protected static function boot()
    {
        parent::boot();

        static::updating(function ($request) {
            if ($request->isDirty('status') && $request->status !== 'pending') {
                if (auth()->check()) {
                    $request->reviewed_by = auth()->id();
                }
                $request->reviewed_at = now();
            }
        });
    }
}
```

##### 3.5 Create Seeder

**Seeder**: `database/seeders/AppointmentSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\NewAppointment;
use App\Models\AppointmentStaff;
use App\Models\Patient;
use App\Models\Doctor;
use App\Models\HealthcareProfessional;
use App\Models\Nurse;
use App\Models\Technician;
use App\Models\MedicalStudy;
use App\Models\MedicalSpecialty;
use App\Models\HealthCenter;
use App\Models\Department;
use Illuminate\Database\Seeder;

class AppointmentSeeder extends Seeder
{
    public function run(): void
    {
        $patients = Patient::limit(20)->get();
        $doctors = Doctor::with('medicalSpecialties')->get();
        $healthcareProfessionals = HealthcareProfessional::get();
        $nurses = Nurse::limit(10)->get();
        $technicians = Technician::limit(10)->get();
        $studies = MedicalStudy::get();
        $specialties = MedicalSpecialty::get();
        $healthCenters = HealthCenter::get();
        $departments = Department::get();

        // Create consultations
        foreach ($patients->random(10) as $patient) {
            $doctor = $doctors->random();
            $specialty = $doctor->medicalSpecialties->isNotEmpty()
                ? $doctor->medicalSpecialties->random()
                : $specialties->random();

            $appointment = NewAppointment::create([
                'patient_id' => $patient->id,
                'health_center_id' => $healthCenters->random()->id,
                'department_id' => $departments->random()->id,
                'appointment_type' => 'consultation',
                'medical_specialty_id' => $specialty->id,
                'appointment_date' => now()->addDays(rand(1, 30)),
                'duration_minutes' => 30,
                'buffer_minutes' => 10,
                'status' => 'scheduled',
                'reason' => 'Regular checkup',
                'visible_to_patients' => true,
                'created_by' => 1,
            ]);

            // Assign doctor
            AppointmentStaff::create([
                'appointment_id' => $appointment->id,
                'staffable_id' => $doctor->id,
                'staffable_type' => Doctor::class,
                'role' => 'primary_consultant',
                'assignment_status' => 'confirmed',
                'assigned_by' => 1,
            ]);
        }

        // Create studies
        foreach ($patients->random(5) as $patient) {
            $study = $studies->random();

            $appointment = NewAppointment::create([
                'patient_id' => $patient->id,
                'health_center_id' => $healthCenters->random()->id,
                'department_id' => $departments->random()->id,
                'appointment_type' => 'study',
                'medical_study_id' => $study->id,
                'appointment_date' => now()->addDays(rand(1, 30)),
                'duration_minutes' => 60,
                'buffer_minutes' => 20,
                'status' => 'scheduled',
                'reason' => 'Medical imaging required',
                'visible_to_patients' => true,
                'created_by' => 1,
            ]);

            // Assign technician
            if ($technicians->isNotEmpty()) {
                AppointmentStaff::create([
                    'appointment_id' => $appointment->id,
                    'staffable_id' => $technicians->random()->id,
                    'staffable_type' => Technician::class,
                    'role' => 'technician',
                    'assignment_status' => 'assigned',
                    'assigned_by' => 1,
                ]);
            }
        }

        // Create procedures with multiple staff
        foreach ($patients->random(3) as $patient) {
            $appointment = NewAppointment::create([
                'patient_id' => $patient->id,
                'health_center_id' => $healthCenters->random()->id,
                'department_id' => $departments->random()->id,
                'appointment_type' => 'procedure',
                'appointment_date' => now()->addDays(rand(7, 60)),
                'duration_minutes' => 120,
                'buffer_minutes' => 30,
                'status' => 'scheduled',
                'reason' => 'Surgical procedure',
                'visible_to_patients' => true,
                'created_by' => 1,
            ]);

            // Assign lead surgeon
            AppointmentStaff::create([
                'appointment_id' => $appointment->id,
                'staffable_id' => $doctors->random()->id,
                'staffable_type' => Doctor::class,
                'role' => 'lead_surgeon',
                'assignment_status' => 'confirmed',
                'assigned_by' => 1,
            ]);

            // Assign assisting nurse
            if ($nurses->isNotEmpty()) {
                AppointmentStaff::create([
                    'appointment_id' => $appointment->id,
                    'staffable_id' => $nurses->random()->id,
                    'staffable_type' => Nurse::class,
                    'role' => 'nurse',
                    'assignment_status' => 'assigned',
                    'assigned_by' => 1,
                ]);
            }
        }

        // Create unassigned appointment
        NewAppointment::create([
            'patient_id' => $patients->random()->id,
            'health_center_id' => $healthCenters->random()->id,
            'department_id' => $departments->random()->id,
            'appointment_type' => 'consultation',
            'medical_specialty_id' => $specialties->random()->id,
            'appointment_date' => now()->addDays(rand(1, 30)),
            'duration_minutes' => 30,
            'status' => 'pending',
            'reason' => 'Follow-up consultation',
            'visible_to_patients' => false, // Hidden until assigned
            'created_by' => 1,
        ]);
    }
}
```

#### Success Criteria

##### Automated Verification:
- [ ] Migrations run successfully: `docker exec -it preclinic-app php artisan migrate`
- [ ] All relationships work:
  ```
  $appt = App\Models\NewAppointment::first()
  $appt->patient
  $appt->staff
  $appt->statusHistory
  ```
- [ ] Polymorphic relationships for staff work:
  ```
  $staff = App\Models\AppointmentStaff::first()
  $staff->staffable  // Returns Doctor, HealthcareProfessional, Nurse, or Technician
  ```
- [ ] Status change creates history automatically:
  ```
  $appt = App\Models\NewAppointment::first()
  $appt->update(['status' => 'confirmed'])
  $appt->statusHistory()->count()  // Should be > 0
  ```
- [ ] Seeder runs successfully: `docker exec -it preclinic-app php artisan db:seed --class=AppointmentSeeder`

##### Manual Verification:
- [ ] Appointments created with all three types
- [ ] Multi-staff assignments work correctly
- [ ] Status history tracked automatically
- [ ] Unassigned appointments have correct visibility

---

### Phase 4: Buffer Times System

**Objective**: Implement customizable buffer times per professional, specialty, and study type.

#### Changes Required

##### 4.1 Create Buffer Times Table & Model

**Migration**: `database/migrations/YYYY_MM_DD_HHMMSS_create_buffer_times_table.php`

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('buffer_times', function (Blueprint $table) {
            $table->id();

            // What this buffer time applies to
            $table->enum('buffer_type', ['professional', 'specialty', 'study_type']);

            // Polymorphic relationship to professional (for professional type)
            $table->morphs('bufferable'); // bufferable_id, bufferable_type

            // Foreign keys (nullable, only one should be set based on buffer_type)
            $table->foreignId('medical_specialty_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('medical_study_id')->nullable()->constrained()->onDelete('cascade');

            // Buffer time in minutes
            $table->integer('buffer_minutes');

            // Priority: higher priority overrides lower (professional > specialty > study_type)
            $table->integer('priority')->default(0);

            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['buffer_type', 'bufferable_type', 'bufferable_id'], 'buffer_lookup');
            $table->index(['medical_specialty_id', 'is_active']);
            $table->index(['medical_study_id', 'is_active']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('buffer_times');
    }
};
```

**Model**: `app/Models/BufferTime.php`

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class BufferTime extends Model
{
    use HasFactory;

    protected $fillable = [
        'buffer_type',
        'bufferable_id',
        'bufferable_type',
        'medical_specialty_id',
        'medical_study_id',
        'buffer_minutes',
        'priority',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    // Relationships
    public function bufferable()
    {
        return $this->morphTo();
    }

    public function medicalSpecialty()
    {
        return $this->belongsTo(MedicalSpecialty::class);
    }

    public function medicalStudy()
    {
        return $this->belongsTo(MedicalStudy::class);
    }

    // Static method to calculate buffer time for an appointment
    public static function calculateBufferForAppointment(NewAppointment $appointment, $staffable): int
    {
        $bufferTimes = [];

        // 1. Check professional-specific buffer
        if ($staffable) {
            $professionalBuffer = self::where('buffer_type', 'professional')
                ->where('bufferable_id', $staffable->id)
                ->where('bufferable_type', get_class($staffable))
                ->where('is_active', true)
                ->first();

            if ($professionalBuffer) {
                $bufferTimes[] = [
                    'minutes' => $professionalBuffer->buffer_minutes,
                    'priority' => 3, // Highest priority
                ];
            }
        }

        // 2. Check specialty-specific buffer (for consultations)
        if ($appointment->appointment_type === 'consultation' && $appointment->medical_specialty_id) {
            $specialtyBuffer = self::where('buffer_type', 'specialty')
                ->where('medical_specialty_id', $appointment->medical_specialty_id)
                ->where('is_active', true)
                ->first();

            if ($specialtyBuffer) {
                $bufferTimes[] = [
                    'minutes' => $specialtyBuffer->buffer_minutes,
                    'priority' => 2,
                ];
            }
        }

        // 3. Check study type-specific buffer (for studies/procedures)
        if (in_array($appointment->appointment_type, ['study', 'procedure']) && $appointment->medical_study_id) {
            $studyBuffer = self::where('buffer_type', 'study_type')
                ->where('medical_study_id', $appointment->medical_study_id)
                ->where('is_active', true)
                ->first();

            if ($studyBuffer) {
                $bufferTimes[] = [
                    'minutes' => $studyBuffer->buffer_minutes,
                    'priority' => 1,
                ];
            }
        }

        // Return highest priority buffer, or 0 if none found
        if (empty($bufferTimes)) {
            return 0;
        }

        usort($bufferTimes, function ($a, $b) {
            return $b['priority'] - $a['priority'];
        });

        return $bufferTimes[0]['minutes'];
    }
}
```

##### 4.2 Update Professional Models

Add to `Doctor.php`, `HealthcareProfessional.php`, and `Technician.php`:

```php
public function bufferTimes()
{
    return $this->morphMany(BufferTime::class, 'bufferable');
}
```

##### 4.3 Create Seeder

**Seeder**: `database/seeders/BufferTimeSeeder.php`

```php
<?php

namespace Database\Seeders;

use App\Models\BufferTime;
use App\Models\Doctor;
use App\Models\MedicalSpecialty;
use App\Models\MedicalStudy;
use Illuminate\Database\Seeder;

class BufferTimeSeeder extends Seeder
{
    public function run(): void
    {
        // Professional-specific buffers
        $doctors = Doctor::limit(5)->get();
        foreach ($doctors as $doctor) {
            BufferTime::create([
                'buffer_type' => 'professional',
                'bufferable_id' => $doctor->id,
                'bufferable_type' => Doctor::class,
                'buffer_minutes' => rand(10, 30),
                'priority' => 3,
                'is_active' => true,
            ]);
        }

        // Specialty-specific buffers
        $specialties = MedicalSpecialty::limit(5)->get();
        foreach ($specialties as $specialty) {
            BufferTime::create([
                'buffer_type' => 'specialty',
                'medical_specialty_id' => $specialty->id,
                'buffer_minutes' => 15,
                'priority' => 2,
                'is_active' => true,
            ]);
        }

        // Study type-specific buffers
        $studies = MedicalStudy::limit(5)->get();
        foreach ($studies as $study) {
            BufferTime::create([
                'buffer_type' => 'study_type',
                'medical_study_id' => $study->id,
                'buffer_minutes' => 20,
                'priority' => 1,
                'is_active' => true,
            ]);
        }
    }
}
```

#### Success Criteria

##### Automated Verification:
- [ ] Migration runs successfully: `docker exec -it preclinic-app php artisan migrate`
- [ ] Buffer calculation works:
  ```
  $appt = App\Models\NewAppointment::first()
  $staff = $appt->staff->first()->staffable
  App\Models\BufferTime::calculateBufferForAppointment($appt, $staff)
  ```
- [ ] Seeder runs successfully: `docker exec -it preclinic-app php artisan db:seed --class=BufferTimeSeeder`

##### Manual Verification:
- [ ] Buffer times created for all three types
- [ ] Priority calculation returns highest priority buffer
- [ ] Polymorphic relationships work correctly

---

### Phase 5: Business Logic & Service Classes

**Objective**: Implement conflict detection, appointment booking logic, and assignment workflows.

#### Changes Required

##### 5.1 Create AppointmentService

**Service**: `app/Services/AppointmentService.php`

```php
<?php

namespace App\Services;

use App\Models\NewAppointment;
use App\Models\AppointmentStaff;
use App\Models\ProfessionalSchedule;
use App\Models\BufferTime;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class AppointmentService
{
    /**
     * Check if a professional is available at the requested time
     */
    public function checkAvailability(
        $professional,
        Carbon $appointmentDate,
        int $durationMinutes,
        int $bufferMinutes = 0,
        ?int $excludeAppointmentId = null
    ): array {
        $errors = [];

        // 1. Check if there's a schedule for this day/time
        $hasSchedule = $this->hasScheduleForDateTime($professional, $appointmentDate);
        if (!$hasSchedule) {
            $errors[] = 'Professional does not have a schedule for this date/time';
        }

        // 2. Check for schedule exceptions
        $hasException = $this->hasScheduleException($professional, $appointmentDate);
        if ($hasException) {
            $errors[] = 'Professional has a schedule exception on this date';
        }

        // 3. Check for overlapping appointments
        $hasOverlap = $this->hasOverlappingAppointment(
            $professional,
            $appointmentDate,
            $durationMinutes,
            $bufferMinutes,
            $excludeAppointmentId
        );
        if ($hasOverlap) {
            $errors[] = 'Professional has an overlapping appointment';
        }

        // 4. Check for simultaneous appointments at different health centers
        $hasDifferentLocation = $this->hasSimultaneousAppointmentAtDifferentLocation(
            $professional,
            $appointmentDate,
            $durationMinutes,
            $excludeAppointmentId
        );
        if ($hasDifferentLocation) {
            $errors[] = 'Professional has a simultaneous appointment at a different health center';
        }

        return [
            'available' => empty($errors),
            'errors' => $errors,
        ];
    }

    /**
     * Book an appointment
     */
    public function bookAppointment(array $data): NewAppointment
    {
        return DB::transaction(function () use ($data) {
            // Calculate buffer time if not provided
            if (!isset($data['buffer_minutes']) && isset($data['primary_staff'])) {
                $data['buffer_minutes'] = BufferTime::calculateBufferForAppointment(
                    (object) $data, // Pass as object for compatibility
                    $data['primary_staff']
                );
            }

            // Create appointment
            $appointment = NewAppointment::create([
                'patient_id' => $data['patient_id'],
                'health_center_id' => $data['health_center_id'],
                'department_id' => $data['department_id'] ?? null,
                'appointment_type' => $data['appointment_type'],
                'medical_study_id' => $data['medical_study_id'] ?? null,
                'medical_specialty_id' => $data['medical_specialty_id'] ?? null,
                'appointment_date' => $data['appointment_date'],
                'duration_minutes' => $data['duration_minutes'],
                'buffer_minutes' => $data['buffer_minutes'] ?? 0,
                'status' => $data['status'] ?? 'draft',
                'reason' => $data['reason'] ?? null,
                'notes' => $data['notes'] ?? null,
                'visible_to_patients' => $data['visible_to_patients'] ?? true,
            ]);

            // Assign primary staff if provided
            if (isset($data['primary_staff'])) {
                AppointmentStaff::create([
                    'appointment_id' => $appointment->id,
                    'staffable_id' => $data['primary_staff']->id,
                    'staffable_type' => get_class($data['primary_staff']),
                    'role' => $data['primary_role'] ?? 'primary_consultant',
                    'assignment_status' => 'assigned',
                ]);
            }

            return $appointment->fresh(['staff', 'patient', 'healthCenter']);
        });
    }

    /**
     * Check if professional has a schedule for the given date/time
     */
    private function hasScheduleForDateTime($professional, Carbon $appointmentDate): bool
    {
        $dayOfWeek = strtolower($appointmentDate->format('l'));
        $time = $appointmentDate->format('H:i:s');

        $schedules = ProfessionalSchedule::where('schedulable_id', $professional->id)
            ->where('schedulable_type', get_class($professional))
            ->where('day_of_week', $dayOfWeek)
            ->where('is_active', true)
            ->get();

        foreach ($schedules as $schedule) {
            // Check if schedule is valid for this date
            if (!$schedule->isValidOnDate($appointmentDate)) {
                continue;
            }

            // Check if time falls within schedule
            if ($time >= $schedule->start_time && $time < $schedule->end_time) {
                // Check for exceptions
                if (!$schedule->hasExceptionOnDate($appointmentDate)) {
                    return true;
                }
            }
        }

        return false;
    }

    /**
     * Check if professional has a schedule exception on this date
     */
    private function hasScheduleException($professional, Carbon $appointmentDate): bool
    {
        return DB::table('schedule_exceptions')
            ->where('exceptionable_id', $professional->id)
            ->where('exceptionable_type', get_class($professional))
            ->where('exception_date', $appointmentDate->format('Y-m-d'))
            ->whereIn('exception_type', ['vacation', 'unavailable'])
            ->exists();
    }

    /**
     * Check for overlapping appointments
     */
    private function hasOverlappingAppointment(
        $professional,
        Carbon $appointmentDate,
        int $durationMinutes,
        int $bufferMinutes,
        ?int $excludeAppointmentId
    ): bool {
        $startTime = $appointmentDate;
        $endTime = $appointmentDate->copy()->addMinutes($durationMinutes + $bufferMinutes);

        return DB::table('appointments')
            ->join('appointment_staff', 'appointments.id', '=', 'appointment_staff.appointment_id')
            ->where('appointment_staff.staffable_id', $professional->id)
            ->where('appointment_staff.staffable_type', get_class($professional))
            ->whereIn('appointments.status', ['scheduled', 'confirmed', 'in_progress'])
            ->when($excludeAppointmentId, function ($query, $id) {
                $query->where('appointments.id', '!=', $id);
            })
            ->where(function ($query) use ($startTime, $endTime) {
                $query->whereBetween('appointments.appointment_date', [$startTime, $endTime])
                    ->orWhere(function ($q) use ($startTime, $endTime) {
                        $q->where('appointments.appointment_date', '<=', $startTime)
                          ->whereRaw('DATE_ADD(appointments.appointment_date, INTERVAL (appointments.duration_minutes + appointments.buffer_minutes) MINUTE) > ?', [$startTime]);
                    });
            })
            ->exists();
    }

    /**
     * Check for simultaneous appointments at different health centers
     */
    private function hasSimultaneousAppointmentAtDifferentLocation(
        $professional,
        Carbon $appointmentDate,
        int $durationMinutes,
        ?int $excludeAppointmentId
    ): bool {
        // This checks if the professional has ANY appointment at the same time
        // Even at different health centers, which is physically impossible

        $startTime = $appointmentDate;
        $endTime = $appointmentDate->copy()->addMinutes($durationMinutes);

        $existingAppointments = DB::table('appointments')
            ->join('appointment_staff', 'appointments.id', '=', 'appointment_staff.appointment_id')
            ->where('appointment_staff.staffable_id', $professional->id)
            ->where('appointment_staff.staffable_type', get_class($professional))
            ->whereIn('appointments.status', ['scheduled', 'confirmed', 'in_progress'])
            ->when($excludeAppointmentId, function ($query, $id) {
                $query->where('appointments.id', '!=', $id);
            })
            ->where(function ($query) use ($startTime, $endTime) {
                $query->whereBetween('appointments.appointment_date', [$startTime, $endTime])
                    ->orWhere(function ($q) use ($startTime, $endTime) {
                        $q->where('appointments.appointment_date', '<=', $startTime)
                          ->whereRaw('DATE_ADD(appointments.appointment_date, INTERVAL appointments.duration_minutes MINUTE) > ?', [$startTime]);
                    });
            })
            ->count();

        return $existingAppointments > 0;
    }
}
```

##### 5.2 Create Tests

**Test**: `tests/Unit/Services/AppointmentServiceTest.php`

```php
<?php

namespace Tests\Unit\Services;

use Tests\TestCase;
use App\Services\AppointmentService;
use App\Models\Doctor;
use App\Models\ProfessionalSchedule;
use App\Models\NewAppointment;
use App\Models\Patient;
use App\Models\HealthCenter;
use App\Models\Department;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;

class AppointmentServiceTest extends TestCase
{
    use RefreshDatabase;

    protected AppointmentService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new AppointmentService();
    }

    /** @test */
    public function it_detects_availability_when_schedule_exists()
    {
        $doctor = Doctor::factory()->create();
        $healthCenter = HealthCenter::factory()->create();
        $department = Department::factory()->create();

        // Create schedule for Monday 9am-5pm
        ProfessionalSchedule::create([
            'schedulable_id' => $doctor->id,
            'schedulable_type' => Doctor::class,
            'health_center_id' => $healthCenter->id,
            'department_id' => $department->id,
            'day_of_week' => 'monday',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
            'created_by' => 1,
        ]);

        // Check availability on Monday at 10am
        $appointmentDate = Carbon::parse('next Monday 10:00:00');
        $result = $this->service->checkAvailability($doctor, $appointmentDate, 30);

        $this->assertTrue($result['available']);
        $this->assertEmpty($result['errors']);
    }

    /** @test */
    public function it_detects_unavailability_when_no_schedule()
    {
        $doctor = Doctor::factory()->create();

        // No schedule created
        $appointmentDate = Carbon::parse('next Monday 10:00:00');
        $result = $this->service->checkAvailability($doctor, $appointmentDate, 30);

        $this->assertFalse($result['available']);
        $this->assertContains('Professional does not have a schedule for this date/time', $result['errors']);
    }

    /** @test */
    public function it_detects_overlapping_appointments()
    {
        $doctor = Doctor::factory()->create();
        $patient = Patient::factory()->create();
        $healthCenter = HealthCenter::factory()->create();
        $department = Department::factory()->create();

        // Create schedule
        ProfessionalSchedule::create([
            'schedulable_id' => $doctor->id,
            'schedulable_type' => Doctor::class,
            'health_center_id' => $healthCenter->id,
            'department_id' => $department->id,
            'day_of_week' => 'monday',
            'start_time' => '09:00:00',
            'end_time' => '17:00:00',
            'is_active' => true,
            'created_by' => 1,
        ]);

        // Create existing appointment at 10am
        $existingDate = Carbon::parse('next Monday 10:00:00');
        $appointment = $this->service->bookAppointment([
            'patient_id' => $patient->id,
            'health_center_id' => $healthCenter->id,
            'department_id' => $department->id,
            'appointment_type' => 'consultation',
            'appointment_date' => $existingDate,
            'duration_minutes' => 30,
            'status' => 'scheduled',
            'primary_staff' => $doctor,
        ]);

        // Try to book overlapping appointment at 10:15am
        $newDate = Carbon::parse('next Monday 10:15:00');
        $result = $this->service->checkAvailability($doctor, $newDate, 30);

        $this->assertFalse($result['available']);
        $this->assertContains('Professional has an overlapping appointment', $result['errors']);
    }
}
```

#### Success Criteria

##### Automated Verification:
- [ ] Service class exists and is importable
- [ ] Unit tests pass: `docker exec -it preclinic-app php artisan test --filter=AppointmentServiceTest`
- [ ] Conflict detection works correctly
- [ ] Appointment booking creates all related records

##### Manual Verification:
- [ ] Service methods work in tinker:
  ```
  $service = new App\Services\AppointmentService()
  $doctor = App\Models\Doctor::first()
  $date = \Carbon\Carbon::parse('next Monday 10:00')
  $service->checkAvailability($doctor, $date, 30)
  ```

---

## Testing Strategy

### Unit Tests

**Models:**
- Test all model relationships
- Test model boot events (auto-population of created_by, updated_by, etc.)
- Test model casts and attributes
- Test soft delete behavior

**Services:**
- Test availability checking logic
- Test conflict detection
- Test buffer time calculation
- Test appointment booking with all variations

**Business Logic:**
- Test schedule validity for dates (biweekly patterns, date ranges)
- Test exception handling
- Test polymorphic relationships

### Integration Tests

**Appointment Booking Flow:**
1. Create professional with schedules
2. Attempt to book appointment
3. Verify availability check
4. Create appointment
5. Verify staff assignment
6. Verify status history created

**Assignment Request Flow:**
1. Create unassigned appointment
2. Professional requests assignment
3. Manager approves/rejects
4. Verify appointment updated

**Schedule Exception Flow:**
1. Create schedule
2. Add exception (vacation)
3. Attempt to book during exception
4. Verify booking blocked

### Manual Testing Steps

**After implementation is complete, create a manual testing guide documenting:**

1. **Schedule Creation:**
   - Create weekly schedule for doctor
   - Create bi-weekly schedule
   - Create schedule with date range
   - Add schedule exception
   - Verify conflicts prevented

2. **Appointment Booking:**
   - Book consultation with doctor
   - Book study with technician
   - Book procedure with multiple staff
   - Attempt to book conflicting appointment
   - Verify buffer times applied

3. **Assignment Workflow:**
   - Create unassigned appointment
   - Submit assignment request
   - Approve request as manager
   - Verify staff added to appointment

4. **Status Tracking:**
   - Change appointment status
   - Verify history record created
   - Check audit trail

**Manual testing guide should be created at**: `thoughts/shared/testing/2026-01-22-appointment-system-manual-test-guide.md`

## Performance Considerations

### Database Indexes

All performance-critical queries have composite indexes:
- `professional_schedules`: `(schedulable_type, schedulable_id, day_of_week, is_active)`
- `appointments`: `(patient_id, appointment_date, status)`, `(health_center_id, appointment_date)`
- `appointment_staff`: `(staffable_type, staffable_id)`, `(appointment_id, staffable_type, staffable_id)`

### Query Optimization

- Use eager loading for polymorphic relationships to prevent N+1 queries
- Composite indexes cover common query patterns
- Use `whereHas` sparingly; prefer joins for better performance

### Caching Strategy (Future)

Consider caching:
- Available time slots for professionals (invalidate on schedule change)
- Buffer time configurations (invalidate on buffer time change)
- Professional availability calendars

## Migration Notes

### Data Preservation

**Historical Data:**
- Old `appointments` table will remain intact (could be renamed to `appointments_old`)
- Old `doctor_schedules` table preserved
- No data migration required initially
- Future: Optional migration script to convert old appointments to new format

### Backward Compatibility

**API Versioning:**
- Keep existing API endpoints working
- New appointments use new endpoints (e.g., `/api/v2/appointments`)
- Deprecation plan for old endpoints

**Model Aliasing:**
- Consider creating `Appointment` alias pointing to `NewAppointment` after transition
- Use read-only views for legacy data access if needed

## References

### Existing Code Patterns
- Medical history audit trail: `database/migrations/2026_01_18_300001_create_medical_history_audit_trail_table.php`
- Soft delete with tracking: `app/Models/MedicalHistoryEntry.php:104-125`
- Polymorphic relationships: `database/migrations/2024_08_19_010802_create_permission_tables.php` (Spatie Permission)
- Model boot events: `app/Models/MedicalHistoryEntry.php:67-136`
- Observer pattern: `app/Observers/UserObserver.php`

### Laravel Documentation
- Eloquent Relationships: https://laravel.com/docs/11.x/eloquent-relationships
- Polymorphic Relationships: https://laravel.com/docs/11.x/eloquent-relationships#polymorphic-relationships
- Soft Deleting: https://laravel.com/docs/11.x/eloquent#soft-deleting
- Model Events: https://laravel.com/docs/11.x/eloquent#events

### Project Guidelines
- `.claude/project_guidelines.md` - All mandatory workflows and constraints
