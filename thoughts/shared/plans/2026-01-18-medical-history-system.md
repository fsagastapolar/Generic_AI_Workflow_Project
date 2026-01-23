# Medical History System Implementation Plan

## Overview

This plan implements a comprehensive, HIPAA-aligned medical history system for PreClinic that enables interdisciplinary collaboration among medical professionals. The system provides chronological medical observations, professional annotations, full audit trails, and flexible role-based access control.

## Current State Analysis

### Existing Infrastructure
- **Patient table**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2025_08_12_100008_create_patients_table.php`
  - Has `id` column (no need for new `patient_id`)
  - Foreign key to `users.id` via `user_id`

- **Existing medical_histories table**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2025_08_12_201747_create_patient_medical_histories_table.php`
  - Very basic: `condition`, `diagnosed_date`, `status`, `notes`
  - **NO author tracking, NO categories, NO annotations, NO audit trail**
  - **WILL BE COMPLETELY REDESIGNED**

- **User & Role System**: Uses Spatie Laravel Permission package
  - Medical professional roles: `doctor`, `staff`, `medical_director`
  - Administrative roles: `health_center_manager`, `admin`, `Super-Admin`
  - Other roles: `patient`, `technician`, `technical_supervisor`

- **Authorization Patterns**: Policy-based with health center scoping
  - Example: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\TechnicianPolicy.php:28-29`
  - Pattern: Managers can access resources within their assigned health centers

- **Soft Deletes**: NOT currently implemented project-wide
  - Will implement ONLY for medical history system initially
  - See: `C:\PolarCode\PreClinic\Pre-Clinic-System-Critical-Review.md:304-313`

### Key Discoveries
- Appointment model has `created_by` pattern: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2025_08_12_100013_create_appointments_table.php:23`
- BaseController provides standardized API responses: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\BaseController.php`
- Docker service names: `app` (Laravel), `mysql` (database), `phpmyadmin` (admin)

## Desired End State

A medical history system where:
1. **All medical professionals** can create chronological medical history entries
2. **Entries are categorized** by specialty (Clinical, Psych, Kinesio, Allergies, etc.)
3. **Access is role-based** with manager override capabilities
4. **Every action is audited** (who created, edited, deleted, accessed)
5. **Annotations allow collaboration** without modifying original entries
6. **Critical alerts** are flagged at category level for high-priority conditions
7. **Categories are manageable** with suggestion/approval workflow
8. **Full version history** tracks all changes to entries

### Verification
After full implementation:
- Medical history entries display author, timestamps, edit indicators
- Annotations appear as child records under entries
- Access grants are logged and enforceable
- Category management has approval workflow
- All audit trails are queryable

## What We're NOT Doing

**Out of Scope (See Future Enhancements Document):**
- Global "Red Alert" UI component (frontend concern)
- UI implementation for medical history display
- Mobile app integration
- Advanced analytics/reporting on medical histories
- Automated reminders for critical conditions
- Integration with external medical record systems (HL7/FHIR)
- Document/image attachments to medical history entries
- Template-based entry creation
- AI-assisted entry suggestions
- Export to PDF/print formatting
- Project-wide soft delete implementation (only medical history for now)

## Implementation Approach

**Phased Rollout Strategy:**
- **Phase 1**: Database foundation with core CRUD
- **Phase 2**: Collaboration via annotations
- **Phase 3**: Advanced security and audit trails
- **Phase 4**: Dynamic category management

**Risk Mitigation:**
- Each phase is independently testable
- Database changes tested in Docker MySQL environment
- Seeder ensures reproducible test data
- Manual testing guide created after each phase

---

# Phase 1: Core Medical History Foundation

## Overview
Establish the foundational database structure for medical history entries with author tracking, soft deletes, categories, and basic CRUD operations.

## Changes Required

### 1. Drop and Recreate Medical History Table [ALready Implemented]

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2025_08_12_201747_create_patient_medical_histories_table.php`

**Action**: REPLACE entire migration content

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_entries', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('category_id')->constrained('medical_history_categories')->onDelete('restrict');
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->onDelete('restrict');

            $table->text('content'); // Main narrative content
            $table->boolean('is_edited')->default(false); // Quick flag for UI

            $table->timestamps(); // created_at, updated_at
            $table->softDeletes(); // deleted_at

            // Indexes for performance
            $table->index(['patient_id', 'category_id', 'deleted_at'], 'mhe_patient_cat_idx');
            $table->index(['created_by', 'created_at'], 'mhe_author_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_entries');
    }
};
```

**Rationale:**
- `content` replaces old `condition` + `notes` - single narrative field
- `created_by`, `updated_by`, `deleted_by` track all user actions
- `is_edited` flag for quick UI rendering without checking timestamps
- Soft deletes via `softDeletes()` for HIPAA compliance
- Foreign key to categories table for flexible categorization

---

### 2. Create Medical History Categories Table [ALready Implemented]

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2026_01_18_100001_create_medical_history_categories_table.php`

**Action**: CREATE new migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_categories', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100)->unique(); // e.g., "Clinical / General"
            $table->string('slug', 100)->unique(); // e.g., "clinical-general"
            $table->text('description')->nullable();
            $table->boolean('is_critical_enabled')->default(false); // Only certain categories can be critical
            $table->boolean('is_active')->default(true);
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->index('is_active');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_categories');
    }
};
```

**Rationale:**
- `is_critical_enabled` determines which categories can be marked as critical (e.g., Allergies, Chronic Conditions)
- `slug` for URL-friendly identifiers
- `sort_order` for UI display ordering
- `is_active` allows soft disabling without deletion

---

### 3. Create MedicalHistoryEntry Model [ALready Implemented]

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryEntry.php`

**Action**: CREATE new file (replaces old `PatientMedicalHistory.php`)

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MedicalHistoryEntry extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'patient_id',
        'category_id',
        'created_by',
        'updated_by',
        'deleted_by',
        'content',
        'is_edited',
    ];

    protected $casts = [
        'is_edited' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function category()
    {
        return $this->belongsTo(MedicalHistoryCategory::class, 'category_id');
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lastEditor()
    {
        return $this->belongsTo(User::class, 'updated_by');
    }

    public function deleter()
    {
        return $this->belongsTo(User::class, 'deleted_by');
    }

    // Boot method to auto-set created_by and updated_by
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($entry) {
            $entry->created_by = auth()->id();
        });

        static::updating(function ($entry) {
            $entry->updated_by = auth()->id();
            $entry->is_edited = true;
        });

        static::deleting(function ($entry) {
            if ($entry->isForceDeleting()) {
                return; // Don't track deleted_by for force deletes
            }
            $entry->deleted_by = auth()->id();
            $entry->save(); // Save deleted_by before soft delete
        });
    }
}
```

---

### 4. Create MedicalHistoryCategory Model [ALready Implemented]

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryCategory.php`

**Action**: CREATE new file

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MedicalHistoryCategory extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_critical_enabled',
        'is_active',
        'sort_order',
    ];

    protected $casts = [
        'is_critical_enabled' => 'boolean',
        'is_active' => 'boolean',
        'sort_order' => 'integer',
    ];

    // Relationships
    public function entries()
    {
        return $this->hasMany(MedicalHistoryEntry::class, 'category_id');
    }

    // Auto-generate slug from name
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($category) {
            if (empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });

        static::updating(function ($category) {
            if ($category->isDirty('name') && empty($category->slug)) {
                $category->slug = Str::slug($category->name);
            }
        });
    }

    // Scope for active categories only
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    // Scope for categories allowing critical flags
    public function scopeCriticalEnabled($query)
    {
        return $query->where('is_critical_enabled', true);
    }
}
```

---

### 5. Update Patient Model Relationship

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\Patient.php`

**Action**: REPLACE line 46-49

**OLD:**
```php
public function medicalHistories()
{
    return $this->hasMany(PatientMedicalHistory::class);
}
```

**NEW:**
```php
public function medicalHistoryEntries()
{
    return $this->hasMany(MedicalHistoryEntry::class);
}
```

---

### 6. Create Seeder for Initial Categories

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\seeders\MedicalHistoryCategorySeeder.php`

**Action**: CREATE new file

```php
<?php

namespace Database\Seeders;

use App\Models\MedicalHistoryCategory;
use Illuminate\Database\Seeder;

