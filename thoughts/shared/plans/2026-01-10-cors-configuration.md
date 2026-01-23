# CORS Configuration Implementation Plan

## Overview

Implement proper Cross-Origin Resource Sharing (CORS) configuration for the Pre-Clinic medical system to restrict API access to authorized frontend origins only, replacing the current permissive default configuration that allows all origins.

## Current State Analysis

### What Exists Now:
- **Backend**: Laravel 11 running on Docker at `http://localhost:8000`
- **Frontend**: Angular 16 running locally at `http://localhost:4200`
- **Current CORS Setup**: Using Laravel's default vendor configuration (`vendor/laravel/framework/config/cors.php`)
  - `allowed_origins => ['*']` - **ALLOWS ALL ORIGINS** (security vulnerability)
  - `allowed_methods => ['*']` - Allows all HTTP methods
  - `allowed_headers => ['*']` - Allows all headers
  - `supports_credentials => false` - Does not support credentials
- **No Custom Config**: No `config/cors.php` file exists in the project
- **Middleware**: CORS middleware is mentioned in documentation (02_Routes.md:250) but no explicit configuration

### Security Risk:
From the critical review document (Pre-Clinic-System-Critical-Review.md:220-229):
- Frontend may not be able to call API OR CORS is too permissive
- Current configuration allows ANY website to make API calls to the backend
- For a HIPAA-aware medical system handling patient data, this is a **CRITICAL** security vulnerability
- Attackers could create malicious websites that make unauthorized API calls

### Key Discoveries:
- Laravel 11 uses `bootstrap/app.php:16` for middleware configuration (not Kernel.php)
- Frontend environment configured to call `http://localhost:8000/api/v1` (environment.ts:3)
- Production environment placeholder: `https://YOUR_PRODUCTION_DOMAIN/api/v1` (environment.prod.ts:3)
- Test scripts exist that test CORS with `Origin: http://localhost:4200` (run-tests.sh:234)
- Backend API paths that need CORS: `api/*` and `sanctum/csrf-cookie`

## Desired End State

### Specification:
1. **Custom CORS Configuration**: A `config/cors.php` file that:
   - Restricts allowed origins to specific, authorized domains
   - Uses environment variables for flexible configuration
   - Properly configures credentials support for authentication
   - Restricts methods and headers appropriately

2. **Environment-Specific Configuration**:
   - **Development**: Allow `http://localhost:4200` (Angular dev server) and `http://localhost:8000` (Laravel API)
   - **Production**: Restrict to production domain only (configurable via `.env`)

3. **Security Improvements**:
   - No wildcard origins in any environment
   - Proper credentials support for JWT authentication
   - Appropriate header restrictions
   - Method restrictions to only what's needed

### Verification:
1. CORS preflight requests (OPTIONS) return correct headers
2. Frontend can successfully make API calls from `http://localhost:4200`
3. Requests from unauthorized origins are blocked
4. Authentication headers (Authorization, Content-Type) are properly allowed
5. Configuration can be changed via environment variables without code changes

## What We're NOT Doing

