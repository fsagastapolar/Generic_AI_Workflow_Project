# Audit Trail / Activity Logging Implementation Plan

## Overview

Implement comprehensive audit logging for the PreClinic medical management system to achieve HIPAA compliance by tracking all access and modifications to sensitive patient data. This addresses **Critical Issue #19** from the security review which identified the complete absence of audit trails as a HIGH severity compliance risk.

## Current State Analysis

### What Exists Now:
- **NO audit logging system** - Zero tracking of who accessed or modified patient data
- 24 Eloquent models handling various system data
- 9 models containing **sensitive medical data** requiring HIPAA audit controls:
  - `Patient` - Patient demographic and personal information
  - `PatientMedicalHistory` - Medical history records
  - `MedicalRecord` - Clinical consultation notes and diagnoses
  - `Prescription` - Medication prescriptions
  - `Appointment` - Patient appointment scheduling
  - `MedicalStudyResult` - Medical imaging/study results
  - `LaboratoryResult` - Lab test results
  - `OngoingMedicalStudy` - Active medical study tracking
  - `OngoingLaboratoryTest` - Active lab test tracking

- 11 API controllers with CRUD operations modifying data
- JWT authentication system (`php-open-source-saver/jwt-auth`) providing user context
- Spatie Laravel Permission for role-based access control
- MySQL database running in Docker
- Laravel 11 backend in Docker (`app` service)

### HIPAA Requirement Gap:
**HIPAA 164.312(b) Audit Control** mandates:
> "Implement hardware, software, and/or procedural mechanisms that record and examine activity in information systems that contain or use electronic protected health information."

**Current State**: COMPLETE NON-COMPLIANCE - No audit logs exist

### Key Constraints:
- Backend must run in Docker containers (service: `preclinic-app`)
- MySQL database only (never SQLite)
- Must branch from `develop` for all changes
- All changes require comprehensive tests
- Manual testing documentation required after implementation

## Desired End State

### Audit System Capabilities:
1. **Automatic Tracking**: Every create, update, delete, and restore operation on sensitive medical data is automatically logged
2. **User Context**: Each audit entry captures:
   - User ID, name, email, and roles
   - Actor type (Doctor, Patient, Staff, Technician) and actor ID
   - IP address and user agent
   - Timestamp of action
3. **Data Changes**: Old and new values for all modified fields
4. **Event Types**: Clear categorization (created, updated, deleted, restored, accessed)
5. **Retrieval**: Easy querying of audit logs by user, date range, model type, or specific record
6. **Reporting**: Ability to generate compliance reports for HIPAA audits
7. **Retention**: Configurable retention policy for audit data (minimum 6 years for HIPAA)

### Verification:
- Run database migration successfully: `docker exec -it preclinic-app php artisan migrate`
- Verify audit trail captures create/update/delete operations on patient data
- Query audit logs to retrieve user activity history
- Generate sample compliance report
- All tests pass: `docker exec -it preclinic-app php artisan test`

## What We're NOT Doing

- ❌ Real-time monitoring dashboards (out of scope - can be added later)
- ❌ Automated anomaly detection (future enhancement)
- ❌ Email alerts for suspicious activities (future enhancement)
- ❌ Audit log encryption at rest (using MySQL's existing encryption)
- ❌ Audit log export to external SIEM systems (future enhancement)
- ❌ Retroactive audit logging for existing data (only tracks new changes)
- ❌ File upload/download tracking (no file system exists yet)
- ❌ Frontend audit logging (backend API only)

## Implementation Approach

### Strategy:
Use the industry-standard `owen-it/laravel-auditing` package (supports Laravel 11, PHP 8.2+) which provides:
- Automatic model change tracking via Eloquent traits
- Configurable audit events (created, updated, deleted, restored)
- Custom audit fields for HIPAA requirements
- Built-in audit retrieval methods
- Database driver for audit storage

### Why This Package:
- ✅ Battle-tested in production healthcare applications
- ✅ Active maintenance (2026 compatible)
- ✅ HIPAA-compliant audit trail capabilities
- ✅ Minimal code changes required
- ✅ Comprehensive documentation
- ✅ Easy to customize for additional fields (IP, user agent, actor type)

### Phased Approach:
1. **Phase 1**: Install and configure auditing package with custom fields
2. **Phase 2**: Enable auditing on all critical medical data models
3. **Phase 3**: Add user context resolver for HIPAA-compliant audit entries
4. **Phase 4**: Implement audit retrieval and reporting capabilities
5. **Phase 5**: Add comprehensive tests and manual testing documentation

---

## Phase 1: Package Installation and Configuration

### Overview
Install the `owen-it/laravel-auditing` package, publish configurations, run migrations to create the `audits` table, and customize audit storage to include HIPAA-required fields (IP address, user agent, actor type/ID).

### Changes Required:

#### 1. Composer Dependency
**File**: `Pre-Clinic-Backend/composer.json`
**Changes**: Add `owen-it/laravel-auditing` package

```json
"require": {
    "php": "^8.2",
    "dedoc/scramble": "^0.13.10",
    "laravel/framework": "^11.9",
    "laravel/tinker": "^2.9",
    "owen-it/laravel-auditing": "^13.6",
    "php-open-source-saver/jwt-auth": "^2.3",
    "spatie/laravel-permission": "^6.9"
}
```

**Installation Command**:
```bash
docker exec -it preclinic-app composer require owen-it/laravel-auditing
```

#### 2. Publish Package Configuration
**Command**:
```bash
docker exec -it preclinic-app php artisan vendor:publish --provider="OwenIt\Auditing\AuditingServiceProvider" --tag="config"
```

**Result**: Creates `config/audit.php` with default configuration

#### 3. Create Custom Audits Migration
**File**: `Pre-Clinic-Backend/database/migrations/2026_01_11_000001_create_audits_table.php`
**Changes**: Create comprehensive audits table with HIPAA-required fields

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('audits', function (Blueprint $table) {
            $table->id();
            $table->string('user_type')->nullable();
            $table->unsignedBigInteger('user_id')->nullable();
            $table->string('event');
            $table->morphs('auditable');
            $table->json('old_values')->nullable();
            $table->json('new_values')->nullable();
            $table->text('url')->nullable();
            $table->ipAddress('ip_address')->nullable();
            $table->text('user_agent')->nullable();
            $table->string('tags')->nullable();

            // HIPAA-specific fields
            $table->string('actor_type')->nullable(); // 'Doctor', 'Patient', 'Staff', 'Technician'
            $table->unsignedBigInteger('actor_id')->nullable(); // ID from respective table
            $table->json('user_roles')->nullable(); // User's roles at time of action

            $table->timestamps();

            $table->index(['user_id', 'user_type']);
            $table->index(['auditable_id', 'auditable_type']);
            $table->index('event');
            $table->index('created_at');
            $table->index('actor_type');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('audits');
    }
};
```

#### 4. Configure Audit Settings
**File**: `config/audit.php` (after publishing)
**Changes**: Customize configuration for PreClinic requirements

Key configurations to set:
```php
// Line ~36: Enable auditing globally
'enabled' => env('AUDITING_ENABLED', true),

// Line ~53: Set audit driver to 'database'
'driver' => 'database',

// Line ~102: Events to audit
'events' => [
    'created',
    'updated',
    'deleted',
    'restored',
],

// Line ~133: Audit table name
'table' => 'audits',

// Line ~176: User resolver (custom resolver in Phase 3)
'user' => [
    'resolver' => \App\Audit\UserResolver::class,
],
```

#### 5. Environment Configuration
**File**: `Pre-Clinic-Backend/.env`
**Changes**: Add audit configuration

```env
# Audit Logging Configuration
AUDITING_ENABLED=true
AUDIT_CONSOLE=false
```

**File**: `Pre-Clinic-Backend/.env.example`
**Changes**: Document audit configuration for other developers

```env
# Audit Logging Configuration
AUDITING_ENABLED=true
AUDIT_CONSOLE=false
```

### Success Criteria:

#### Automated Verification:
- [ ] Package installed successfully: `docker exec -it preclinic-app composer show owen-it/laravel-auditing`
- [ ] Configuration published: File `config/audit.php` exists
- [ ] Migration created: File `database/migrations/2026_01_11_000001_create_audits_table.php` exists
- [ ] Migration runs successfully: `docker exec -it preclinic-app php artisan migrate`
- [ ] Audits table exists in database: `docker exec -it preclinic-mysql mysql -upreclinic_user -ppassword preclinic -e "DESCRIBE audits;"`
- [ ] Configuration loads without errors: `docker exec -it preclinic-app php artisan config:cache`

#### Manual Verification:
- [ ] Verify audits table has all required columns (including HIPAA fields: actor_type, actor_id, user_roles)
- [ ] Verify indexes created on audits table for performance
- [ ] Review published configuration in `config/audit.php` for correctness

---

## Phase 2: Enable Auditing on Critical Medical Data Models

### Overview
Add the `Auditable` trait to all models containing sensitive medical data to enable automatic audit logging. Configure which attributes should be audited and any model-specific audit settings.

### Changes Required:

#### 1. Patient Model
**File**: `Pre-Clinic-Backend/app/Models/Patient.php`
**Changes**: Add Auditable trait and configure auditing

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable;

class Patient extends Model implements AuditableContract
{
    use HasFactory, Auditable;

    // Existing fillable array remains unchanged
    protected $fillable = [
        'user_id',
        'patient_code',
        'blood_type',
        'allergies',
        'chronic_conditions',
        'insurance_provider',
        'insurance_number',
        'phone_number',
        'insurance_plan',
        'date_of_birth',
        'province',
        'partido',
        'barrio',
        'address_street_and_number',
        'address_floor_apartment',
        'emergency_contact_name',
        'emergency_phone_number',
    ];

    // Configure which attributes to audit (exclude non-sensitive timestamps)
    protected $auditInclude = [
        'user_id',
        'patient_code',
        'blood_type',
        'allergies',
        'chronic_conditions',
        'insurance_provider',
        'insurance_number',
        'phone_number',
        'insurance_plan',
        'date_of_birth',
        'province',
        'partido',
        'barrio',
        'address_street_and_number',
        'address_floor_apartment',
        'emergency_contact_name',
        'emergency_phone_number',
    ];

    protected $casts = [
        'date_of_birth' => 'date',
    ];

    // Existing relationships remain unchanged...
}
```

#### 2. MedicalRecord Model
**File**: `Pre-Clinic-Backend/app/Models/MedicalRecord.php`
**Changes**: Add Auditable trait

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable;

class MedicalRecord extends Model implements AuditableContract
{
    use HasFactory, Auditable;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'appointment_id',
        'visit_date',
        'chief_complaint',
        'diagnosis',
        'treatment_plan',
        'notes',
    ];

    protected $auditInclude = [
        'patient_id',
        'doctor_id',
        'appointment_id',
        'visit_date',
        'chief_complaint',
        'diagnosis',
        'treatment_plan',
        'notes',
    ];

    protected $casts = [
        'visit_date' => 'datetime',
    ];

    // Existing relationships remain unchanged...
}
```

#### 3. PatientMedicalHistory Model
**File**: `Pre-Clinic-Backend/app/Models/PatientMedicalHistory.php`
**Changes**: Read current structure and add Auditable trait

Read the file first, then add:
```php
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable;