class MedicalHistoryCategorySeeder extends Seeder
{
    public function run(): void
    {
        $categories = [
            [
                'name' => 'Clinical / General',
                'slug' => 'clinical-general',
                'description' => 'General medical observations, diagnoses, and treatments',
                'is_critical_enabled' => true,
                'sort_order' => 1,
            ],
            [
                'name' => 'Surgical & Trauma',
                'slug' => 'surgical-trauma',
                'description' => 'Surgical procedures, injuries, and trauma history',
                'is_critical_enabled' => false,
                'sort_order' => 2,
            ],
            [
                'name' => 'Allergies',
                'slug' => 'allergies',
                'description' => 'Known allergies and adverse reactions',
                'is_critical_enabled' => true,
                'sort_order' => 3,
            ],
            [
                'name' => 'Mental Health & Psychosocial',
                'slug' => 'mental-health',
                'description' => 'Psychological assessments, mental health conditions, and social factors',
                'is_critical_enabled' => false,
                'sort_order' => 4,
            ],
            [
                'name' => 'Physical & Functional',
                'slug' => 'physical-functional',
                'description' => 'Kinesiological assessments, physical therapy, mobility issues',
                'is_critical_enabled' => false,
                'sort_order' => 5,
            ],
            [
                'name' => 'Habits & Lifestyle',
                'slug' => 'habits-lifestyle',
                'description' => 'Smoking, alcohol, diet, exercise, and other lifestyle factors',
                'is_critical_enabled' => false,
                'sort_order' => 6,
            ],
            [
                'name' => 'Family History',
                'slug' => 'family-history',
                'description' => 'Hereditary conditions and family medical background',
                'is_critical_enabled' => false,
                'sort_order' => 7,
            ],
        ];

        foreach ($categories as $category) {
            MedicalHistoryCategory::firstOrCreate(
                ['slug' => $category['slug']],
                $category
            );
        }
    }
}
```

---

### 7. Update DatabaseSeeder

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\seeders\DatabaseSeeder.php`

**Action**: ADD to seeder call chain

Find the seeder call section and add:

```php
$this->call([
    // ... existing seeders
    MedicalHistoryCategorySeeder::class,
    // ... other seeders
]);
```

---

### 8. Create MedicalHistoryEntry Policy

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\MedicalHistoryEntryPolicy.php`

**Action**: CREATE new file

```php
<?php

namespace App\Policies;

use App\Models\MedicalHistoryEntry;
use App\Models\User;

class MedicalHistoryEntryPolicy
{
    /**
     * Medical professionals who can create entries by default
     */
    private function isMedicalProfessional(User $user): bool
    {
        return $user->hasAnyRole(['doctor', 'staff', 'medical_director']);
    }

    /**
     * Determine if user can view any medical history entries.
     * Phase 1: Only medical professionals
     * Phase 3: Will add access grant checks
     */
    public function viewAny(User $user): bool
    {
        return $this->isMedicalProfessional($user);
    }

    /**
     * Determine if user can view a specific entry.
     */
    public function view(User $user, MedicalHistoryEntry $entry): bool
    {
        // Medical professionals can view
        // Phase 3: Will add access grant checks for non-medical professionals
        return $this->isMedicalProfessional($user);
    }

    /**
     * Determine if user can create medical history entries.
     */
    public function create(User $user): bool
    {
        return $this->isMedicalProfessional($user);
    }

    /**
     * Determine if user can update an entry.
     * Only the original author can edit.
     */
    public function update(User $user, MedicalHistoryEntry $entry): bool
    {
        // Only original author
        return $user->id === $entry->created_by;
    }

    /**
     * Determine if user can soft delete an entry.
     * Author or health_center_manager can delete.
     */
    public function delete(User $user, MedicalHistoryEntry $entry): bool
    {
        // Author can delete
        if ($user->id === $entry->created_by) {
            return true;
        }

        // Health center managers can delete
        if ($user->hasRole('health_center_manager')) {
            return true;
        }

        return false;
    }

    /**
     * Determine if user can restore a soft-deleted entry.
     * Same permissions as delete.
     */
    public function restore(User $user, MedicalHistoryEntry $entry): bool
    {
        return $this->delete($user, $entry);
    }

    /**
     * Determine if user can permanently delete an entry.
     * Only Super-Admin for now (Gate::before handles this).
     */
    public function forceDelete(User $user, MedicalHistoryEntry $entry): bool
    {
        // Only Super-Admin via Gate::before bypass
        return false;
    }
}
```

---

### 9. Register Policy in AuthServiceProvider

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Providers\AuthServiceProvider.php`

**Action**: ADD to $policies array (around line 23-28)

```php
protected $policies = [
    HealthCenter::class => HealthCenterPolicy::class,
    Doctor::class => DoctorPolicy::class,
    Patient::class => PatientPolicy::class,
    User::class => UserPolicy::class,
    MedicalHistoryEntry::class => MedicalHistoryEntryPolicy::class, // ADD THIS
];
```

---

### 10. Create MedicalHistoryEntryController

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryEntryController.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryEntry;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MedicalHistoryEntryController extends BaseController
{
    use AuthorizesRequests;

    /**
     * Display medical history entries for a patient.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MedicalHistoryEntry::class);

        $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'category_id' => 'nullable|exists:medical_history_categories,id',
            'per_page' => 'integer|min:1|max:100',
            'include_deleted' => 'boolean',
        ]);

        $perPage = $request->input('per_page', 50);

        $query = MedicalHistoryEntry::with([
            'patient.user.profile',
            'category',
            'author.profile',
            'lastEditor.profile',
            'deleter.profile',
        ])
        ->where('patient_id', $request->patient_id);

        // Filter by category if specified
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }

        // Include soft-deleted entries if requested and user is manager
        if ($request->input('include_deleted', false) && auth()->user()->hasRole('health_center_manager')) {
            $query->withTrashed();
        }

        $entries = $query->orderBy('created_at', 'desc')->paginate($perPage);

        return $this->sendPaginatedResponse($entries, 'Medical history entries retrieved successfully');
    }

    /**
     * Store a newly created medical history entry.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', MedicalHistoryEntry::class);

        $validated = $request->validate([
            'patient_id' => 'required|exists:patients,id',
            'category_id' => 'required|exists:medical_history_categories,id',
            'content' => 'required|string|min:10|max:10000',
        ]);

        $entry = MedicalHistoryEntry::create($validated);
        $entry->load(['patient.user.profile', 'category', 'author.profile']);

        return $this->sendResponse($entry, 'Medical history entry created successfully', 201);
    }

    /**
     * Display a specific medical history entry.
     */
    public function show(MedicalHistoryEntry $medicalHistoryEntry): JsonResponse
    {
        $this->authorize('view', $medicalHistoryEntry);

        $medicalHistoryEntry->load([
            'patient.user.profile',
            'category',
            'author.profile',
            'lastEditor.profile',
            'deleter.profile',
        ]);

        return $this->sendResponse($medicalHistoryEntry, 'Medical history entry retrieved successfully');
    }

    /**
     * Update a medical history entry (author only).
     */
    public function update(Request $request, MedicalHistoryEntry $medicalHistoryEntry): JsonResponse
    {
        $this->authorize('update', $medicalHistoryEntry);

        $validated = $request->validate([
            'content' => 'required|string|min:10|max:10000',
            'category_id' => 'nullable|exists:medical_history_categories,id',
        ]);

        $medicalHistoryEntry->update($validated);
        $medicalHistoryEntry->load(['patient.user.profile', 'category', 'author.profile', 'lastEditor.profile']);

        return $this->sendResponse($medicalHistoryEntry, 'Medical history entry updated successfully');
    }

    /**
     * Soft delete a medical history entry.
     */
    public function destroy(MedicalHistoryEntry $medicalHistoryEntry): JsonResponse
    {
        $this->authorize('delete', $medicalHistoryEntry);

        $medicalHistoryEntry->delete(); // Soft delete

        return $this->sendResponse(null, 'Medical history entry deleted successfully');
    }

    /**
     * Restore a soft-deleted entry.
     */
    public function restore(int $id): JsonResponse
    {
        $entry = MedicalHistoryEntry::withTrashed()->findOrFail($id);

        $this->authorize('restore', $entry);

        $entry->restore();
        $entry->load(['patient.user.profile', 'category', 'author.profile']);

        return $this->sendResponse($entry, 'Medical history entry restored successfully');
    }
}
```

---

### 11. Create MedicalHistoryCategoryController

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryCategoryController.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryCategory;
use Illuminate\Http\JsonResponse;

class MedicalHistoryCategoryController extends BaseController
{
    /**
     * Display all active categories.
     */
    public function index(): JsonResponse
    {
        $categories = MedicalHistoryCategory::active()
            ->orderBy('sort_order')
            ->get();

        return $this->sendResponse($categories, 'Categories retrieved successfully');
    }

    /**
     * Display a specific category.
     */
    public function show(MedicalHistoryCategory $category): JsonResponse
    {
        return $this->sendResponse($category, 'Category retrieved successfully');
    }
}
```

**Note**: Full CRUD for categories deferred to Phase 4.

---