- NOT modifying Angular frontend code (already correctly configured)
- NOT changing Docker configuration or ports
- NOT implementing CSRF protection (separate concern)
- NOT adding rate limiting (already addressed in separate review item #4)
- NOT modifying the bootstrap/app.php middleware registration (CORS is auto-registered by Laravel)
- NOT touching existing routes or controllers

## Implementation Approach

Laravel 11 automatically registers CORS middleware for API routes. We only need to publish and configure the CORS configuration file to override the permissive defaults. The approach is:

1. **Publish CORS Configuration**: Create custom `config/cors.php` file
2. **Update Environment Variables**: Add CORS-related variables to `.env.example` and documentation
3. **Test Configuration**: Verify CORS works correctly in development
4. **Document Configuration**: Update README and environment variable documentation

## Phase 1: Create Custom CORS Configuration

### Overview
Create a custom CORS configuration file that restricts origins based on environment variables and provides secure defaults for a medical system.

### Changes Required:

#### 1. CORS Configuration File
**File**: `config/cors.php` (new file)
**Changes**: Create custom CORS configuration with environment-based origin control

```php
<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Cross-Origin Resource Sharing (CORS) Configuration
    |--------------------------------------------------------------------------
    |
    | Configure CORS settings for the Pre-Clinic API. This configuration
    | restricts which origins can access the API to prevent unauthorized
    | cross-origin requests.
    |
    | For medical systems handling patient data (HIPAA compliance), it's
    | critical to restrict CORS to authorized domains only.
    |
    */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],

    /*
     | Allowed Origins Configuration
     |
     | IMPORTANT: Never use ['*'] in production for medical systems.
     |
     | Development: Set FRONTEND_URL=http://localhost:4200
     | Production: Set FRONTEND_URL=https://your-production-domain.com
     |
     | Multiple origins can be configured as comma-separated values:
     | FRONTEND_URL=https://app.example.com,https://admin.example.com
     */
    'allowed_origins' => array_filter(
        array_map('trim', explode(',', env('FRONTEND_URL', 'http://localhost:4200')))
    ),

    'allowed_origins_patterns' => [],

    /*
     | Allowed Headers
     |
     | Specify headers that can be sent with requests.
     | Common headers for API authentication and content negotiation.
     */
    'allowed_headers' => [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
    ],

    /*
     | Exposed Headers
     |
     | Headers that JavaScript is allowed to access in the response.
     */
    'exposed_headers' => [
        'Authorization',
    ],

    /*
     | Max Age
     |
     | How long (in seconds) the results of a preflight request can be cached.
     | 1 hour = 3600 seconds
     */
    'max_age' => 3600,

    /*
     | Supports Credentials
     |
     | Set to true to allow cookies and authentication headers.
     | Required for JWT authentication and session-based auth.
     */
    'supports_credentials' => true,

];
```

**Rationale**:
- Uses environment variable for origin control (flexibility across environments)
- Restricts methods to only those needed for RESTful API
- Explicitly lists allowed headers (no wildcards)
- Enables credentials support for JWT authentication
- Includes detailed comments for future developers

#### 2. Environment Configuration File
**File**: `.env.example`
**Changes**: Add CORS-related environment variables with documentation

```env
# Existing content...

# CORS Configuration
# Frontend URL(s) allowed to access the API
# Development: http://localhost:4200
# Production: https://your-production-domain.com
# Multiple origins: https://app.example.com,https://admin.example.com
FRONTEND_URL=http://localhost:4200
```

### Success Criteria:

#### Automated Verification:
- [ ] Configuration file exists: `ls config/cors.php`
- [ ] PHP syntax is valid: `docker exec preclinic-app php -l config/cors.php`
- [ ] Config can be cached: `docker exec preclinic-app php artisan config:cache`
- [ ] Config cache clears successfully: `docker exec preclinic-app php artisan config:clear`

#### Manual Verification:
- [ ] Start Docker containers: `docker-compose up -d`
- [ ] Verify app container is running: `docker ps | grep preclinic-app`
- [ ] Test CORS preflight request from authorized origin succeeds
- [ ] Test request from unauthorized origin is blocked
- [ ] Angular frontend can make successful API calls

**Implementation Note**: After completing this phase and all automated verification passes, pause here for manual confirmation from the human that the manual testing was successful before proceeding to the next phase.

---

## Phase 2: Update Documentation

### Overview
Document the CORS configuration, environment variables, and security implications for future developers and deployment.

### Changes Required:

#### 1. Environment Variables Documentation
**File**: `.env.example`
**Changes**: Add inline comments explaining CORS configuration (already included in Phase 1)

#### 2. README Documentation
**File**: `README.md`
**Changes**: Update or create proper README with CORS configuration section

```markdown
## CORS Configuration

The API uses Cross-Origin Resource Sharing (CORS) to control which frontend origins can access the backend.

### Development Setup

In your `.env` file:
```env
FRONTEND_URL=http://localhost:4200
```

### Production Setup

⚠️ **IMPORTANT for HIPAA Compliance**: Never use wildcard origins (`*`) in production.

In your production `.env` file:
```env
FRONTEND_URL=https://your-production-domain.com
```

For multiple allowed origins (e.g., main app + admin panel):
```env
FRONTEND_URL=https://app.example.com,https://admin.example.com
```

### Testing CORS

Test CORS preflight request:
```bash
curl -H "Origin: http://localhost:4200" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization, Content-Type" \
     -X OPTIONS \
     http://localhost:8000/api/auth/login -v
```

Expected response headers:
- `Access-Control-Allow-Origin: http://localhost:4200`
- `Access-Control-Allow-Methods: GET, POST, PUT, PATCH, DELETE, OPTIONS`
- `Access-Control-Allow-Credentials: true`
```

#### 3. Security Documentation
**File**: `documentation/04_Security.md` (new file, if needed)
**Changes**: Document CORS security considerations

```markdown
# Security Configuration

## CORS (Cross-Origin Resource Sharing)

### Overview
CORS is configured to restrict API access to authorized frontend origins only. This prevents unauthorized websites from making API calls to access patient data.

### Configuration
- **Location**: `config/cors.php`
- **Environment Variable**: `FRONTEND_URL` in `.env`
- **Default (Development)**: `http://localhost:4200`
- **Production**: Must be set to actual production domain

### Security Best Practices
1. ✅ Never use `['*']` for allowed origins in production
2. ✅ Always specify exact origin URLs (including protocol and port)
3. ✅ Use environment variables for origin configuration
4. ✅ Enable credentials support (`supports_credentials: true`) for authentication
5. ✅ Restrict allowed headers to only what's necessary
6. ✅ Review CORS configuration before each production deployment

### HIPAA Compliance Notes
Proper CORS configuration is essential for HIPAA compliance:
- Prevents unauthorized access to patient data via cross-origin requests
- Ensures only approved frontend applications can access the API
- Part of the overall security controls for protected health information (PHI)
```

### Success Criteria:

#### Automated Verification:
- [ ] README exists and contains CORS section: `grep -i "CORS" README.md`
- [ ] `.env.example` contains FRONTEND_URL: `grep "FRONTEND_URL" .env.example`
- [ ] Documentation is readable (no syntax errors)

#### Manual Verification:
- [ ] Documentation clearly explains CORS configuration
- [ ] Security implications are well-documented
- [ ] Setup instructions are accurate and complete
- [ ] Production deployment warnings are prominent

**Implementation Note**: After completing this phase, the CORS configuration implementation is complete. Run final verification tests before closing the task.

---

## Phase 3: Testing and Validation

### Overview
Comprehensive testing to ensure CORS configuration works correctly in all scenarios and doesn't break existing functionality.

### Changes Required:

#### 1. Manual CORS Testing Script
**File**: `documentation/scripts/test-cors.sh` (new file)
**Changes**: Create comprehensive CORS testing script

```bash
#!/bin/bash

echo "=== Pre-Clinic CORS Configuration Test ==="
echo ""

BACKEND_URL="${1:-http://localhost:8000}"
FRONTEND_URL="${2:-http://localhost:4200}"

echo "Testing CORS configuration..."
echo "Backend: $BACKEND_URL"
echo "Frontend Origin: $FRONTEND_URL"
echo ""

# Test 1: Preflight request from authorized origin
echo "Test 1: Preflight request from authorized origin (should succeed)"
echo "---------------------------------------------------------------"
curl -H "Origin: $FRONTEND_URL" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization, Content-Type" \
     -X OPTIONS \
     "$BACKEND_URL/api/auth/login" \
     -v 2>&1 | grep -i "access-control"
echo ""

# Test 2: Preflight request from unauthorized origin
echo "Test 2: Preflight request from unauthorized origin (should fail)"
echo "-----------------------------------------------------------------"
curl -H "Origin: http://evil-site.com" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Authorization, Content-Type" \
     -X OPTIONS \
     "$BACKEND_URL/api/auth/login" \
     -v 2>&1 | grep -i "access-control"
echo ""

# Test 3: Actual GET request
echo "Test 3: GET request from authorized origin (should succeed)"
echo "------------------------------------------------------------"
curl -H "Origin: $FRONTEND_URL" \
     -X GET \
     "$BACKEND_URL/api/health-centers" \
     -v 2>&1 | grep -i "access-control"
echo ""

echo "=== Tests Complete ==="
echo ""
echo "Expected results:"
echo "- Test 1: Should show Access-Control-Allow-Origin: $FRONTEND_URL"
echo "- Test 2: Should NOT show Access-Control-Allow-Origin or show null"
echo "- Test 3: Should show Access-Control-Allow-Origin: $FRONTEND_URL"
```

#### 2. Feature Test for CORS
**File**: `tests/Feature/CorsConfigurationTest.php` (new file)
**Changes**: Create automated test for CORS behavior

```php
<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class CorsConfigurationTest extends TestCase
{
    /**
     * Test CORS preflight request from allowed origin.
     *
     * @return void
     */
    public function test_cors_preflight_from_allowed_origin()
    {
        $allowedOrigin = config('cors.allowed_origins')[0] ?? 'http://localhost:4200';

        $response = $this->withHeaders([
            'Origin' => $allowedOrigin,
            'Access-Control-Request-Method' => 'POST',
            'Access-Control-Request-Headers' => 'Content-Type, Authorization',
        ])->options('/api/auth/login');

        $response->assertStatus(204);
        $response->assertHeader('Access-Control-Allow-Origin', $allowedOrigin);
        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    /**
     * Test CORS request with credentials.
     *
     * @return void
     */
    public function test_cors_supports_credentials()
    {
        $allowedOrigin = config('cors.allowed_origins')[0] ?? 'http://localhost:4200';

        $response = $this->withHeaders([
            'Origin' => $allowedOrigin,
        ])->get('/api/health-centers');

        $response->assertHeader('Access-Control-Allow-Credentials', 'true');
    }

    /**
     * Test that wildcard origins are not allowed in production.
     *
     * @return void
     */
    public function test_no_wildcard_origins_in_production()
    {
        if (app()->environment('production')) {
            $allowedOrigins = config('cors.allowed_origins');

            $this->assertNotContains('*', $allowedOrigins,
                'Wildcard CORS origins are not allowed in production for HIPAA compliance');
        }

        $this->assertTrue(true); // Pass in non-production environments
    }

    /**
     * Test allowed methods configuration.
     *
     * @return void
     */
    public function test_cors_allowed_methods_are_restricted()
    {
        $allowedMethods = config('cors.allowed_methods');

        // Should not allow wildcard
        $this->assertNotContains('*', $allowedMethods);

        // Should include common REST methods
        $this->assertContains('GET', $allowedMethods);
        $this->assertContains('POST', $allowedMethods);
        $this->assertContains('PUT', $allowedMethods);
        $this->assertContains('DELETE', $allowedMethods);
    }

    /**
     * Test allowed headers configuration.
     *
     * @return void
     */
    public function test_cors_allowed_headers_are_restricted()
    {
        $allowedHeaders = config('cors.allowed_headers');

        // Should not allow wildcard
        $this->assertNotContains('*', $allowedHeaders);

        // Should include necessary headers
        $this->assertContains('Authorization', $allowedHeaders);
        $this->assertContains('Content-Type', $allowedHeaders);
    }
}
```

#### 3. Update Existing Tests
**File**: Review existing feature tests
**Changes**: Ensure existing API tests don't break with new CORS configuration

**Action Items**:
- Run full test suite: `docker exec preclinic-app php artisan test`
- Fix any tests that fail due to CORS configuration changes
- Ensure authentication tests still pass

### Success Criteria:

#### Automated Verification:
- [ ] CORS test exists: `ls tests/Feature/CorsConfigurationTest.php`
- [ ] Test syntax is valid: `docker exec preclinic-app php -l tests/Feature/CorsConfigurationTest.php`
- [ ] New CORS tests pass: `docker exec preclinic-app php artisan test --filter=CorsConfigurationTest`
- [ ] All existing tests still pass: `docker exec preclinic-app php artisan test`
- [ ] No regression in authentication tests: `docker exec preclinic-app php artisan test tests/Feature/Auth/`

#### Manual Verification:
- [ ] Run manual CORS test script: `bash documentation/scripts/test-cors.sh`
- [ ] Test from browser: Open Angular app at http://localhost:4200 and verify API calls work
- [ ] Test unauthorized origin: Try making API call from different domain (should fail)
- [ ] Verify browser console shows no CORS errors when using the app
- [ ] Test authentication flow works end-to-end (login, token storage, authenticated requests)

**Implementation Note**: After completing this phase and all tests pass, the CORS configuration is production-ready.

---

## Testing Strategy

### Unit Tests:
- Test CORS configuration values are correct
- Test wildcard check in production environment
- Test allowed methods don't include wildcards
- Test allowed headers don't include wildcards

### Integration Tests:
- Test CORS preflight requests (OPTIONS method)
- Test CORS headers on actual API requests
- Test credentials support
- Test requests from unauthorized origins

### Manual Testing Steps:
1. **Start Development Environment**:
   ```bash
   cd Pre-Clinic-Backend
   docker-compose up -d
   cd ../Pre-Clinic-frontend
   ng serve
   ```

2. **Verify CORS Headers**:
   ```bash
   # Test authorized origin
   curl -H "Origin: http://localhost:4200" \
        -H "Access-Control-Request-Method: POST" \
        -H "Access-Control-Request-Headers: Authorization" \
        -X OPTIONS \
        http://localhost:8000/api/auth/login -v
   ```

3. **Test Frontend Integration**:
   - Open browser to http://localhost:4200
   - Open browser DevTools (F12) → Network tab
   - Try logging in or making any API call
   - Verify Response Headers include:
     - `Access-Control-Allow-Origin: http://localhost:4200`
     - `Access-Control-Allow-Credentials: true`
   - Verify no CORS errors in Console

4. **Test Unauthorized Origin**:
   ```bash
   # Should NOT return Access-Control-Allow-Origin header
   curl -H "Origin: http://unauthorized-site.com" \
        -X GET \
        http://localhost:8000/api/health-centers -v
   ```

5. **Production Readiness Check**:
   - Set `FRONTEND_URL=https://production-domain.com` in `.env`
   - Clear config cache: `docker exec preclinic-app php artisan config:clear`
   - Verify configuration: `docker exec preclinic-app php artisan config:show cors`
   - Test that localhost:4200 is now blocked
   - Test that production domain is allowed

## Performance Considerations

- **Preflight Caching**: Set `max_age` to 3600 seconds (1 hour) to reduce preflight requests
- **Minimal Impact**: CORS checking is done by Laravel's middleware, minimal performance overhead
- **Config Caching**: In production, use `php artisan config:cache` to cache configuration
- **No Database Queries**: CORS configuration is file-based, no database overhead

## Migration Notes

**Not Applicable**: This is a configuration change, not a database migration.

**Deployment Steps**:
1. Add `config/cors.php` file to repository
2. Update `.env.example` with `FRONTEND_URL` variable
3. Deploy code changes
4. Update production `.env` file with `FRONTEND_URL=https://production-domain.com`
5. Clear config cache: `php artisan config:clear`
6. Cache new config: `php artisan config:cache`
7. Restart application containers: `docker-compose restart app`
8. Test CORS with production domain

**Rollback Plan**:
If issues occur:
1. Remove `config/cors.php` file
2. Laravel will fall back to vendor default configuration
3. Restart containers: `docker-compose restart app`

## Security Considerations

### HIPAA Compliance:
1. **Origin Restriction**: Only authorized frontend applications can access patient data
2. **Credentials Support**: Enables proper authentication with cookies/tokens
3. **No Wildcards**: Explicit origin lists prevent unauthorized access
4. **Audit Trail**: CORS errors logged, can track unauthorized access attempts

### Security Best Practices:
1. ✅ Never use `['*']` in `allowed_origins` for production
2. ✅ Always include protocol and port in origin URLs
3. ✅ Use environment variables for configuration flexibility
4. ✅ Enable credentials support for authentication
5. ✅ Restrict allowed headers to minimum required
6. ✅ Set appropriate preflight cache time (max_age)
7. ✅ Review and update allowed origins when adding new frontends

### Threat Mitigation:
- **Prevents**: Unauthorized websites from making API calls
- **Prevents**: Cross-site request forgery (CSRF) attacks from untrusted origins
- **Prevents**: Data exfiltration via malicious third-party sites
- **Enables**: Controlled access to protected health information (PHI)

## References

- Critical Review Document: `Pre-Clinic-System-Critical-Review.md:220-229` (Issue #12)
- Laravel CORS Documentation: https://laravel.com/docs/11.x/routing#cors
- MDN CORS Guide: https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
- OWASP CORS Guide: https://owasp.org/www-community/attacks/CORS_OriginHeaderScrutiny
- Laravel 11 Middleware Config: `bootstrap/app.php:16`
- Frontend Environment Config: `Pre-Clinic-frontend/src/environments/environment.ts`
- Docker Compose Config: `Pre-Clinic-Backend/docker-compose.yml`

## Additional Notes

### Why This Matters for Medical Systems:
The Pre-Clinic system handles protected health information (PHI) subject to HIPAA regulations. Proper CORS configuration is a critical security control that:

1. **Prevents Data Breaches**: Unauthorized websites cannot make API calls to access patient data
2. **Ensures Authorized Access**: Only approved frontend applications can communicate with the backend
3. **Supports Compliance**: Part of the technical safeguards required by HIPAA
4. **Enables Audit**: CORS violations can be logged and monitored

### Environment-Specific Configurations:

**Development**:
```env
FRONTEND_URL=http://localhost:4200
```

**Staging**:
```env
FRONTEND_URL=https://staging.preclinic.example.com
```

**Production**:
```env
FRONTEND_URL=https://app.preclinic.example.com
```

**Multiple Frontends** (e.g., patient portal + admin dashboard):
```env
FRONTEND_URL=https://app.preclinic.com,https://admin.preclinic.com
```

### Future Enhancements:
- Consider implementing CORS for specific API version routes
- Add monitoring/alerting for CORS violations
- Implement request origin logging for security audit trail
- Consider CORS configuration for mobile apps (if added in future)