class PatientMedicalHistory extends Model implements AuditableContract
{
    use HasFactory, Auditable;

    // Add $auditInclude based on actual fillable fields
}
```

#### 4. Prescription Model
**File**: `Pre-Clinic-Backend/app/Models/Prescription.php`
**Changes**: Add Auditable trait and configure

Currently minimal structure. Read current migration to determine fields, then:
```php
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable;

class Prescription extends Model implements AuditableContract
{
    use HasFactory, Auditable;

    // Add fillable and auditInclude based on migration
}
```

#### 5. Appointment Model
**File**: `Pre-Clinic-Backend/app/Models/Appointment.php`
**Changes**: Add Auditable trait

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use OwenIt\Auditing\Contracts\Auditable as AuditableContract;
use OwenIt\Auditing\Auditable;

class Appointment extends Model implements AuditableContract
{
    use HasFactory, Auditable;

    protected $fillable = [
        'patient_id',
        'doctor_id',
        'health_center_id',
        'appointment_date',
        'duration_minutes',
        'status',
        'reason',
        'notes',
        'created_by',
    ];

    protected $auditInclude = [
        'patient_id',
        'doctor_id',
        'health_center_id',
        'appointment_date',
        'duration_minutes',
        'status',
        'reason',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'appointment_date' => 'datetime',
    ];

    // Existing relationships remain unchanged...
}
```

#### 6. MedicalStudyResult Model
**File**: `Pre-Clinic-Backend/app/Models/MedicalStudyResult.php`
**Changes**: Read and add Auditable trait

#### 7. LaboratoryResult Model
**File**: `Pre-Clinic-Backend/app/Models/LaboratoryResult.php`
**Changes**: Read and add Auditable trait

#### 8. OngoingMedicalStudy Model
**File**: `Pre-Clinic-Backend/app/Models/OngoingMedicalStudy.php`
**Changes**: Read and add Auditable trait

#### 9. OngoingLaboratoryTest Model
**File**: `Pre-Clinic-Backend/app/Models/OngoingLaboratoryTest.php`
**Changes**: Read and add Auditable trait

#### 10. Additional Models (Optional but Recommended)
**Files**: Also add auditing to user-related models:
- `Pre-Clinic-Backend/app/Models/User.php` - User account changes
- `Pre-Clinic-Backend/app/Models/UserProfile.php` - Profile modifications
- `Pre-Clinic-Backend/app/Models/Doctor.php` - Doctor profile changes
- `Pre-Clinic-Backend/app/Models/Staff.php` - Staff profile changes
- `Pre-Clinic-Backend/app/Models/Technician.php` - Technician profile changes

### Success Criteria:

#### Automated Verification:
- [ ] All 9 critical medical models implement `AuditableContract`
- [ ] All models use `Auditable` trait
- [ ] Code syntax is valid: `docker exec -it preclinic-app php artisan tinker --execute="echo 'Syntax OK'"`
- [ ] No errors when clearing cache: `docker exec -it preclinic-app php artisan optimize:clear`

#### Manual Verification:
- [ ] Review each modified model file for correct trait implementation
- [ ] Verify `$auditInclude` arrays contain all sensitive fields
- [ ] Ensure no sensitive fields are accidentally excluded from auditing

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the code review was successful before proceeding to Phase 3.

---

## Phase 3: Add User Context Resolver for HIPAA Compliance

### Overview
Create a custom user resolver that captures comprehensive user context including IP address, user agent, user roles, and actor type/ID (Doctor, Patient, Staff, Technician) for HIPAA-compliant audit trails.

### Changes Required:

#### 1. Create Custom User Resolver
**File**: `Pre-Clinic-Backend/app/Audit/UserResolver.php` (new file)
**Changes**: Create comprehensive user context resolver