### 12. Add API Routes

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\routes\api.php`

**Action**: ADD inside `auth:api` middleware group

```php
Route::group([
    'middleware' => 'auth:api',
], function () {
    // ... existing routes

    // Medical History Entry routes
    Route::prefix('v1/medical-history')->group(function () {
        Route::get('/entries', [MedicalHistoryEntryController::class, 'index'])->name('v1.medical-history.index');
        Route::post('/entries', [MedicalHistoryEntryController::class, 'store'])->name('v1.medical-history.store');
        Route::get('/entries/{medicalHistoryEntry}', [MedicalHistoryEntryController::class, 'show'])->name('v1.medical-history.show');
        Route::put('/entries/{medicalHistoryEntry}', [MedicalHistoryEntryController::class, 'update'])->name('v1.medical-history.update');
        Route::delete('/entries/{medicalHistoryEntry}', [MedicalHistoryEntryController::class, 'destroy'])->name('v1.medical-history.destroy');
        Route::post('/entries/{id}/restore', [MedicalHistoryEntryController::class, 'restore'])->name('v1.medical-history.restore');

        // Categories
        Route::get('/categories', [MedicalHistoryCategoryController::class, 'index'])->name('v1.medical-history.categories.index');
        Route::get('/categories/{category}', [MedicalHistoryCategoryController::class, 'show'])->name('v1.medical-history.categories.show');
    });
});
```

**Add use statements at top:**
```php
use App\Http\Controllers\API\V1\MedicalHistoryEntryController;
use App\Http\Controllers\API\V1\MedicalHistoryCategoryController;
```

---

## Success Criteria

### Automated Verification:
- [x] Database migrations run successfully: `docker exec -it preclinic-app php artisan migrate:fresh`
- [x] Categories seeder populates 7 categories: `docker exec -it preclinic-app php artisan db:seed --class=MedicalHistoryCategorySeeder`
- [x] All tables exist in MySQL: `docker exec -it preclinic-mysql mysql -u preclinic_user -p -e "SHOW TABLES FROM preclinic;"`
- [x] Model relationships load correctly via Tinker:
  ```bash
  docker exec -it preclinic-app php artisan tinker
  >>> $entry = App\Models\MedicalHistoryEntry::with(['author', 'category'])->first();
  >>> $entry->author->name
  >>> $entry->category->name
  ```
- [x] Unit tests pass: `docker exec -it preclinic-app php artisan test --filter MedicalHistoryEntry` (22 tests, 76 assertions)
- [x] API endpoints return 200 for authorized users
- [x] API endpoints return 403 for unauthorized users (e.g., patient role)

### Manual Verification:
- [ ] Create medical history entry as doctor via API
- [ ] Verify `created_by` is set correctly
- [ ] Edit entry as author, verify `updated_by` and `is_edited` flag
- [ ] Attempt edit as different user, verify 403 response
- [ ] Soft delete entry, verify `deleted_at` and `deleted_by` are set
- [ ] Restore entry as manager, verify entry is accessible again
- [ ] Filter entries by category, verify only matching entries returned
- [ ] Verify soft-deleted entries excluded from index by default
- [ ] Verify managers can view soft-deleted entries with `include_deleted=true`

**Implementation Note**: After completing Phase 1 and all automated verification passes, create a manual testing guide at `thoughts/shared/testing/2026-01-18-phase1-medical-history-manual-test-guide.md` documenting the manual verification steps. Pause for human confirmation before proceeding to Phase 2.

---

# Phase 2: Annotations & Basic Audit Tracking

## Overview
Enable medical professionals to collaboratively comment on medical history entries without modifying the original content. Add visual indicators for edited and deleted entries.

## Changes Required

### 1. Create Medical History Annotations Table

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2026_01_18_200001_create_medical_history_annotations_table.php`

**Action**: CREATE new migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_annotations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_history_entry_id')
                ->constrained('medical_history_entries')
                ->onDelete('cascade');
            $table->foreignId('created_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('updated_by')->nullable()->constrained('users')->onDelete('restrict');
            $table->foreignId('deleted_by')->nullable()->constrained('users')->onDelete('restrict');

            $table->text('content');
            $table->boolean('is_edited')->default(false);

            $table->timestamps();
            $table->softDeletes();

            $table->index(['medical_history_entry_id', 'deleted_at'], 'mha_entry_idx');
            $table->index(['created_by', 'created_at'], 'mha_author_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_annotations');
    }
};
```

---

### 2. Create MedicalHistoryAnnotation Model

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryAnnotation.php`

**Action**: CREATE new file

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MedicalHistoryAnnotation extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'medical_history_entry_id',
        'created_by',
        'updated_by',
        'deleted_by',
        'content',
        'is_edited',
    ];

    protected $casts = [
        'is_edited' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
        'deleted_at' => 'datetime',
    ];

    // Relationships
    public function medicalHistoryEntry()
    {
        return $this->belongsTo(MedicalHistoryEntry::class);
    }

    public function author()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    public function lastEditor()
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

        static::creating(function ($annotation) {
            $annotation->created_by = auth()->id();
        });

        static::updating(function ($annotation) {
            $annotation->updated_by = auth()->id();
            $annotation->is_edited = true;
        });

        static::deleting(function ($annotation) {
            if ($annotation->isForceDeleting()) {
                return;
            }
            $annotation->deleted_by = auth()->id();
            $annotation->save();
        });
    }
}
```

---

### 3. Update MedicalHistoryEntry Model

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryEntry.php`

**Action**: ADD relationship method

```php
public function annotations()
{
    return $this->hasMany(MedicalHistoryAnnotation::class);
}
```

---

### 4. Create MedicalHistoryAnnotation Policy

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\MedicalHistoryAnnotationPolicy.php`

**Action**: CREATE new file

```php
<?php

namespace App\Policies;

use App\Models\MedicalHistoryAnnotation;
use App\Models\User;

class MedicalHistoryAnnotationPolicy
{
    private function isMedicalProfessional(User $user): bool
    {
        return $user->hasAnyRole(['doctor', 'staff', 'medical_director']);
    }

    /**
     * All medical professionals can view annotations.
     */
    public function viewAny(User $user): bool
    {
        return $this->isMedicalProfessional($user);
    }

    /**
     * All medical professionals can create annotations.
     */
    public function create(User $user): bool
    {
        return $this->isMedicalProfessional($user);
    }

    /**
     * Only the author can update their annotation.
     */
    public function update(User $user, MedicalHistoryAnnotation $annotation): bool
    {
        return $user->id === $annotation->created_by;
    }

    /**
     * Author or managers can delete annotations.
     */
    public function delete(User $user, MedicalHistoryAnnotation $annotation): bool
    {
        if ($user->id === $annotation->created_by) {
            return true;
        }

        if ($user->hasRole('health_center_manager')) {
            return true;
        }

        return false;
    }

    /**
     * Same as delete.
     */
    public function restore(User $user, MedicalHistoryAnnotation $annotation): bool
    {
        return $this->delete($user, $annotation);
    }
}
```

---

### 5. Register Annotation Policy

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Providers\AuthServiceProvider.php`

**Action**: ADD to $policies array

```php
MedicalHistoryAnnotation::class => MedicalHistoryAnnotationPolicy::class,
```

---

### 6. Create MedicalHistoryAnnotationController

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryAnnotationController.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryAnnotation;
use App\Models\MedicalHistoryEntry;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MedicalHistoryAnnotationController extends BaseController
{
    use AuthorizesRequests;

    /**
     * Display annotations for a medical history entry.
     */
    public function index(Request $request, int $entryId): JsonResponse
    {
        $this->authorize('viewAny', MedicalHistoryAnnotation::class);

        $entry = MedicalHistoryEntry::findOrFail($entryId);

        $query = MedicalHistoryAnnotation::with([
            'author.profile',
            'lastEditor.profile',
            'deleter.profile',
        ])
        ->where('medical_history_entry_id', $entryId);

        // Include soft-deleted annotations if user is manager
        if ($request->input('include_deleted', false) && auth()->user()->hasRole('health_center_manager')) {
            $query->withTrashed();
        }

        $annotations = $query->orderBy('created_at', 'asc')->get();

        return $this->sendResponse($annotations, 'Annotations retrieved successfully');
    }

    /**
     * Store a new annotation.
     */
    public function store(Request $request, int $entryId): JsonResponse
    {
        $this->authorize('create', MedicalHistoryAnnotation::class);

        $entry = MedicalHistoryEntry::findOrFail($entryId);

        $validated = $request->validate([
            'content' => 'required|string|min:5|max:5000',
        ]);

        $annotation = MedicalHistoryAnnotation::create([
            'medical_history_entry_id' => $entryId,
            'content' => $validated['content'],
        ]);

        $annotation->load(['author.profile']);

        return $this->sendResponse($annotation, 'Annotation created successfully', 201);
    }

    /**
     * Update an annotation.
     */
    public function update(Request $request, MedicalHistoryAnnotation $annotation): JsonResponse
    {
        $this->authorize('update', $annotation);

        $validated = $request->validate([
            'content' => 'required|string|min:5|max:5000',
        ]);

        $annotation->update($validated);
        $annotation->load(['author.profile', 'lastEditor.profile']);

        return $this->sendResponse($annotation, 'Annotation updated successfully');
    }

    /**
     * Soft delete an annotation.
     */
    public function destroy(MedicalHistoryAnnotation $annotation): JsonResponse
    {
        $this->authorize('delete', $annotation);

        $annotation->delete();

        return $this->sendResponse(null, 'Annotation deleted successfully');
    }

    /**
     * Restore a soft-deleted annotation.
     */
    public function restore(int $id): JsonResponse
    {
        $annotation = MedicalHistoryAnnotation::withTrashed()->findOrFail($id);

        $this->authorize('restore', $annotation);

        $annotation->restore();
        $annotation->load(['author.profile']);

        return $this->sendResponse($annotation, 'Annotation restored successfully');
    }
}
```

---

### 7. Add Annotation Routes

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\routes\api.php`

