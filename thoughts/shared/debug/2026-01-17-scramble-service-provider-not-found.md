# Debug Report: Scramble Service Provider Not Found

**Date**: January 17, 2026
**Issue**: Migration seeding failed due to missing ScrambleServiceProvider class
**Status**: ✅ RESOLVED

## Problem Description

When attempting to run database migrations with seeding, the following error occurred:

```
PS C:\PolarCode\PreClinic\Pre-Clinic-Backend> docker-compose exec app php artisan migrate:fresh --seed

In ProviderRepository.php line 206:

  Class "Dedoc\Scramble\ScrambleServiceProvider" not found
```

## Investigation Process

### 1. Dependency Declaration Check
Verified that `dedoc/scramble` was properly declared in `composer.json`:

```json
"require": {
    "php": "^8.2",
    "dedoc/scramble": "^0.13.10",
    "laravel/framework": "^11.9",
    "laravel/tinker": "^2.9",
    "php-open-source-saver/jwt-auth": "^2.3",
    "spatie/laravel-permission": "^6.9"
}
```

### 2. Laravel Configuration Check
Confirmed that Laravel 11 uses automatic package discovery (no manual provider registration needed in `config/app.php`). The service provider should be auto-discovered once the package is properly installed.

### 3. Root Cause Identification
The package was declared in `composer.json` but not actually installed in the Docker container's vendor directory. This typically occurs when:
- Dependencies are added to `composer.json` without running `composer install` in the container
- The vendor directory is not synced between host and container
- Container was built before the dependency was added

## Solution

### Commands Executed
```bash
docker-compose exec app composer install
docker-compose exec app php artisan migrate:fresh --seed
```

### Result
✅ **SUCCESS** - The first command installed all missing dependencies including `dedoc/scramble`. The migration and seeding then completed successfully.

## Root Cause Analysis

**Primary Issue**: Composer dependencies inside the Docker container were out of sync with `composer.json`.

**Why This Happened**: The `dedoc/scramble` package was added to `composer.json`, but `composer install` was never executed inside the running Docker container to actually download and install the package into the `vendor/` directory.

**Laravel's Behavior**: Laravel 11's package auto-discovery scans the `vendor/` directory for service providers. When it found `dedoc/scramble` listed in the discovered packages metadata but the actual package files were missing, it threw the "Class not found" error.

## Prevention

To prevent this issue in the future:

1. **After adding dependencies to composer.json**, always run:
   ```bash
   docker-compose exec app composer install
   ```

2. **When building/rebuilding containers**, ensure the Dockerfile includes:
   ```dockerfile
   COPY composer.json composer.lock ./
   RUN composer install --no-scripts --no-autoloader
   COPY . .
   RUN composer dump-autoload --optimize
   ```

3. **Document the workflow** in SETUP.md to remind developers to run composer install after pulling changes

## Alternative Solutions Considered

If the primary solution hadn't worked, these were the backup approaches:

1. **Clear Laravel caches**:
   ```bash
   docker-compose exec app php artisan config:clear
   docker-compose exec app php artisan cache:clear
   docker-compose exec app composer dump-autoload
   ```

2. **Rebuild container from scratch**:
   ```bash
   docker-compose down
   docker-compose up -d --build
   docker-compose exec app composer install
   ```

## Lessons Learned

1. **Docker environments require explicit dependency installation** - Adding a package to `composer.json` on the host doesn't automatically install it in the container
2. **Laravel's auto-discovery is helpful but requires packages to exist** - It will fail fast if declared packages are missing
3. **Always verify vendor directory after adding dependencies** - Especially in containerized environments

## References

- Package: [dedoc/scramble](https://github.com/dedoc/scramble) v0.13.10
- Laravel Version: 11.9
- PHP Version: 8.2
- Error Location: `vendor/laravel/framework/src/Illuminate/Foundation/ProviderRepository.php:206`