```php
<?php

namespace App\Audit;

use Illuminate\Support\Facades\Auth;
use OwenIt\Auditing\Contracts\UserResolver as UserResolverContract;

class UserResolver implements UserResolverContract
{
    /**
     * Resolve the User for auditing.
     *
     * @return array|null
     */
    public static function resolve()
    {
        $guard = 'api';

        if (!Auth::guard($guard)->check()) {
            return null;
        }

        $user = Auth::guard($guard)->user();

        // Determine actor type and ID
        $actorType = null;
        $actorId = null;

        if ($user->doctor()->exists()) {
            $actorType = 'Doctor';
            $actorId = $user->doctor->id;
        } elseif ($user->patient()->exists()) {
            $actorType = 'Patient';
            $actorId = $user->patient->id;
        } elseif ($user->staff()->exists()) {
            $actorType = 'Staff';
            $actorId = $user->staff->id;
        } elseif ($user->technician()->exists()) {
            $actorType = 'Technician';
            $actorId = $user->technician->id;
        }

        return [
            'user_id' => $user->id,
            'user_type' => get_class($user),
            'actor_type' => $actorType,
            'actor_id' => $actorId,
            'user_roles' => $user->getRoleNames()->toArray(),
        ];
    }
}
```

#### 2. Update Audit Configuration
**File**: `config/audit.php`
**Changes**: Configure custom user resolver

Find the user configuration section (around line 176) and update:
```php
'user' => [
    'morph_prefix' => 'user',
    'guards' => [
        'api',
    ],
    'resolver' => \App\Audit\UserResolver::class,
],
```

#### 3. Create Audit Model with Custom Attributes
**File**: `Pre-Clinic-Backend/app/Models/Audit.php` (new file)
**Changes**: Create custom Audit model to expose HIPAA fields

```php
<?php

namespace App\Models;

use OwenIt\Auditing\Models\Audit as AuditModel;

class Audit extends AuditModel
{
    /**
     * Additional fillable attributes for HIPAA compliance
     */
    protected $fillable = [
        'user_type',
        'user_id',
        'event',
        'auditable_id',
        'auditable_type',
        'old_values',
        'new_values',
        'url',
        'ip_address',
        'user_agent',
        'tags',
        'actor_type',
        'actor_id',
        'user_roles',
    ];

    /**
     * Cast JSON fields
     */
    protected $casts = [
        'old_values' => 'json',
        'new_values' => 'json',
        'user_roles' => 'json',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the user who performed the action
     */
    public function user()
    {
        return $this->morphTo('user');
    }

    /**
     * Get the auditable model
     */
    public function auditable()
    {
        return $this->morphTo();
    }

    /**
     * Get actor model based on actor_type
     */
    public function actor()
    {
        if (!$this->actor_type || !$this->actor_id) {
            return null;
        }

        $modelClass = "App\\Models\\{$this->actor_type}";

        if (!class_exists($modelClass)) {
            return null;
        }

        return $modelClass::find($this->actor_id);
    }

    /**
     * Scope to filter by user
     */
    public function scopeByUser($query, $userId)
    {
        return $query->where('user_id', $userId);
    }

    /**
     * Scope to filter by actor type
     */
    public function scopeByActorType($query, $actorType)
    {
        return $query->where('actor_type', $actorType);
    }

    /**
     * Scope to filter by date range
     */
    public function scopeDateRange($query, $startDate, $endDate)
    {
        return $query->whereBetween('created_at', [$startDate, $endDate]);
    }

    /**
     * Scope to filter by event type
     */
    public function scopeByEvent($query, $event)
    {
        return $query->where('event', $event);
    }

    /**
     * Scope to filter by auditable type
     */
    public function scopeByAuditableType($query, $type)
    {
        return $query->where('auditable_type', $type);
    }
}
```

#### 4. Update Audit Configuration to Use Custom Model
**File**: `config/audit.php`
**Changes**: Set custom audit model

Find the model configuration (around line 133) and update:
```php
'model' => App\Models\Audit::class,
```

#### 5. Create Middleware to Capture Request Context
**File**: `Pre-Clinic-Backend/app/Http/Middleware/CaptureAuditContext.php` (new file)
**Changes**: Create middleware to capture IP and user agent

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use OwenIt\Auditing\Facades\Auditor;
use Symfony\Component\HttpFoundation\Response;

class CaptureAuditContext
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        // Set audit context for the current request
        Auditor::execute(function ($implementation) use ($request) {
            $implementation->setIpAddress($request->ip());
            $implementation->setUserAgent($request->userAgent());
            $implementation->setUrl($request->fullUrl());
        });

        return $next($request);
    }
}
```

#### 6. Register Middleware
**File**: `Pre-Clinic-Backend/app/Http/Kernel.php` (or `bootstrap/app.php` for Laravel 11)
**Changes**: Register audit context middleware

For Laravel 11 (`bootstrap/app.php`):
```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->api(append: [
        \App\Http\Middleware\CaptureAuditContext::class,
    ]);
})
```

If using traditional Kernel.php:
```php
protected $middlewareGroups = [
    'api' => [
        // ... existing middleware
        \App\Http\Middleware\CaptureAuditContext::class,
    ],
];
```

#### 7. Create Audit Event Subscriber (Optional Enhancement)
**File**: `Pre-Clinic-Backend/app/Listeners/AuditEventSubscriber.php` (new file)
**Changes**: Subscribe to audit events for custom logging

```php
<?php

namespace App\Listeners;

use OwenIt\Auditing\Events\Audited;
use OwenIt\Auditing\Events\Auditing;
use Illuminate\Support\Facades\Log;

class AuditEventSubscriber
{
    /**
     * Handle auditing events (before audit is saved).
     */
    public function onAuditing(Auditing $event): void
    {
        // Can add custom logic before audit is saved
        // Example: Add tags, modify values, etc.
    }

    /**
     * Handle audited events (after audit is saved).
     */
    public function onAudited(Audited $event): void
    {
        $audit = $event->audit;

        // Log critical medical data changes
        if ($this->isCriticalModel($audit->auditable_type)) {
            Log::channel('audit')->info('Critical medical data modified', [
                'audit_id' => $audit->id,
                'user_id' => $audit->user_id,
                'actor_type' => $audit->actor_type,
                'model' => $audit->auditable_type,
                'event' => $audit->event,
                'timestamp' => $audit->created_at,
            ]);
        }
    }

    /**
     * Determine if the model is critical
     */
    protected function isCriticalModel(string $modelType): bool
    {
        $criticalModels = [
            'App\Models\Patient',
            'App\Models\MedicalRecord',
            'App\Models\Prescription',
            'App\Models\PatientMedicalHistory',
            'App\Models\LaboratoryResult',
            'App\Models\MedicalStudyResult',
        ];

        return in_array($modelType, $criticalModels);
    }