**Action**: ADD inside medical-history prefix group

```php
// Inside existing medical-history prefix group
Route::prefix('v1/medical-history')->group(function () {
    // ... existing entry routes

    // Annotations
    Route::get('/entries/{entryId}/annotations', [MedicalHistoryAnnotationController::class, 'index'])
        ->name('v1.medical-history.annotations.index');
    Route::post('/entries/{entryId}/annotations', [MedicalHistoryAnnotationController::class, 'store'])
        ->name('v1.medical-history.annotations.store');
    Route::put('/annotations/{annotation}', [MedicalHistoryAnnotationController::class, 'update'])
        ->name('v1.medical-history.annotations.update');
    Route::delete('/annotations/{annotation}', [MedicalHistoryAnnotationController::class, 'destroy'])
        ->name('v1.medical-history.annotations.destroy');
    Route::post('/annotations/{id}/restore', [MedicalHistoryAnnotationController::class, 'restore'])
        ->name('v1.medical-history.annotations.restore');
});
```

**Add use statement:**
```php
use App\Http\Controllers\API\V1\MedicalHistoryAnnotationController;
```

---

### 8. Update MedicalHistoryEntryController Index

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryEntryController.php`

**Action**: MODIFY `index()` method eager loading

**Change line ~22:**
```php
$query = MedicalHistoryEntry::with([
    'patient.user.profile',
    'category',
    'author.profile',
    'lastEditor.profile',
    'deleter.profile',
    'annotations' => function ($query) {
        $query->whereNull('deleted_at') // Exclude soft-deleted annotations
              ->with(['author.profile', 'lastEditor.profile'])
              ->orderBy('created_at', 'asc');
    },
])
```

**Rationale**: Frontend can display annotation count and preview without separate API call.

---

## Success Criteria

### Automated Verification:
- [x] Annotation migration runs successfully: `docker exec -it preclinic-app php artisan migrate`
- [x] Annotation model relationships work:
  ```bash
  docker exec -it preclinic-app php artisan tinker
  >>> $annotation = App\Models\MedicalHistoryAnnotation::with(['author', 'medicalHistoryEntry'])->first();
  >>> $annotation->author->name
  >>> $annotation->medicalHistoryEntry->content
  ```
- [x] Annotation API endpoints return 200 for authorized users
- [x] Unauthorized users get 403 on annotation creation

### Manual Verification:
- [ ] Create annotation on medical history entry as doctor
- [ ] Verify annotation appears in entry's annotations list
- [ ] Edit annotation as author, verify `is_edited` flag and `updated_by`
- [ ] Attempt to edit another user's annotation, verify 403
- [ ] Delete annotation as author, verify soft delete
- [ ] Restore annotation as manager
- [ ] Verify entry index shows annotation count
- [ ] Verify UI can display "Edited at {datetime} by {author}" for edited entries
- [ ] Verify UI can display "Deleted at {datetime} by {user}" for soft-deleted entries (when shown to managers)

**Implementation Note**: After Phase 2 completion, create manual testing guide at `thoughts/shared/testing/2026-01-18-phase2-annotations-manual-test-guide.md`. Pause for human confirmation before Phase 3.

---

# Phase 3: Full Audit Trail & Access Control System

## Overview
Implement comprehensive version history tracking and flexible access control allowing managers to grant/revoke access to individual users or entire role groups.

## Changes Required

### 1. Create Medical History Audit Trail Table

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2026_01_18_300001_create_medical_history_audit_trail_table.php`

**Action**: CREATE new migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_audit_trail', function (Blueprint $table) {
            $table->id();
            $table->foreignId('medical_history_entry_id')
                ->constrained('medical_history_entries')
                ->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');

            $table->enum('event', [
                'created',
                'updated',
                'deleted',
                'restored',
                'accessed', // Track who viewed sensitive medical data
            ]);

            $table->json('old_values')->nullable(); // Snapshot before change
            $table->json('new_values')->nullable(); // Snapshot after change

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamp('created_at');

            // Indexes for querying
            $table->index(['medical_history_entry_id', 'event', 'created_at'], 'mhat_entry_event_idx');
            $table->index(['user_id', 'created_at'], 'mhat_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_audit_trail');
    }
};
```

**Rationale:**
- Immutable audit log (no updates or deletes, only inserts)
- Stores full snapshots of old/new values for diff comparison
- Tracks IP and user agent for security compliance
- `accessed` event tracks read operations for HIPAA compliance

---

### 2. Create Access Grants Table

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2026_01_18_300002_create_medical_history_access_grants_table.php`

**Action**: CREATE new migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_access_grants', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('granted_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('revoked_by')->nullable()->constrained('users')->onDelete('restrict');

            // Grant can apply to EITHER a specific user OR an entire role
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            $table->string('role_name')->nullable(); // e.g., 'technician', 'patient'

            $table->boolean('is_active')->default(true);
            $table->text('reason')->nullable(); // Why was access granted?
            $table->timestamp('revoked_at')->nullable();
            $table->text('revoke_reason')->nullable();

            $table->timestamps();

            // Indexes
            $table->index(['patient_id', 'is_active'], 'mhag_patient_active_idx');
            $table->index(['user_id', 'is_active'], 'mhag_user_active_idx');
            $table->index(['role_name', 'is_active'], 'mhag_role_active_idx');

            // Ensure either user_id or role_name is set, but not both
            // This will be enforced in application logic via validation
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_access_grants');
    }
};
```

**Rationale:**
- `user_id` XOR `role_name` pattern allows both individual and group grants
- `granted_by` and `revoked_by` track manager actions
- `is_active` allows soft revocation without deletion
- Full audit trail of grants via timestamps and reasons

---

### 3. Create Access Grant Audit Table

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2026_01_18_300003_create_medical_history_access_audit_table.php`

**Action**: CREATE new migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_access_audit', function (Blueprint $table) {
            $table->id();
            $table->foreignId('patient_id')->constrained('patients')->onDelete('cascade');
            $table->foreignId('user_id')->constrained('users')->onDelete('restrict');
            $table->foreignId('performed_by')->constrained('users')->onDelete('restrict');

            $table->enum('action', ['granted', 'revoked']);
            $table->enum('grant_type', ['individual', 'role']); // Was it to a user or role?
            $table->string('role_name')->nullable(); // If grant_type = role
            $table->text('reason')->nullable();

            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->timestamp('created_at');

            $table->index(['patient_id', 'action', 'created_at'], 'mhaa_patient_idx');
            $table->index(['user_id', 'created_at'], 'mhaa_user_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_access_audit');
    }
};
```

**Rationale:**
- Separate immutable audit log for access grant/revoke operations
- Tracks WHO granted access to WHOM for WHICH patient
- Complements main audit trail

---

### 4. Create MedicalHistoryAuditTrail Model

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryAuditTrail.php`