    /**
     * Register the listeners for the subscriber.
     */
    public function subscribe($events): array
    {
        return [
            Auditing::class => 'onAuditing',
            Audited::class => 'onAudited',
        ];
    }
}
```

#### 8. Register Event Subscriber
**File**: `Pre-Clinic-Backend/app/Providers/EventServiceProvider.php`
**Changes**: Register audit event subscriber

```php
protected $subscribe = [
    \App\Listeners\AuditEventSubscriber::class,
];
```

#### 9. Create Audit Log Channel
**File**: `config/logging.php`
**Changes**: Add dedicated audit log channel

```php
'channels' => [
    // ... existing channels

    'audit' => [
        'driver' => 'daily',
        'path' => storage_path('logs/audit.log'),
        'level' => 'info',
        'days' => 2190, // 6 years for HIPAA compliance
        'permission' => 0640,
        'locking' => true,
    ],
],
```

### Success Criteria:

#### Automated Verification:
- [ ] UserResolver class created: `docker exec -it preclinic-app php artisan tinker --execute="class_exists('App\Audit\UserResolver')"`
- [ ] Custom Audit model created and loads correctly
- [ ] Middleware registered: `docker exec -it preclinic-app php artisan route:list --middleware=CaptureAuditContext`
- [ ] Configuration cached successfully: `docker exec -it preclinic-app php artisan config:cache`
- [ ] No syntax errors: `docker exec -it preclinic-app php artisan optimize:clear`

#### Manual Verification:
- [ ] Create a test patient record via API and verify audit entry includes IP address, user agent, actor_type, and user_roles
- [ ] Update the test patient and verify old_values and new_values are captured correctly
- [ ] Delete the test patient and verify the delete event is audited
- [ ] Review audit log file at `storage/logs/audit.log` for critical data change notifications
- [ ] Verify audit entry structure matches HIPAA requirements

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that manual testing was successful before proceeding to Phase 4.

---

## Phase 4: Implement Audit Retrieval and Reporting Capabilities

### Overview
Create API endpoints and helper methods to retrieve audit logs for compliance reporting, user activity tracking, and security investigations. Implement query filters, pagination, and export capabilities.

### Changes Required:

#### 1. Create Audit Controller
**File**: `Pre-Clinic-Backend/app/Http/Controllers/API/V1/AuditController.php` (new file)
**Changes**: Create controller for audit log retrieval

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\Audit;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Gate;

class AuditController extends BaseController
{
    /**
     * Get audit logs with filters
     */
    public function index(Request $request): JsonResponse
    {
        // Authorization: Only users with 'view_audits' permission can access
        Gate::authorize('viewAny', Audit::class);

        $validated = $request->validate([
            'user_id' => 'nullable|integer|exists:users,id',
            'actor_type' => 'nullable|string|in:Doctor,Patient,Staff,Technician',
            'auditable_type' => 'nullable|string',
            'event' => 'nullable|string|in:created,updated,deleted,restored',
            'start_date' => 'nullable|date',
            'end_date' => 'nullable|date|after_or_equal:start_date',
            'per_page' => 'nullable|integer|min:1|max:100',
        ]);

        $query = Audit::query()->with(['user', 'auditable']);

        // Apply filters
        if (isset($validated['user_id'])) {
            $query->byUser($validated['user_id']);
        }

        if (isset($validated['actor_type'])) {
            $query->byActorType($validated['actor_type']);
        }

        if (isset($validated['auditable_type'])) {
            $query->byAuditableType($validated['auditable_type']);
        }

        if (isset($validated['event'])) {
            $query->byEvent($validated['event']);
        }

        if (isset($validated['start_date']) && isset($validated['end_date'])) {
            $query->dateRange($validated['start_date'], $validated['end_date']);
        }

        // Order by most recent first
        $query->orderBy('created_at', 'desc');

        // Paginate results
        $perPage = $validated['per_page'] ?? 50;
        $audits = $query->paginate($perPage);

        return $this->sendResponse($audits, 'Audit logs retrieved successfully.');
    }

    /**
     * Get audit logs for a specific record
     */
    public function show(string $auditableType, int $auditableId): JsonResponse
    {
        Gate::authorize('viewAny', Audit::class);

        $audits = Audit::where('auditable_type', $auditableType)
            ->where('auditable_id', $auditableId)
            ->with(['user'])
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->sendResponse($audits, 'Audit logs for record retrieved successfully.');
    }

    /**
     * Get audit logs for a specific user
     */
    public function userActivity(int $userId): JsonResponse
    {
        Gate::authorize('viewAny', Audit::class);

        // Additional check: users can only view their own activity unless they have admin permission
        $currentUser = auth('api')->user();
        if ($currentUser->id !== $userId && !$currentUser->can('view_all_audits')) {
            return $this->sendError('Unauthorized to view other users\' activity.', [], 403);
        }

        $audits = Audit::byUser($userId)
            ->with(['auditable'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        return $this->sendResponse($audits, 'User activity retrieved successfully.');
    }

    /**
     * Get recent audit activity (last 24 hours)
     */
    public function recent(): JsonResponse
    {
        Gate::authorize('viewAny', Audit::class);

        $audits = Audit::where('created_at', '>=', now()->subDay())
            ->with(['user', 'auditable'])
            ->orderBy('created_at', 'desc')
            ->paginate(100);

        return $this->sendResponse($audits, 'Recent audit activity retrieved successfully.');
    }

    /**
     * Generate compliance report
     */
    public function complianceReport(Request $request): JsonResponse
    {
        Gate::authorize('viewAny', Audit::class);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
            'model_type' => 'nullable|string',
        ]);

        $query = Audit::dateRange($validated['start_date'], $validated['end_date']);

        if (isset($validated['model_type'])) {
            $query->byAuditableType($validated['model_type']);
        }

        // Get aggregated statistics
        $totalActions = $query->count();
        $actionsByEvent = $query->get()->groupBy('event')->map->count();
        $actionsByUser = $query->get()->groupBy('user_id')->map->count();
        $actionsByModel = $query->get()->groupBy('auditable_type')->map->count();

        $report = [
            'period' => [
                'start' => $validated['start_date'],
                'end' => $validated['end_date'],
            ],
            'total_actions' => $totalActions,
            'actions_by_event' => $actionsByEvent,
            'actions_by_user' => $actionsByUser,
            'actions_by_model' => $actionsByModel,
            'generated_at' => now()->toIso8601String(),
        ];

        return $this->sendResponse($report, 'Compliance report generated successfully.');
    }

    /**
     * Export audit logs to CSV
     */
    public function export(Request $request): \Illuminate\Http\Response
    {
        Gate::authorize('viewAny', Audit::class);

        $validated = $request->validate([
            'start_date' => 'required|date',
            'end_date' => 'required|date|after_or_equal:start_date',
        ]);

        $audits = Audit::dateRange($validated['start_date'], $validated['end_date'])
            ->with(['user'])
            ->orderBy('created_at', 'asc')
            ->get();

        // Generate CSV content
        $csvContent = "ID,User ID,User Name,Actor Type,Event,Model,Record ID,IP Address,Timestamp\n";

        foreach ($audits as $audit) {
            $userName = $audit->user ? $audit->user->name : 'N/A';
            $csvContent .= sprintf(
                "%d,%d,%s,%s,%s,%s,%d,%s,%s\n",
                $audit->id,
                $audit->user_id ?? 0,
                $userName,
                $audit->actor_type ?? 'N/A',
                $audit->event,
                $audit->auditable_type,
                $audit->auditable_id,
                $audit->ip_address ?? 'N/A',
                $audit->created_at->toIso8601String()
            );
        }

        $filename = sprintf('audit_logs_%s_to_%s.csv', $validated['start_date'], $validated['end_date']);

        return response($csvContent, 200, [
            'Content-Type' => 'text/csv',
            'Content-Disposition' => "attachment; filename=\"{$filename}\"",
        ]);
    }
}
```

#### 2. Create Audit Policy
**File**: `Pre-Clinic-Backend/app/Policies/AuditPolicy.php` (new file)
**Changes**: Create authorization policy for audit access

```php
<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Audit;

class AuditPolicy
{
    /**
     * Determine if the user can view any audits.
     */
    public function viewAny(User $user): bool
    {
        // Only users with 'view_audits' permission can access audit logs
        return $user->can('view_audits');
    }

    /**
     * Determine if the user can view the audit.
     */
    public function view(User $user, Audit $audit): bool
    {
        // Users can view their own audit logs
        // OR users with 'view_all_audits' permission can view any audit
        return $user->id === $audit->user_id || $user->can('view_all_audits');
    }

    /**
     * Prevent audit deletion (audits should never be deleted)
     */
    public function delete(User $user, Audit $audit): bool
    {
        return false; // Audits cannot be deleted
    }

    /**
     * Prevent audit updates (audits should be immutable)
     */
    public function update(User $user, Audit $audit): bool
    {
        return false; // Audits cannot be modified
    }
}
```

#### 3. Register Audit Policy
**File**: `Pre-Clinic-Backend/app/Providers/AuthServiceProvider.php`
**Changes**: Register audit policy

```php
protected $policies = [
    HealthCenter::class => HealthCenterPolicy::class,
    Doctor::class => DoctorPolicy::class,
    Patient::class => PatientPolicy::class,
    User::class => UserPolicy::class,
    \App\Models\Audit::class => \App\Policies\AuditPolicy::class,
];
```

#### 4. Create API Routes
**File**: `Pre-Clinic-Backend/routes/api.php`
**Changes**: Add audit retrieval routes

```php
// Audit log routes (protected by auth:api middleware)
Route::middleware(['auth:api'])->prefix('v1')->group(function () {
    // ... existing routes

    // Audit logs
    Route::prefix('audits')->group(function () {
        Route::get('/', [AuditController::class, 'index']);
        Route::get('/recent', [AuditController::class, 'recent']);
        Route::get('/user/{userId}', [AuditController::class, 'userActivity']);
        Route::get('/record/{auditableType}/{auditableId}', [AuditController::class, 'show']);
        Route::post('/report', [AuditController::class, 'complianceReport']);
        Route::post('/export', [AuditController::class, 'export']);
    });
});
```

#### 5. Create Database Seeder for Audit Permissions
**File**: `Pre-Clinic-Backend/database/seeders/AuditPermissionsSeeder.php` (new file)
**Changes**: Seed audit-related permissions

```php
<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;
use Spatie\Permission\Models\Role;

class AuditPermissionsSeeder extends Seeder
{
    public function run(): void
    {
        // Create audit permissions
        $permissions = [
            'view_audits' => 'View audit logs',
            'view_all_audits' => 'View all audit logs including other users',
            'export_audits' => 'Export audit logs to CSV',
            'generate_audit_reports' => 'Generate compliance reports',
        ];

        foreach ($permissions as $name => $description) {
            Permission::firstOrCreate(
                ['name' => $name],
                ['guard_name' => 'api']
            );
        }

        // Assign permissions to roles
        $superAdmin = Role::where('name', 'Super-Admin')->first();
        if ($superAdmin) {
            $superAdmin->givePermissionTo(array_keys($permissions));
        }

        // Admin role can view and export audits
        $admin = Role::where('name', 'Admin')->first();
        if ($admin) {
            $admin->givePermissionTo([
                'view_audits',
                'view_all_audits',
                'export_audits',
                'generate_audit_reports',
            ]);
        }

        // Doctors can view their own audit logs
        $doctor = Role::where('name', 'Doctor')->first();
        if ($doctor) {
            $doctor->givePermissionTo('view_audits');
        }
    }
}
```

#### 6. Update DatabaseSeeder
**File**: `Pre-Clinic-Backend/database/seeders/DatabaseSeeder.php`
**Changes**: Call audit permissions seeder

```php
public function run(): void
{
    // ... existing seeders
    $this->call([
        // ... existing seeder calls
        AuditPermissionsSeeder::class,
    ]);
}
```

#### 7. Add Helper Methods to Models
**File**: `Pre-Clinic-Backend/app/Models/Patient.php` (and other auditable models)
**Changes**: Add convenience method to get audit history

```php
/**
 * Get audit history for this patient
 */
public function auditHistory()
{
    return $this->audits()->orderBy('created_at', 'desc');
}

/**
 * Get recent changes (last 30 days)
 */
public function recentChanges()
{
    return $this->audits()
        ->where('created_at', '>=', now()->subDays(30))
        ->orderBy('created_at', 'desc')
        ->get();
}
```

### Success Criteria:

#### Automated Verification:
- [ ] AuditController created and routes registered: `docker exec -it preclinic-app php artisan route:list | grep audits`
- [ ] AuditPolicy created and registered
- [ ] Permissions seeded: `docker exec -it preclinic-app php artisan db:seed --class=AuditPermissionsSeeder`
- [ ] All routes are protected by authentication: Verify middleware in route list
- [ ] API documentation updated: `docker exec -it preclinic-app php artisan scramble:generate`

#### Manual Verification:
- [ ] Test GET /api/v1/audits with various filters (user_id, date range, event type)
- [ ] Test GET /api/v1/audits/user/{userId} for user activity
- [ ] Test GET /api/v1/audits/record/{type}/{id} for specific record history
- [ ] Test POST /api/v1/audits/report to generate compliance report
- [ ] Test POST /api/v1/audits/export to download CSV export
- [ ] Verify authorization: non-admin users cannot view other users' full activity
- [ ] Verify CSV export contains all required fields
- [ ] Test pagination with large result sets

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that API testing was successful before proceeding to Phase 5.

---

## Phase 5: Testing and Documentation

### Overview
Create comprehensive automated tests for audit logging functionality and generate manual testing documentation for HIPAA compliance verification.

### Changes Required:

#### 1. Create Audit Feature Test
**File**: `Pre-Clinic-Backend/tests/Feature/AuditLoggingTest.php` (new file)
**Changes**: Create comprehensive feature tests