**Action**: CREATE new file

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalHistoryAuditTrail extends Model
{
    use HasFactory;

    // No updates allowed - immutable audit log
    const UPDATED_AT = null;

    protected $table = 'medical_history_audit_trail';

    protected $fillable = [
        'medical_history_entry_id',
        'user_id',
        'event',
        'old_values',
        'new_values',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'old_values' => 'array',
        'new_values' => 'array',
        'created_at' => 'datetime',
    ];

    // Relationships
    public function medicalHistoryEntry()
    {
        return $this->belongsTo(MedicalHistoryEntry::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Static helper to log an audit event.
     */
    public static function logEvent(
        int $entryId,
        string $event,
        ?array $oldValues = null,
        ?array $newValues = null
    ): self {
        return self::create([
            'medical_history_entry_id' => $entryId,
            'user_id' => auth()->id(),
            'event' => $event,
            'old_values' => $oldValues,
            'new_values' => $newValues,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
```

---

### 5. Create MedicalHistoryAccessGrant Model

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryAccessGrant.php`

**Action**: CREATE new file

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalHistoryAccessGrant extends Model
{
    use HasFactory;

    protected $fillable = [
        'patient_id',
        'granted_by',
        'revoked_by',
        'user_id',
        'role_name',
        'is_active',
        'reason',
        'revoked_at',
        'revoke_reason',
    ];

    protected $casts = [
        'is_active' => 'boolean',
        'revoked_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function grantedByUser()
    {
        return $this->belongsTo(User::class, 'granted_by');
    }

    public function revokedByUser()
    {
        return $this->belongsTo(User::class, 'revoked_by');
    }

    public function grantedUser()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    // Scopes
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    public function scopeForUser($query, int $userId)
    {
        return $query->where('user_id', $userId);
    }

    public function scopeForRole($query, string $roleName)
    {
        return $query->where('role_name', $roleName);
    }

    /**
     * Check if a user has access to a patient's medical history.
     */
    public static function userHasAccess(int $userId, int $patientId): bool
    {
        $user = User::find($userId);

        if (!$user) {
            return false;
        }

        // Check individual grant
        $individualGrant = self::active()
            ->where('patient_id', $patientId)
            ->where('user_id', $userId)
            ->exists();

        if ($individualGrant) {
            return true;
        }

        // Check role-based grant
        $userRoles = $user->getRoleNames()->toArray();

        $roleGrant = self::active()
            ->where('patient_id', $patientId)
            ->whereIn('role_name', $userRoles)
            ->exists();

        return $roleGrant;
    }
}
```

---

### 6. Create MedicalHistoryAccessAudit Model

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryAccessAudit.php`

**Action**: CREATE new file

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class MedicalHistoryAccessAudit extends Model
{
    use HasFactory;

    const UPDATED_AT = null;

    protected $table = 'medical_history_access_audit';

    protected $fillable = [
        'patient_id',
        'user_id',
        'performed_by',
        'action',
        'grant_type',
        'role_name',
        'reason',
        'ip_address',
        'user_agent',
    ];

    protected $casts = [
        'created_at' => 'datetime',
    ];

    // Relationships
    public function patient()
    {
        return $this->belongsTo(Patient::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function performedBy()
    {
        return $this->belongsTo(User::class, 'performed_by');
    }

    /**
     * Log an access grant or revoke event.
     */
    public static function logAccessChange(
        int $patientId,
        int $affectedUserId,
        string $action,
        string $grantType,
        ?string $roleName = null,
        ?string $reason = null
    ): self {
        return self::create([
            'patient_id' => $patientId,
            'user_id' => $affectedUserId,
            'performed_by' => auth()->id(),
            'action' => $action,
            'grant_type' => $grantType,
            'role_name' => $roleName,
            'reason' => $reason,
            'ip_address' => request()->ip(),
            'user_agent' => request()->userAgent(),
        ]);
    }
}
```

---

### 7. Update MedicalHistoryEntry Model with Audit Observers

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryEntry.php`

**Action**: MODIFY boot() method to add audit logging

**REPLACE the entire boot() method:**

```php
protected static function boot()
{
    parent::boot();

    // Set created_by
    static::creating(function ($entry) {
        $entry->created_by = auth()->id();

        // Log creation (will be logged in 'created' event after save)
    });

    // Log creation event AFTER entry is saved
    static::created(function ($entry) {
        MedicalHistoryAuditTrail::logEvent(
            $entry->id,
            'created',
            null,
            $entry->only(['patient_id', 'category_id', 'content', 'created_by'])
        );
    });

    // Track updates
    static::updating(function ($entry) {
        $entry->updated_by = auth()->id();
        $entry->is_edited = true;
    });

    // Log update event
    static::updated(function ($entry) {
        MedicalHistoryAuditTrail::logEvent(
            $entry->id,
            'updated',
            $entry->getOriginal(), // Old values
            $entry->getAttributes() // New values
        );
    });

    // Track soft deletes
    static::deleting(function ($entry) {
        if ($entry->isForceDeleting()) {
            return;
        }
        $entry->deleted_by = auth()->id();
        $entry->save();
    });

    // Log delete event
    static::deleted(function ($entry) {
        if ($entry->isForceDeleting()) {
            return; // Don't log force deletes
        }

        MedicalHistoryAuditTrail::logEvent(
            $entry->id,
            'deleted',
            $entry->getOriginal(),
            null
        );
    });

    // Log restore event
    static::restored(function ($entry) {
        MedicalHistoryAuditTrail::logEvent(
            $entry->id,
            'restored',
            null,
            $entry->getAttributes()
        );
    });
}
```

**ADD relationship method:**

```php
public function auditTrail()
{
    return $this->hasMany(MedicalHistoryAuditTrail::class);
}
```

---

### 8. Update MedicalHistoryEntryPolicy with Access Grant Checks

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\MedicalHistoryEntryPolicy.php`

**Action**: MODIFY `view()` and `viewAny()` methods

**REPLACE entire policy content:**

```php
<?php

namespace App\Policies;

use App\Models\MedicalHistoryEntry;
use App\Models\MedicalHistoryAccessGrant;
use App\Models\User;

class MedicalHistoryEntryPolicy
{
    private function isMedicalProfessional(User $user): bool
    {
        return $user->hasAnyRole(['doctor', 'staff', 'medical_director']);
    }

    public function viewAny(User $user): bool
    {
        // Medical professionals have default access
        if ($this->isMedicalProfessional($user)) {
            return true;
        }

        // Check if user has ANY access grants (will filter by patient in controller)
        return MedicalHistoryAccessGrant::active()
            ->where(function ($query) use ($user) {
                $query->where('user_id', $user->id)
                      ->orWhereIn('role_name', $user->getRoleNames()->toArray());
            })
            ->exists();
    }

    public function view(User $user, MedicalHistoryEntry $entry): bool
    {
        // Medical professionals have default access
        if ($this->isMedicalProfessional($user)) {
            return true;
        }

        // Check access grants for this specific patient
        return MedicalHistoryAccessGrant::userHasAccess($user->id, $entry->patient_id);
    }

    public function create(User $user): bool
    {
        return $this->isMedicalProfessional($user);
    }

    public function update(User $user, MedicalHistoryEntry $entry): bool
    {
        return $user->id === $entry->created_by;
    }

    public function delete(User $user, MedicalHistoryEntry $entry): bool
    {
        if ($user->id === $entry->created_by) {
            return true;
        }

        if ($user->hasRole('health_center_manager')) {
            return true;
        }

        return false;
    }

    public function restore(User $user, MedicalHistoryEntry $entry): bool
    {
        return $this->delete($user, $entry);
    }

    public function forceDelete(User $user, MedicalHistoryEntry $entry): bool
    {
        return false;
    }
}
```

---

### 9. Create MedicalHistoryAccessGrantController

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryAccessGrantController.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryAccessGrant;
use App\Models\MedicalHistoryAccessAudit;
use App\Models\Patient;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Validation\Rule;

class MedicalHistoryAccessGrantController extends BaseController
{
    /**
     * List all access grants for a patient.
     * Only managers can view.
     */
    public function index(Request $request, int $patientId): JsonResponse
    {
        if (!auth()->user()->hasRole('health_center_manager')) {
            return $this->sendError('Unauthorized', [], 403);
        }

        $patient = Patient::findOrFail($patientId);

        $grants = MedicalHistoryAccessGrant::with([
            'grantedByUser.profile',
            'revokedByUser.profile',
            'grantedUser.profile',
        ])
        ->where('patient_id', $patientId)
        ->orderBy('created_at', 'desc')
        ->get();

        return $this->sendResponse($grants, 'Access grants retrieved successfully');
    }

    /**
     * Grant access to a user or role.
     */
    public function store(Request $request, int $patientId): JsonResponse
    {
        if (!auth()->user()->hasRole('health_center_manager')) {
            return $this->sendError('Unauthorized', [], 403);
        }

        $patient = Patient::findOrFail($patientId);

        $validated = $request->validate([
            'user_id' => 'nullable|exists:users,id|required_without:role_name',
            'role_name' => [
                'nullable',
                'required_without:user_id',
                Rule::in(['patient', 'technician', 'technical_supervisor']),
            ],
            'reason' => 'nullable|string|max:500',
        ]);

        // Ensure only ONE of user_id or role_name is set
        if ($request->filled('user_id') && $request->filled('role_name')) {
            return $this->sendError('Validation Error', [
                'grant_type' => 'Cannot grant to both individual user and role simultaneously'
            ], 422);
        }

        // Check for existing active grant
        $existingGrant = MedicalHistoryAccessGrant::active()
            ->where('patient_id', $patientId);

        if ($request->filled('user_id')) {
            $existingGrant->where('user_id', $validated['user_id']);
        } else {
            $existingGrant->where('role_name', $validated['role_name']);
        }

        if ($existingGrant->exists()) {
            return $this->sendError('Grant already exists', [], 409);
        }

        // Create grant
        $grant = MedicalHistoryAccessGrant::create([
            'patient_id' => $patientId,
            'granted_by' => auth()->id(),
            'user_id' => $validated['user_id'] ?? null,
            'role_name' => $validated['role_name'] ?? null,
            'reason' => $validated['reason'] ?? null,
            'is_active' => true,
        ]);

        // Log in access audit
        MedicalHistoryAccessAudit::logAccessChange(
            $patientId,
            $validated['user_id'] ?? 0, // 0 if role-based
            'granted',
            $request->filled('user_id') ? 'individual' : 'role',
            $validated['role_name'] ?? null,
            $validated['reason'] ?? null
        );

        $grant->load(['grantedByUser.profile', 'grantedUser.profile']);

        return $this->sendResponse($grant, 'Access granted successfully', 201);
    }

    /**
     * Revoke access grant.
     */
    public function destroy(Request $request, int $grantId): JsonResponse
    {
        if (!auth()->user()->hasRole('health_center_manager')) {
            return $this->sendError('Unauthorized', [], 403);
        }

        $grant = MedicalHistoryAccessGrant::findOrFail($grantId);

        $validated = $request->validate([
            'revoke_reason' => 'nullable|string|max:500',
        ]);

        $grant->update([
            'is_active' => false,
            'revoked_by' => auth()->id(),
            'revoked_at' => now(),
            'revoke_reason' => $validated['revoke_reason'] ?? null,
        ]);

        // Log revocation
        MedicalHistoryAccessAudit::logAccessChange(
            $grant->patient_id,
            $grant->user_id ?? 0,
            'revoked',
            $grant->user_id ? 'individual' : 'role',
            $grant->role_name,
            $validated['revoke_reason'] ?? null
        );

        return $this->sendResponse($grant, 'Access revoked successfully');
    }

    /**
     * View access audit log for a patient.
     */
    public function auditLog(int $patientId): JsonResponse
    {
        if (!auth()->user()->hasRole('health_center_manager')) {
            return $this->sendError('Unauthorized', [], 403);
        }

        $patient = Patient::findOrFail($patientId);

        $auditLog = MedicalHistoryAccessAudit::with([
            'user.profile',
            'performedBy.profile',
        ])
        ->where('patient_id', $patientId)
        ->orderBy('created_at', 'desc')
        ->get();

        return $this->sendResponse($auditLog, 'Access audit log retrieved successfully');
    }
}
```

---

### 10. Create MedicalHistoryAuditController

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryAuditController.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryAuditTrail;
use App\Models\MedicalHistoryEntry;
use Illuminate\Http\JsonResponse;

class MedicalHistoryAuditController extends BaseController
{
    /**
     * Get full audit trail for a medical history entry.
     * Medical professionals and managers can view.
     */
    public function show(int $entryId): JsonResponse
    {
        $entry = MedicalHistoryEntry::findOrFail($entryId);

        // Authorization check via policy
        if (!auth()->user()->can('view', $entry) && !auth()->user()->hasRole('health_center_manager')) {
            return $this->sendError('Unauthorized', [], 403);
        }

        $auditTrail = MedicalHistoryAuditTrail::with(['user.profile'])
            ->where('medical_history_entry_id', $entryId)
            ->orderBy('created_at', 'desc')
            ->get();

        return $this->sendResponse($auditTrail, 'Audit trail retrieved successfully');
    }
}
```

---

### 11. Add Middleware for Access Logging

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Middleware\LogMedicalHistoryAccess.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Middleware;

use App\Models\MedicalHistoryAuditTrail;
use Closure;
use Illuminate\Http\Request;

class LogMedicalHistoryAccess
{
    /**
     * Log when medical history entries are accessed (read).
     */
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);

        // Only log successful GET requests to individual entries
        if ($request->isMethod('GET') && $response->isSuccessful()) {
            // Check if route is showing a specific entry
            $entryId = $request->route('medicalHistoryEntry')?->id;

            if ($entryId) {
                MedicalHistoryAuditTrail::logEvent(
                    $entryId,
                    'accessed',
                    null,
                    null
                );
            }
        }

        return $response;
    }
}
```

---

### 12. Register Middleware

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\bootstrap\app.php`

**Action**: ADD middleware alias

Find the middleware aliases section and add:

```php
->withMiddleware(function (Middleware $middleware) {
    $middleware->alias([
        // ... existing aliases
        'log.medical.access' => \App\Http\Middleware\LogMedicalHistoryAccess::class,
    ]);
})
```

---

### 13. Apply Middleware to Routes

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\routes\api.php`

**Action**: MODIFY medical history entry show route

**CHANGE:**
```php
Route::get('/entries/{medicalHistoryEntry}', [MedicalHistoryEntryController::class, 'show'])
    ->name('v1.medical-history.show')
    ->middleware('log.medical.access'); // ADD THIS
```

---

### 14. Add Access Grant Routes

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\routes\api.php`

**Action**: ADD inside medical-history prefix group

```php
Route::prefix('v1/medical-history')->group(function () {
    // ... existing routes

    // Access Grants (managers only)
    Route::get('/patients/{patientId}/access-grants', [MedicalHistoryAccessGrantController::class, 'index'])
        ->name('v1.medical-history.access-grants.index');
    Route::post('/patients/{patientId}/access-grants', [MedicalHistoryAccessGrantController::class, 'store'])
        ->name('v1.medical-history.access-grants.store');
    Route::delete('/access-grants/{grantId}', [MedicalHistoryAccessGrantController::class, 'destroy'])
        ->name('v1.medical-history.access-grants.destroy');
    Route::get('/patients/{patientId}/access-audit', [MedicalHistoryAccessGrantController::class, 'auditLog'])
        ->name('v1.medical-history.access-audit');

    // Audit Trail
    Route::get('/entries/{entryId}/audit', [MedicalHistoryAuditController::class, 'show'])
        ->name('v1.medical-history.audit.show');
});
```

**Add use statements:**
```php
use App\Http\Controllers\API\V1\MedicalHistoryAccessGrantController;
use App\Http\Controllers\API\V1\MedicalHistoryAuditController;
```

---

## Success Criteria

### Automated Verification:
- [x] All Phase 3 migrations run successfully: `docker exec -it preclinic-app php artisan migrate`
- [x] Audit trail records created events:
  ```bash
  docker exec -it preclinic-app php artisan tinker
  >>> $entry = App\Models\MedicalHistoryEntry::create([...]);
  >>> $entry->auditTrail()->count() // Should be > 0
  >>> $entry->auditTrail()->first()->event // Should be 'created'
  ```
- [x] Access grant models work correctly:
  ```bash
  >>> App\Models\MedicalHistoryAccessGrant::userHasAccess($userId, $patientId)
  ```
- [x] Middleware logs access events for GET requests
- [x] API endpoints return 403 for users without grants

### Manual Verification:
- [ ] Create medical history entry, verify audit trail shows 'created' event
- [ ] Edit entry, verify audit trail shows 'updated' event with old/new values
- [ ] Delete entry, verify audit trail shows 'deleted' event
- [ ] Restore entry, verify audit trail shows 'restored' event
- [ ] View entry as medical professional, verify 'accessed' event logged
- [ ] Manager grants access to individual user (e.g., technician), verify grant created
- [ ] Technician can now view patient's medical history
- [ ] Manager grants access to entire role (e.g., all technicians), verify grant created
- [ ] All technicians can view patient's medical history
- [ ] Manager revokes access, verify grant marked inactive and audit logged
- [ ] Revoked user cannot access medical history anymore
- [ ] View access audit log, verify all grant/revoke operations logged with manager info

**Implementation Note**: After Phase 3 completion, create manual testing guide at `thoughts/shared/testing/2026-01-18-phase3-audit-access-manual-test-guide.md`. Pause for human confirmation before Phase 4.

---

# Phase 4: Category Management System

## Overview
Enable dynamic category management with suggestion/approval workflow, allowing authorized users to create categories and lower-level users to suggest new ones pending approval.

## Changes Required

### 1. Create Category Suggestions Table

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2026_01_18_400001_create_medical_history_category_suggestions_table.php`

**Action**: CREATE new migration

```php
<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('medical_history_category_suggestions', function (Blueprint $table) {
            $table->id();
            $table->string('name', 100);
            $table->string('slug', 100);
            $table->text('description')->nullable();
            $table->boolean('is_critical_enabled')->default(false);
            $table->integer('sort_order')->default(0);

            $table->foreignId('suggested_by')->constrained('users')->onDelete('restrict');
            $table->foreignId('reviewed_by')->nullable()->constrained('users')->onDelete('restrict');

            $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
            $table->text('review_notes')->nullable(); // Why was it approved/rejected?
            $table->timestamp('reviewed_at')->nullable();

            $table->foreignId('category_id')->nullable()->constrained('medical_history_categories')->onDelete('set null');
            // Links to created category if approved

            $table->timestamps();

            $table->index(['status', 'created_at'], 'mhcs_status_idx');
            $table->index('suggested_by');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('medical_history_category_suggestions');
    }
};
```

---

### 2. Create MedicalHistoryCategorySuggestion Model

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Models\MedicalHistoryCategorySuggestion.php`

**Action**: CREATE new file

```php
<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class MedicalHistoryCategorySuggestion extends Model
{
    use HasFactory;

    protected $fillable = [
        'name',
        'slug',
        'description',
        'is_critical_enabled',
        'sort_order',
        'suggested_by',
        'reviewed_by',
        'status',
        'review_notes',
        'reviewed_at',
        'category_id',
    ];

    protected $casts = [
        'is_critical_enabled' => 'boolean',
        'sort_order' => 'integer',
        'reviewed_at' => 'datetime',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    // Relationships
    public function suggestedByUser()
    {
        return $this->belongsTo(User::class, 'suggested_by');
    }

    public function reviewedByUser()
    {
        return $this->belongsTo(User::class, 'reviewed_by');
    }

    public function createdCategory()
    {
        return $this->belongsTo(MedicalHistoryCategory::class, 'category_id');
    }

    // Scopes
    public function scopePending($query)
    {
        return $query->where('status', 'pending');
    }

    public function scopeApproved($query)
    {
        return $query->where('status', 'approved');
    }

    public function scopeRejected($query)
    {
        return $query->where('status', 'rejected');
    }

    // Auto-generate slug
    protected static function boot()
    {
        parent::boot();

        static::creating(function ($suggestion) {
            if (empty($suggestion->slug)) {
                $suggestion->slug = Str::slug($suggestion->name);
            }
            $suggestion->suggested_by = auth()->id();
        });
    }
}
```

---

### 3. Create MedicalHistoryCategoryPolicy

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\MedicalHistoryCategoryPolicy.php`

**Action**: CREATE new file

```php
<?php

namespace App\Policies;

use App\Models\MedicalHistoryCategory;
use App\Models\User;

class MedicalHistoryCategoryPolicy
{
    /**
     * All authenticated users can view categories.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * All authenticated users can view a category.
     */
    public function view(User $user, MedicalHistoryCategory $category): bool
    {
        return true;
    }

    /**
     * Only managers and medical directors can create categories.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['health_center_manager', 'medical_director']);
    }

    /**
     * Only managers and medical directors can update categories.
     */
    public function update(User $user, MedicalHistoryCategory $category): bool
    {
        return $user->hasAnyRole(['health_center_manager', 'medical_director']);
    }

    /**
     * Only managers and medical directors can delete categories.
     */
    public function delete(User $user, MedicalHistoryCategory $category): bool
    {
        return $user->hasAnyRole(['health_center_manager', 'medical_director']);
    }
}
```

---

### 4. Create MedicalHistoryCategorySuggestionPolicy

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\MedicalHistoryCategorySuggestionPolicy.php`

**Action**: CREATE new file

```php
<?php

namespace App\Policies;

use App\Models\MedicalHistoryCategorySuggestion;
use App\Models\User;

class MedicalHistoryCategorySuggestionPolicy
{
    /**
     * Managers can view all suggestions; users can view their own.
     */
    public function viewAny(User $user): bool
    {
        return $user->hasAnyRole(['health_center_manager', 'medical_director', 'doctor', 'staff']);
    }

    /**
     * All medical professionals can suggest categories.
     */
    public function create(User $user): bool
    {
        return $user->hasAnyRole(['doctor', 'staff', 'medical_director', 'technician']);
    }

    /**
     * Only the suggester can update their pending suggestion.
     */
    public function update(User $user, MedicalHistoryCategorySuggestion $suggestion): bool
    {
        return $suggestion->status === 'pending' && $user->id === $suggestion->suggested_by;
    }

    /**
     * Only the suggester can delete their pending suggestion.
     */
    public function delete(User $user, MedicalHistoryCategorySuggestion $suggestion): bool
    {
        return $suggestion->status === 'pending' && $user->id === $suggestion->suggested_by;
    }

    /**
     * Only managers and medical directors can approve/reject.
     */
    public function review(User $user, MedicalHistoryCategorySuggestion $suggestion): bool
    {
        return $user->hasAnyRole(['health_center_manager', 'medical_director']);
    }
}
```

---

### 5. Register Policies

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Providers\AuthServiceProvider.php`

**Action**: ADD to $policies array

```php
MedicalHistoryCategory::class => MedicalHistoryCategoryPolicy::class,
MedicalHistoryCategorySuggestion::class => MedicalHistoryCategorySuggestionPolicy::class,
```

---

### 6. Update MedicalHistoryCategoryController (Full CRUD)

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryCategoryController.php`

**Action**: REPLACE entire file content

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MedicalHistoryCategoryController extends BaseController
{
    use AuthorizesRequests;

    /**
     * Display all active categories (public).
     */
    public function index(): JsonResponse
    {
        $categories = MedicalHistoryCategory::active()
            ->orderBy('sort_order')
            ->get();

        return $this->sendResponse($categories, 'Categories retrieved successfully');
    }

    /**
     * Display all categories including inactive (managers only).
     */
    public function indexAll(): JsonResponse
    {
        $this->authorize('create', MedicalHistoryCategory::class); // Reuse create permission

        $categories = MedicalHistoryCategory::orderBy('sort_order')->get();

        return $this->sendResponse($categories, 'All categories retrieved successfully');
    }

    /**
     * Display a specific category.
     */
    public function show(MedicalHistoryCategory $category): JsonResponse
    {
        return $this->sendResponse($category, 'Category retrieved successfully');
    }

    /**
     * Create a new category (managers only).
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', MedicalHistoryCategory::class);

        $validated = $request->validate([
            'name' => 'required|string|max:100|unique:medical_history_categories,name',
            'description' => 'nullable|string|max:500',
            'is_critical_enabled' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $category = MedicalHistoryCategory::create($validated);

        return $this->sendResponse($category, 'Category created successfully', 201);
    }

    /**
     * Update a category (managers only).
     */
    public function update(Request $request, MedicalHistoryCategory $category): JsonResponse
    {
        $this->authorize('update', $category);

        $validated = $request->validate([
            'name' => 'string|max:100|unique:medical_history_categories,name,' . $category->id,
            'description' => 'nullable|string|max:500',
            'is_critical_enabled' => 'boolean',
            'is_active' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $category->update($validated);

        return $this->sendResponse($category, 'Category updated successfully');
    }

    /**
     * Soft disable a category (managers only).
     */
    public function destroy(MedicalHistoryCategory $category): JsonResponse
    {
        $this->authorize('delete', $category);

        // Don't actually delete - just mark inactive
        $category->update(['is_active' => false]);

        return $this->sendResponse(null, 'Category deactivated successfully');
    }
}
```

---

### 7. Create MedicalHistoryCategorySuggestionController

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\V1\MedicalHistoryCategorySuggestionController.php`

**Action**: CREATE new file

```php
<?php

namespace App\Http\Controllers\API\V1;

use App\Http\Controllers\API\BaseController;
use App\Models\MedicalHistoryCategorySuggestion;
use App\Models\MedicalHistoryCategory;
use Illuminate\Http\Request;
use Illuminate\Http\JsonResponse;
use Illuminate\Foundation\Auth\Access\AuthorizesRequests;

class MedicalHistoryCategorySuggestionController extends BaseController
{
    use AuthorizesRequests;

    /**
     * List suggestions.
     * Managers see all; users see only their own.
     */
    public function index(Request $request): JsonResponse
    {
        $this->authorize('viewAny', MedicalHistoryCategorySuggestion::class);

        $query = MedicalHistoryCategorySuggestion::with([
            'suggestedByUser.profile',
            'reviewedByUser.profile',
            'createdCategory',
        ]);

        // Filter by status if provided
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        // Managers see all; others see only their own
        if (!auth()->user()->hasAnyRole(['health_center_manager', 'medical_director'])) {
            $query->where('suggested_by', auth()->id());
        }

        $suggestions = $query->orderBy('created_at', 'desc')->get();

        return $this->sendResponse($suggestions, 'Suggestions retrieved successfully');
    }

    /**
     * Create a suggestion.
     */
    public function store(Request $request): JsonResponse
    {
        $this->authorize('create', MedicalHistoryCategorySuggestion::class);

        $validated = $request->validate([
            'name' => 'required|string|max:100',
            'description' => 'nullable|string|max:500',
            'is_critical_enabled' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $suggestion = MedicalHistoryCategorySuggestion::create($validated);
        $suggestion->load(['suggestedByUser.profile']);

        return $this->sendResponse($suggestion, 'Suggestion submitted successfully', 201);
    }

    /**
     * Update a pending suggestion.
     */
    public function update(Request $request, MedicalHistoryCategorySuggestion $suggestion): JsonResponse
    {
        $this->authorize('update', $suggestion);

        $validated = $request->validate([
            'name' => 'string|max:100',
            'description' => 'nullable|string|max:500',
            'is_critical_enabled' => 'boolean',
            'sort_order' => 'integer|min:0',
        ]);

        $suggestion->update($validated);

        return $this->sendResponse($suggestion, 'Suggestion updated successfully');
    }

    /**
     * Delete a pending suggestion.
     */
    public function destroy(MedicalHistoryCategorySuggestion $suggestion): JsonResponse
    {
        $this->authorize('delete', $suggestion);

        $suggestion->delete();

        return $this->sendResponse(null, 'Suggestion deleted successfully');
    }

    /**
     * Approve a suggestion (creates category).
     */
    public function approve(Request $request, MedicalHistoryCategorySuggestion $suggestion): JsonResponse
    {
        $this->authorize('review', $suggestion);

        if ($suggestion->status !== 'pending') {
            return $this->sendError('Suggestion already reviewed', [], 409);
        }

        $validated = $request->validate([
            'review_notes' => 'nullable|string|max:500',
        ]);

        // Create the category
        $category = MedicalHistoryCategory::create([
            'name' => $suggestion->name,
            'slug' => $suggestion->slug,
            'description' => $suggestion->description,
            'is_critical_enabled' => $suggestion->is_critical_enabled,
            'sort_order' => $suggestion->sort_order,
            'is_active' => true,
        ]);

        // Update suggestion
        $suggestion->update([
            'status' => 'approved',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'] ?? null,
            'category_id' => $category->id,
        ]);

        $suggestion->load(['createdCategory', 'reviewedByUser.profile']);

        return $this->sendResponse($suggestion, 'Suggestion approved and category created');
    }

    /**
     * Reject a suggestion.
     */
    public function reject(Request $request, MedicalHistoryCategorySuggestion $suggestion): JsonResponse
    {
        $this->authorize('review', $suggestion);

        if ($suggestion->status !== 'pending') {
            return $this->sendError('Suggestion already reviewed', [], 409);
        }

        $validated = $request->validate([
            'review_notes' => 'required|string|max:500',
        ]);

        $suggestion->update([
            'status' => 'rejected',
            'reviewed_by' => auth()->id(),
            'reviewed_at' => now(),
            'review_notes' => $validated['review_notes'],
        ]);

        $suggestion->load(['reviewedByUser.profile']);

        return $this->sendResponse($suggestion, 'Suggestion rejected');
    }
}
```

---

### 8. Update Category Routes

**File**: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\routes\api.php`

**Action**: MODIFY medical-history/categories routes

**REPLACE category routes with:**

```php
Route::prefix('v1/medical-history')->group(function () {
    // ... existing entry routes

    // Categories (public read, manager CRUD)
    Route::get('/categories', [MedicalHistoryCategoryController::class, 'index'])
        ->name('v1.medical-history.categories.index');
    Route::get('/categories/all', [MedicalHistoryCategoryController::class, 'indexAll'])
        ->name('v1.medical-history.categories.index-all');
    Route::get('/categories/{category}', [MedicalHistoryCategoryController::class, 'show'])
        ->name('v1.medical-history.categories.show');
    Route::post('/categories', [MedicalHistoryCategoryController::class, 'store'])
        ->name('v1.medical-history.categories.store');
    Route::put('/categories/{category}', [MedicalHistoryCategoryController::class, 'update'])
        ->name('v1.medical-history.categories.update');
    Route::delete('/categories/{category}', [MedicalHistoryCategoryController::class, 'destroy'])
        ->name('v1.medical-history.categories.destroy');

    // Category Suggestions
    Route::get('/category-suggestions', [MedicalHistoryCategorySuggestionController::class, 'index'])
        ->name('v1.medical-history.category-suggestions.index');
    Route::post('/category-suggestions', [MedicalHistoryCategorySuggestionController::class, 'store'])
        ->name('v1.medical-history.category-suggestions.store');
    Route::put('/category-suggestions/{suggestion}', [MedicalHistoryCategorySuggestionController::class, 'update'])
        ->name('v1.medical-history.category-suggestions.update');
    Route::delete('/category-suggestions/{suggestion}', [MedicalHistoryCategorySuggestionController::class, 'destroy'])
        ->name('v1.medical-history.category-suggestions.destroy');
    Route::post('/category-suggestions/{suggestion}/approve', [MedicalHistoryCategorySuggestionController::class, 'approve'])
        ->name('v1.medical-history.category-suggestions.approve');
    Route::post('/category-suggestions/{suggestion}/reject', [MedicalHistoryCategorySuggestionController::class, 'reject'])
        ->name('v1.medical-history.category-suggestions.reject');
});
```

**Add use statement:**
```php
use App\Http\Controllers\API\V1\MedicalHistoryCategorySuggestionController;
```

---

## Success Criteria

### Automated Verification:
- [x] Phase 4 migration runs successfully: `docker exec -it preclinic-app php artisan migrate`
- [x] Category suggestion model works: Table structure verified, model relationships implemented correctly
- [ ] Category CRUD endpoints return 200 for managers
- [ ] Category CRUD endpoints return 403 for non-managers
- [ ] Suggestion workflow APIs return 200

### Manual Verification:
- [ ] Manager creates new category via API, verify it appears in category list
- [ ] Manager updates category, verify changes persisted
- [ ] Manager deactivates category, verify `is_active = false`
- [ ] Doctor suggests new category, verify suggestion created with status 'pending'
- [ ] Doctor updates their pending suggestion, verify changes saved
- [ ] Doctor attempts to update another user's suggestion, verify 403
- [ ] Manager approves suggestion, verify category created and suggestion status = 'approved'
- [ ] Manager rejects suggestion with reason, verify status = 'rejected' and reason stored
- [ ] View suggestion list as manager, verify all suggestions visible
- [ ] View suggestion list as doctor, verify only own suggestions visible
- [ ] Verify approved suggestion links to created category via `category_id`

**Implementation Note**: After Phase 4 completion, create manual testing guide at `thoughts/shared/testing/2026-01-18-phase4-category-management-manual-test-guide.md`. Pause for human confirmation that all 4 phases are complete.

---

# Testing Strategy

## Unit Tests

**Files to create:**
- `tests/Feature/API/MedicalHistoryEntryTest.php`
- `tests/Feature/API/MedicalHistoryAnnotationTest.php`
- `tests/Feature/API/MedicalHistoryAccessGrantTest.php`
- `tests/Feature/API/MedicalHistoryCategoryTest.php`

**Test Coverage:**
- Entry CRUD operations with different roles
- Soft delete and restore functionality
- Author-only edit enforcement
- Annotation creation and deletion
- Access grant individual and role-based
- Category suggestion workflow
- Audit trail creation on all events
- Policy authorization checks

## Integration Tests

**Scenarios:**
1. Full medical history workflow: Create entry → Add annotations → Edit entry → View audit trail
2. Access grant workflow: Grant access to technician → Verify access → Revoke → Verify denial
3. Category suggestion workflow: Suggest → Approve → Use in entry creation
4. Multi-user collaboration: Doctor creates entry → Psychologist adds annotation → Kinesiologist views

## Manual Testing Steps

**Phase 1:**
1. Create medical history entry as doctor for a patient
2. Verify entry appears in patient's history with correct author
3. Edit entry as author, verify `is_edited` flag and `updated_by`
4. Attempt edit as different user, expect 403
5. Soft delete entry, verify `deleted_at` and `deleted_by`
6. Restore as manager
7. Filter by category

**Phase 2:**
1. Add annotation to entry as different professional
2. Verify annotation appears in entry's annotation list
3. Edit annotation as author
4. Delete annotation as manager
5. Verify annotation count displays correctly

**Phase 3:**
1. Manager grants access to individual technician for patient
2. Technician views patient's medical history
3. Manager grants access to all technicians (role-based)
4. Verify all technicians can access
5. Manager revokes access
6. Verify audit log shows all grant/revoke operations
7. View entry audit trail, verify all events logged

**Phase 4:**
1. Doctor suggests new category "Nutrition & Dietetics"
2. Manager reviews and approves
3. Verify category appears in active list
4. Use new category in medical history entry
5. Staff suggests "Holistic Medicine"
6. Manager rejects with reason
7. Verify suggestion status = rejected

---

# Performance Considerations

## Database Indexing
- All foreign keys indexed automatically
- Composite indexes on frequently queried columns:
  - `medical_history_entries`: `(patient_id, category_id, deleted_at)`
  - `medical_history_audit_trail`: `(medical_history_entry_id, event, created_at)`
  - `medical_history_access_grants`: `(patient_id, is_active)`, `(user_id, is_active)`, `(role_name, is_active)`

## Query Optimization
- Eager load relationships to avoid N+1 queries
- Use pagination for large result sets (default 50 per page)
- Index on soft delete column for exclusion queries

## Audit Trail Growth
- Audit trail table will grow rapidly
- Consider archiving old audit records (>2 years) to separate table
- Monitor table size monthly

---

# Migration Notes

## Database Changes
Since we're in development:
1. Drop and reseed entire database: `docker exec -it preclinic-app php artisan migrate:fresh --seed`
2. No data migration required - all sample data comes from seeders

## API Version Compatibility
- All endpoints versioned under `/api/v1/medical-history`
- Future V2 can coexist without breaking V1 clients

## Rollback Strategy
If critical issues found:
1. Run migration rollback: `docker exec -it preclinic-app php artisan migrate:rollback --step=X`
2. Remove routes from `api.php`
3. Clear route cache: `docker exec -it preclinic-app php artisan route:clear`

---

# References

- Original concept: `C:\PolarCode\PreClinic\medicalRecordsPlanning\medical_hisotry_project_summary.md`
- Project guidelines: `C:\PolarCode\PreClinic\.claude\project_guidelines.md`
- Spatie permissions: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Policies\TechnicianPolicy.php:28-29`
- Existing appointment pattern: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\database\migrations\2025_08_12_100013_create_appointments_table.php:23`
- BaseController API responses: `C:\PolarCode\PreClinic\Pre-Clinic-Backend\app\Http\Controllers\API\BaseController.php`