```php
<?php

namespace Tests\Feature;

use App\Models\User;
use App\Models\Patient;
use App\Models\MedicalRecord;
use App\Models\Audit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;
use Tests\TestCase;

class AuditLoggingTest extends TestCase
{
    use RefreshDatabase;

    protected $adminUser;
    protected $doctorUser;
    protected $token;

    protected function setUp(): void
    {
        parent::setUp();

        // Create roles and permissions
        $adminRole = Role::create(['name' => 'Admin', 'guard_name' => 'api']);
        $doctorRole = Role::create(['name' => 'Doctor', 'guard_name' => 'api']);

        Permission::create(['name' => 'view_audits', 'guard_name' => 'api']);
        Permission::create(['name' => 'view_all_audits', 'guard_name' => 'api']);

        $adminRole->givePermissionTo(['view_audits', 'view_all_audits']);
        $doctorRole->givePermissionTo('view_audits');

        // Create admin user
        $this->adminUser = User::factory()->create([
            'email' => 'admin@preclinic.test',
        ]);
        $this->adminUser->assignRole('Admin');

        // Login and get token
        $this->token = auth('api')->login($this->adminUser);
    }

    /** @test */
    public function it_creates_audit_log_when_patient_is_created()
    {
        $patientData = [
            'user_id' => $this->adminUser->id,
            'patient_code' => 'P001',
            'blood_type' => 'A+',
            'date_of_birth' => '1990-01-01',
        ];

        $patient = Patient::create($patientData);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'App\Models\Patient',
            'auditable_id' => $patient->id,
            'event' => 'created',
            'user_id' => $this->adminUser->id,
        ]);

        $audit = Audit::where('auditable_id', $patient->id)
            ->where('auditable_type', 'App\Models\Patient')
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals('created', $audit->event);
        $this->assertNotNull($audit->new_values);
    }

    /** @test */
    public function it_creates_audit_log_when_patient_is_updated()
    {
        $patient = Patient::factory()->create([
            'blood_type' => 'A+',
        ]);

        // Clear any existing audits from creation
        Audit::truncate();

        $patient->update(['blood_type' => 'O-']);

        $audit = Audit::where('auditable_id', $patient->id)
            ->where('event', 'updated')
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals('A+', $audit->old_values['blood_type']);
        $this->assertEquals('O-', $audit->new_values['blood_type']);
    }

    /** @test */
    public function it_creates_audit_log_when_patient_is_deleted()
    {
        $patient = Patient::factory()->create();

        // Clear any existing audits
        Audit::truncate();

        $patient->delete();

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'App\Models\Patient',
            'auditable_id' => $patient->id,
            'event' => 'deleted',
        ]);
    }

    /** @test */
    public function it_captures_user_context_in_audit_log()
    {
        $this->actingAs($this->adminUser, 'api');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
            'X-Forwarded-For' => '192.168.1.100',
            'User-Agent' => 'TestBrowser/1.0',
        ])->postJson('/api/v1/patients', [
            'user_id' => $this->adminUser->id,
            'patient_code' => 'P002',
            'blood_type' => 'B+',
            'date_of_birth' => '1985-05-15',
        ]);

        $patient = Patient::where('patient_code', 'P002')->first();

        $audit = Audit::where('auditable_id', $patient->id)
            ->where('auditable_type', 'App\Models\Patient')
            ->first();

        $this->assertNotNull($audit);
        $this->assertEquals($this->adminUser->id, $audit->user_id);
        $this->assertNotNull($audit->ip_address);
        $this->assertNotNull($audit->user_agent);
        $this->assertNotNull($audit->user_roles);
    }

    /** @test */
    public function it_can_retrieve_audit_logs()
    {
        $this->actingAs($this->adminUser, 'api');

        // Create some audit entries
        Patient::factory()->count(3)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson('/api/v1/audits');

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'data' => [
                    '*' => [
                        'id',
                        'user_id',
                        'event',
                        'auditable_type',
                        'auditable_id',
                        'created_at',
                    ]
                ]
            ],
        ]);
    }

    /** @test */
    public function it_can_filter_audits_by_user()
    {
        $this->actingAs($this->adminUser, 'api');

        $otherUser = User::factory()->create();

        Patient::factory()->create(); // Created by adminUser (via setUp)

        $this->actingAs($otherUser, 'api');
        Patient::factory()->create(); // Created by otherUser

        $this->actingAs($this->adminUser, 'api');

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->getJson('/api/v1/audits?user_id=' . $this->adminUser->id);

        $response->assertStatus(200);

        $audits = $response->json('data.data');
        foreach ($audits as $audit) {
            $this->assertEquals($this->adminUser->id, $audit['user_id']);
        }
    }

    /** @test */
    public function it_can_generate_compliance_report()
    {
        $this->actingAs($this->adminUser, 'api');

        // Create test data
        Patient::factory()->count(5)->create();

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->postJson('/api/v1/audits/report', [
            'start_date' => now()->subDay()->toDateString(),
            'end_date' => now()->toDateString(),
        ]);

        $response->assertStatus(200);
        $response->assertJsonStructure([
            'success',
            'data' => [
                'period',
                'total_actions',
                'actions_by_event',
                'actions_by_user',
                'actions_by_model',
                'generated_at',
            ],
        ]);
    }

    /** @test */
    public function it_prevents_unauthorized_access_to_audits()
    {
        $unauthorizedUser = User::factory()->create();
        $unauthorizedToken = auth('api')->login($unauthorizedUser);

        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $unauthorizedToken,
        ])->getJson('/api/v1/audits');

        $response->assertStatus(403); // Forbidden
    }

    /** @test */
    public function it_prevents_audit_modification()
    {
        $patient = Patient::factory()->create();

        $audit = Audit::where('auditable_id', $patient->id)->first();

        $this->actingAs($this->adminUser, 'api');

        // Try to delete audit
        $response = $this->withHeaders([
            'Authorization' => 'Bearer ' . $this->token,
        ])->deleteJson("/api/v1/audits/{$audit->id}");

        // Should not have delete route, but if it exists, should be forbidden
        $this->assertTrue(
            $response->status() === 404 || $response->status() === 403
        );

        // Audit should still exist
        $this->assertDatabaseHas('audits', [
            'id' => $audit->id,
        ]);
    }

    /** @test */
    public function it_audits_medical_record_creation()
    {
        $patient = Patient::factory()->create();
        $doctor = User::factory()->create();

        $medicalRecord = MedicalRecord::create([
            'patient_id' => $patient->id,
            'doctor_id' => $doctor->id,
            'visit_date' => now(),
            'chief_complaint' => 'Headache',
            'diagnosis' => 'Migraine',
            'treatment_plan' => 'Rest and medication',
        ]);

        $this->assertDatabaseHas('audits', [
            'auditable_type' => 'App\Models\MedicalRecord',
            'auditable_id' => $medicalRecord->id,
            'event' => 'created',
        ]);
    }
}
```

#### 2. Create Audit Unit Test
**File**: `Pre-Clinic-Backend/tests/Unit/AuditModelTest.php` (new file)
**Changes**: Create unit tests for Audit model

```php
<?php

namespace Tests\Unit;

use App\Models\Audit;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditModelTest extends TestCase
{
    use RefreshDatabase;

    /** @test */
    public function it_has_correct_fillable_attributes()
    {
        $audit = new Audit();
        $fillable = $audit->getFillable();

        $this->assertContains('user_id', $fillable);
        $this->assertContains('event', $fillable);
        $this->assertContains('auditable_id', $fillable);
        $this->assertContains('auditable_type', $fillable);
        $this->assertContains('ip_address', $fillable);
        $this->assertContains('user_agent', $fillable);
        $this->assertContains('actor_type', $fillable);
        $this->assertContains('actor_id', $fillable);
        $this->assertContains('user_roles', $fillable);
    }

    /** @test */
    public function it_casts_json_fields_correctly()
    {
        $patient = Patient::factory()->create(['blood_type' => 'A+']);

        $audit = Audit::where('auditable_id', $patient->id)->first();

        $this->assertIsArray($audit->new_values);
        $this->assertIsArray($audit->old_values ?? []);
    }

    /** @test */
    public function it_can_filter_by_user()
    {
        $user1 = User::factory()->create();
        $user2 = User::factory()->create();

        $this->actingAs($user1, 'api');
        Patient::factory()->create();

        $this->actingAs($user2, 'api');
        Patient::factory()->create();

        $user1Audits = Audit::byUser($user1->id)->get();

        $this->assertGreaterThan(0, $user1Audits->count());

        foreach ($user1Audits as $audit) {
            $this->assertEquals($user1->id, $audit->user_id);
        }
    }

    /** @test */
    public function it_can_filter_by_date_range()
    {
        Patient::factory()->create();

        $startDate = now()->subHour();
        $endDate = now()->addHour();

        $audits = Audit::dateRange($startDate, $endDate)->get();

        $this->assertGreaterThan(0, $audits->count());
    }

    /** @test */
    public function it_can_filter_by_event_type()
    {
        $patient = Patient::factory()->create();
        $patient->update(['blood_type' => 'O+']);

        $createdAudits = Audit::byEvent('created')->get();
        $updatedAudits = Audit::byEvent('updated')->get();

        $this->assertGreaterThan(0, $createdAudits->count());
        $this->assertGreaterThan(0, $updatedAudits->count());
    }
}
```

#### 3. Create Manual Testing Guide
**File**: `thoughts/shared/testing/2026-01-11-audit-trail-manual-test-guide.md` (new file)
**Changes**: Create comprehensive manual testing documentation

```markdown
# Manual Testing Guide: Audit Trail / Activity Logging

## Implementation Summary
- Implemented comprehensive audit logging for HIPAA compliance
- Tracks all create, update, delete, and restore operations on sensitive medical data
- Captures user context (IP, user agent, roles, actor type)
- Provides API endpoints for audit retrieval and compliance reporting
- Implementation Date: 2026-01-11
- Addresses: Critical Issue #19 from security review

## Prerequisites
- [ ] Docker containers running: `docker ps`
- [ ] Database migrated: `docker exec -it preclinic-app php artisan migrate`
- [ ] Audit permissions seeded: `docker exec -it preclinic-app php artisan db:seed --class=AuditPermissionsSeeder`
- [ ] Frontend running (if applicable): `ng serve`
- [ ] Valid JWT token for authentication
- [ ] User with admin role created (for audit access testing)

## Test Scenarios

### Scenario 1: Patient Record Creation Auditing
**Objective**: Verify that creating a patient record generates an audit log entry

**Steps**:
1. Authenticate as admin user: `POST /api/v1/auth/login`
2. Create a new patient: `POST /api/v1/patients` with body:
   ```json
   {
     "user_id": <user_id>,
     "patient_code": "TEST001",
     "blood_type": "A+",
     "date_of_birth": "1990-01-01"
   }
   ```
3. Query audits table directly:
   ```bash
   docker exec -it preclinic-mysql mysql -upreclinic_user -ppassword preclinic \
     -e "SELECT * FROM audits WHERE auditable_type='App\\\\Models\\\\Patient' ORDER BY created_at DESC LIMIT 1;"
   ```

**Expected Results**:
- API returns 201 Created with patient data
- Audit entry exists in database with:
  - `event` = 'created'
  - `auditable_type` = 'App\Models\Patient'
  - `auditable_id` = new patient ID
  - `user_id` = authenticated user ID
  - `new_values` contains all patient data
  - `ip_address` is captured
  - `user_agent` is captured
  - `actor_type` is set (e.g., 'Doctor' if user is a doctor)
  - `user_roles` contains user's roles as JSON array

**Edge Cases**:
- [ ] Create patient without authentication (should fail, no audit)
- [ ] Create patient with invalid data (should fail, no audit)
- [ ] Create patient via Tinker (should still create audit)

### Scenario 2: Patient Record Update Auditing
**Objective**: Verify that updating a patient record logs old and new values

**Steps**:
1. Authenticate as admin user
2. Update existing patient: `PUT /api/v1/patients/{id}` with body:
   ```json
   {
     "blood_type": "O-"
   }
   ```
3. Query audit log:
   ```bash
   docker exec -it preclinic-mysql mysql -upreclinic_user -ppassword preclinic \
     -e "SELECT event, old_values, new_values FROM audits WHERE auditable_id=<patient_id> AND event='updated' ORDER BY created_at DESC LIMIT 1;"
   ```

**Expected Results**:
- Audit entry with `event` = 'updated'
- `old_values` contains previous blood_type (e.g., 'A+')
- `new_values` contains new blood_type (e.g., 'O-')
- Only changed fields appear in old/new values
- Timestamp reflects update time

**Edge Cases**:
- [ ] Update without changing any values (should not create audit)
- [ ] Update multiple fields simultaneously (all changes logged)
- [ ] Update with same value (should not create audit entry)

### Scenario 3: Patient Record Deletion Auditing
**Objective**: Verify that deleting a patient record is audited

**Steps**:
1. Authenticate as admin user
2. Create test patient
3. Delete patient: `DELETE /api/v1/patients/{id}`
4. Query audit log for delete event

**Expected Results**:
- Audit entry with `event` = 'deleted'
- `old_values` contains all patient data before deletion
- Patient record still retrievable from audit log even after deletion

**Edge Cases**:
- [ ] Delete non-existent patient (should fail, no audit)
- [ ] Delete patient without permission (should fail, no audit)

### Scenario 4: Medical Record Auditing
**Objective**: Verify medical records are audited

**Steps**:
1. Create a medical record via API
2. Update the medical record (change diagnosis)
3. Query audits for medical record

**Expected Results**:
- Both create and update events are audited
- Sensitive fields (diagnosis, treatment_plan, notes) are captured
- Doctor ID and patient ID are in audit log

### Scenario 5: Audit Retrieval API - Get All Audits
**Objective**: Test retrieving audit logs via API

**Steps**:
1. Authenticate as admin user with audit permissions
2. Create several test records (patients, medical records)
3. Call: `GET /api/v1/audits`

**Expected Results**:
- Returns paginated list of audits
- Each audit contains: id, user_id, event, auditable_type, auditable_id, created_at
- Results ordered by created_at descending (most recent first)
- Pagination metadata included (total, per_page, current_page)

**Edge Cases**:
- [ ] User without 'view_audits' permission gets 403 Forbidden
- [ ] Empty database returns empty array with success response
- [ ] Pagination works correctly with per_page parameter

### Scenario 6: Audit Retrieval API - Filter by User
**Objective**: Test filtering audits by user

**Steps**:
1. Authenticate as admin
2. Create records as different users
3. Call: `GET /api/v1/audits?user_id=<specific_user_id>`

**Expected Results**:
- Returns only audits for specified user
- All returned audits have matching user_id
- Other users' audits are not included

### Scenario 7: Audit Retrieval API - Filter by Date Range
**Objective**: Test date range filtering

**Steps**:
1. Create records on different dates (may need to manually adjust created_at in DB)
2. Call: `GET /api/v1/audits?start_date=2026-01-01&end_date=2026-01-15`

**Expected Results**:
- Returns only audits within date range
- All returned audits have created_at between start and end dates

### Scenario 8: Compliance Report Generation
**Objective**: Test compliance report generation

**Steps**:
1. Authenticate as admin
2. Create various test data
3. Call: `POST /api/v1/audits/report` with body:
   ```json
   {
     "start_date": "2026-01-01",
     "end_date": "2026-01-31"
   }
   ```

**Expected Results**:
- Returns report with:
  - Period (start and end dates)
  - Total actions count
  - Actions grouped by event type (created, updated, deleted)
  - Actions grouped by user
  - Actions grouped by model type
  - Timestamp of report generation

### Scenario 9: Audit Export to CSV
**Objective**: Test CSV export functionality

**Steps**:
1. Authenticate as admin
2. Call: `POST /api/v1/audits/export` with body:
   ```json
   {
     "start_date": "2026-01-01",
     "end_date": "2026-01-31"
   }
   ```

**Expected Results**:
- Returns CSV file download
- Filename format: `audit_logs_YYYY-MM-DD_to_YYYY-MM-DD.csv`
- CSV contains columns: ID, User ID, User Name, Actor Type, Event, Model, Record ID, IP Address, Timestamp
- All audits in date range are included

**Edge Cases**:
- [ ] Export with no results returns empty CSV with headers
- [ ] Large exports (1000+ records) complete successfully
- [ ] Special characters in data are properly escaped

### Scenario 10: User Activity Tracking
**Objective**: Test individual user activity retrieval

**Steps**:
1. Authenticate as admin
2. Call: `GET /api/v1/audits/user/{userId}`

**Expected Results**:
- Returns all activity for specified user
- Includes details of which records they created/modified/deleted
- Pagination works correctly

**Edge Cases**:
- [ ] Users can view their own activity
- [ ] Users without 'view_all_audits' cannot view others' activity
- [ ] Admin can view any user's activity

### Scenario 11: Actor Type Tracking
**Objective**: Verify actor_type field is populated correctly

**Steps**:
1. Authenticate as a user who is a Doctor
2. Create a patient record
3. Query audit log and check actor_type

**Expected Results**:
- `actor_type` = 'Doctor'
- `actor_id` = doctor's ID from doctors table
- Same test for Patient, Staff, and Technician user types

### Scenario 12: IP Address and User Agent Capture
**Objective**: Verify request context is captured

**Steps**:
1. Make API request with custom User-Agent header
2. Query audit log

**Expected Results**:
- `ip_address` contains the request IP
- `user_agent` contains the User-Agent string
- `url` contains the full request URL

## Regression Testing
Test that existing functionality still works:
- [ ] Patient CRUD operations work normally
- [ ] Medical record CRUD operations work normally
- [ ] Appointment CRUD operations work normally
- [ ] Authentication and authorization still function correctly
- [ ] Existing tests still pass: `docker exec -it preclinic-app php artisan test`

## Performance Testing
- [ ] Creating 100 patient records completes in reasonable time (< 5 seconds)
- [ ] Querying audits table with 10,000+ records is performant
- [ ] Audit table indexes are used (check with EXPLAIN query)

## Security Testing
- [ ] Audit logs cannot be deleted via API
- [ ] Audit logs cannot be modified via API
- [ ] Users without permissions cannot access audit endpoints
- [ ] Audit logs do not expose sensitive data in API responses (passwords, tokens, etc.)

## HIPAA Compliance Verification
- [ ] All patient data modifications are logged
- [ ] All medical record modifications are logged
- [ ] User identity is captured for all actions
- [ ] Timestamp is accurate and timezone-aware
- [ ] Audit logs are immutable (cannot be edited or deleted)
- [ ] Audit data retention is configured (6 years minimum)

## Known Issues / Limitations
- Audit logs for console commands (Tinker) may not capture IP address or user agent
- Bulk operations may create many audit entries (expected behavior)
- Audit logs do not track read-only access (only create/update/delete) - future enhancement

## Rollback Instructions
If critical issues are found:
1. Remove auditing traits from models:
   ```bash
   # Revert model changes
   git checkout HEAD~1 -- app/Models/Patient.php
   # Repeat for other models
   ```
2. Rollback migration:
   ```bash
   docker exec -it preclinic-app php artisan migrate:rollback
   ```
3. Remove package:
   ```bash
   docker exec -it preclinic-app composer remove owen-it/laravel-auditing
   ```
```

#### 4. Run Tests
**Commands**:
```bash
# Run all tests
docker exec -it preclinic-app php artisan test

# Run specific test file
docker exec -it preclinic-app php artisan test --filter=AuditLoggingTest

# Run with coverage (if configured)
docker exec -it preclinic-app php artisan test --coverage
```

### Success Criteria:

#### Automated Verification:
- [ ] All feature tests pass: `docker exec -it preclinic-app php artisan test --filter=AuditLoggingTest`
- [ ] All unit tests pass: `docker exec -it preclinic-app php artisan test --filter=AuditModelTest`
- [ ] Test coverage for audit functionality is > 80%
- [ ] No linting errors: `docker exec -it preclinic-app ./vendor/bin/pint`
- [ ] API documentation includes audit endpoints: `docker exec -it preclinic-app php artisan scramble:generate`

#### Manual Verification:
- [ ] Manual testing guide completed successfully
- [ ] All test scenarios pass
- [ ] Edge cases tested and documented
- [ ] Performance is acceptable (audit operations add < 50ms overhead)
- [ ] Security requirements verified (immutability, authorization)
- [ ] HIPAA compliance checklist completed

**Implementation Note**: After completing this phase and all automated verification passes, this implementation is complete. The manual testing guide should be executed by the human to verify HIPAA compliance.

---

## Testing Strategy

### Unit Tests:
- Audit model attribute casting and fillable fields
- Audit model scopes (byUser, dateRange, byEvent, etc.)
- UserResolver returns correct context
- Policy authorization rules

### Integration Tests:
- Model changes trigger audit log creation
- Audit logs capture correct old/new values
- User context is properly resolved and stored
- Middleware captures IP and user agent
- API endpoints return correct data
- Filters and pagination work correctly
- CSV export generates valid files
- Compliance reports contain accurate statistics

### Edge Cases:
- Unauthenticated requests do not create audits
- Console/Tinker operations are audited (where possible)
- Mass updates create individual audit entries
- Failed validations do not create audits
- Soft-deleted models trigger audit events (when implemented)
- Unauthorized users cannot access audit APIs
- Audit logs cannot be modified or deleted

### Manual Testing:
- Full user workflow testing per manual testing guide
- HIPAA compliance verification
- Performance testing with realistic data volumes
- Security testing (authorization, immutability)
- CSV export validation
- Compliance report accuracy

## Performance Considerations

### Database Optimization:
- **Indexes**: The audits table has indexes on:
  - `user_id` and `user_type` (composite)
  - `auditable_id` and `auditable_type` (composite)
  - `event`
  - `created_at`
  - `actor_type`
- **Estimated Impact**: < 50ms overhead per audited operation
- **Query Optimization**: All audit retrieval queries use indexed columns

### Audit Table Growth:
- **Expected Growth**: ~1000-5000 audit entries per day (estimate based on 100 daily patient interactions)
- **Retention Policy**: Configure via scheduled job to archive/delete audits older than 6 years (HIPAA minimum)
- **Storage Estimate**: ~1KB per audit entry = ~1.8GB per year for 5000 daily audits

### Mitigation Strategies:
1. **Partitioning**: Consider table partitioning by year after 1M+ records
2. **Archival**: Move old audits to archive table after 2 years
3. **Async Processing**: Critical operations remain synchronous; consider async for non-critical events
4. **Selective Auditing**: Only audit specified models (already implemented)

## Migration Notes

### Data Migration:
- **No retroactive auditing**: Existing data will not have audit history
- **Fresh start**: Audits begin from migration date forward
- **No data loss**: Existing operations continue without interruption

### Deployment Steps:
1. Create new branch from `develop`
2. Install package via Docker: `docker exec -it preclinic-app composer require owen-it/laravel-auditing`
3. Publish configuration
4. Run migration to create audits table
5. Update models with Auditable trait
6. Deploy user resolver and middleware
7. Deploy API controllers and routes
8. Seed audit permissions
9. Run automated tests
10. Execute manual testing guide
11. Monitor performance after deployment

### Rollback Plan:
If issues arise:
1. Remove Auditable trait from models (revert commits)
2. Rollback migration: `docker exec -it preclinic-app php artisan migrate:rollback`
3. Remove package: `docker exec -it preclinic-app composer remove owen-it/laravel-auditing`
4. No data loss - audit table can be preserved for analysis

## References

- Original critical review: `C:\PolarCode\PreClinic\Pre-Clinic-System-Critical-Review.md` (Issue #19)
- Laravel Auditing Package: [https://github.com/owen-it/laravel-auditing](https://github.com/owen-it/laravel-auditing)
- HIPAA Audit Controls: HIPAA 164.312(b) - Audit Control Standard
- Research: [Auditing Sensitive Data Changes in Laravel](https://dev.to/azmy/auditing-sensitive-data-changes-in-laravel-securing-high-risk-operations-9n3)
- Research: [Laravel App Auditing: The Right Approach](https://lucidsoftech.com/blog/laravel-app-auditing-the-right-approach)
- Project Guidelines: `.claude/project_guidelines.md`
