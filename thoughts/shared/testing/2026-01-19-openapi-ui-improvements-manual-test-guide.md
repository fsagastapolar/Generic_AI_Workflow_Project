# Manual Testing Guide: OpenAPI Documentation UI Improvements

## Implementation Summary
- **Feature**: Enhanced OpenAPI documentation interface with default login credentials, token auto-capture, and copy functionality
- **Implementation Date**: 2026-01-19
- **Files Modified**:
  - `app/Http/Controllers/API/V1/AuthController.php` - Added BodyParameter attributes for default credentials
  - `resources/views/vendor/scramble/docs.blade.php` - Created custom Blade view with JavaScript for token management

## Prerequisites
- [ ] Docker containers running: `docker-compose up -d` (from Pre-Clinic-Backend directory)
- [ ] Backend API accessible at `http://localhost:8000`
- [ ] Database migrated and seeded with test user (roberto@email.com)
- [ ] Browser with DevTools (Chrome, Firefox, or Edge recommended)

### Starting Docker Containers
```bash
cd Pre-Clinic-Backend
docker-compose up -d
docker ps  # Verify containers are running
```

## Test Scenarios

### Scenario 1: Default Credentials Display
**Objective**: Verify that the login endpoint pre-fills with test credentials

**Steps**:
1. Open browser and navigate to `http://localhost:8000/docs/api`
2. Wait for the API documentation page to fully load
3. In the left sidebar, locate and expand the "Auth" section
4. Click on "POST /auth/login" endpoint
5. Click the "Try It" tab (or similar button to test the endpoint)
6. Observe the email and password input fields

**Expected Results**:
- Email field displays `roberto@email.com`
- Password field displays `password123`
- Fields are pre-filled (not empty)
- Values match exactly what was specified in the BodyParameter attributes

**Edge Cases**:
- [ ] Refresh the page - credentials should still be pre-filled
- [ ] Navigate away and back - credentials should persist
- [ ] Clear form and reload - credentials should reappear

---

### Scenario 2: Token Capture After Successful Login
**Objective**: Verify token auto-capture functionality works correctly

**Steps**:
1. On the `/docs/api` page, navigate to "POST /auth/login"
2. Verify credentials are pre-filled (roberto@email.com / password123)
3. Open Browser DevTools (F12) and go to Console tab
4. Click "Send API Request" (or similar button)
5. Wait for the API response

**Expected Results**:
- Login request returns 200 status
- Response includes `access_token` in the `data` object
- Green notification appears in the top-right corner
- Notification displays:
  - Green gradient background
  - Checkmark icon
  - Text: "Token Captured Successfully!"
  - Token preview showing first 50 characters followed by "..."
  - "📋 Copy Full Token" button
- Console shows message: "Token captured successfully"
- Notification auto-hides after 10 seconds with slide-out animation

**Edge Cases**:
- [ ] Test with invalid credentials - no notification should appear
- [ ] Test with network error (disconnect) - graceful error handling
- [ ] Test multiple rapid logins - each should show new notification

---

### Scenario 3: Copy Token from Notification
**Objective**: Verify the "Copy Full Token" button in the notification works

**Steps**:
1. Complete Scenario 2 to trigger a successful login
2. When green notification appears, click "📋 Copy Full Token" button
3. Open a text editor or notepad
4. Paste the clipboard content (Ctrl+V or Cmd+V)

**Expected Results**:
- Button changes to "✓ Copied!" immediately
- Button background changes to darker green
- Button text changes to white
- After 2 seconds, button reverts to original state
- Pasted content is a complete JWT token (long string starting with "eyJ...")
- Token format: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` (base64 encoded JWT)

**Edge Cases**:
- [ ] Click button multiple times rapidly - should handle gracefully
- [ ] Test on page with clipboard permissions denied - should show alert

---

### Scenario 4: Persistent "Copy Latest Token" Button
**Objective**: Verify the permanent copy button appears and functions correctly

**Steps**:
1. Complete a successful login (Scenario 2)
2. Look at the bottom-right corner of the page
3. Observe the blue "📋 Copy Latest Token" button
4. Hover over the button
5. Click the button
6. Paste clipboard content to verify

**Expected Results**:
- Button appears in bottom-right corner after successful login
- Button has blue gradient background
- Button displays "📋 Copy Latest Token" text
- On hover:
  - Button moves up slightly (2px)
  - Shadow becomes more prominent
- On click:
  - Button changes to "✓ Copied!"
  - Background changes to green gradient
  - After 2 seconds, reverts to original state
- Pasted content matches the latest token from login

**Edge Cases**:
- [ ] Click before any login - should show alert: "No token available. Please login first..."
- [ ] Hover and unhover rapidly - animations should be smooth
- [ ] Button should not overlap with page content

---

### Scenario 5: Token Persistence Across Page Reloads
**Objective**: Verify tokens are stored and persist across sessions

**Steps**:
1. Complete a successful login to capture a token
2. Verify the persistent "Copy Latest Token" button is visible
3. Refresh the page (F5 or Ctrl+R)
4. Wait for page to fully reload
5. Check if the "Copy Latest Token" button is still visible
6. Click the button and paste to verify

**Expected Results**:
- After page reload, button reappears automatically
- Button is visible immediately on page load
- Clicking the button copies the same token captured before reload
- Token remains valid and functional

**Edge Cases**:
- [ ] Close tab and reopen `/docs/api` - button should still appear
- [ ] Close browser entirely and reopen - button should appear (localStorage persists)
- [ ] Clear localStorage manually - button should not appear, alert shown on click

---

### Scenario 6: Multiple Sequential Logins
**Objective**: Verify token updates correctly when logging in multiple times

**Steps**:
1. Complete a successful login
2. Note the first few characters of the token from notification
3. Wait for notification to disappear (or dismiss it)
4. Login again using the same credentials
5. Observe the new notification
6. Click the persistent "Copy Latest Token" button
7. Paste and compare with first token

**Expected Results**:
- Second login shows new notification with different token
- Token preview shows different characters than first login
- Persistent button copies the LATEST token (second one)
- Old token is overwritten in localStorage
- Each login generates a unique token

**Edge Cases**:
- [ ] Login with different user credentials - should capture different user's token
- [ ] Rapid consecutive logins - should capture each token correctly
- [ ] Notification during previous notification - old one should be removed first

---

### Scenario 7: Browser Compatibility Testing
**Objective**: Ensure functionality works across major browsers

**Steps**:
Repeat Scenarios 1-4 in each of the following browsers:

1. **Google Chrome** (latest version)
2. **Mozilla Firefox** (latest version)
3. **Microsoft Edge** (latest version)

**Expected Results**:
- All functionality works identically in all three browsers
- Animations are smooth and consistent
- Clipboard API works in all browsers
- No console errors specific to any browser
- Visual styling appears consistent

**Known Browser Differences**:
- Safari may have different clipboard permission prompts
- Older browsers may not support clipboard API (should show graceful error)

**Testing Checklist per Browser**:
- [ ] Chrome: All scenarios pass
- [ ] Firefox: All scenarios pass
- [ ] Edge: All scenarios pass

---

### Scenario 8: Error Handling - No Token Available
**Objective**: Verify graceful error handling when no token exists

**Steps**:
1. Open browser in incognito/private mode (or clear localStorage)
2. Navigate to `http://localhost:8000/docs/api`
3. If persistent button appears, clear localStorage:
   - Open DevTools (F12)
   - Go to Application/Storage tab
   - Expand Local Storage
   - Delete `api_token` key
   - Refresh page
4. Look for the persistent "Copy Latest Token" button
5. If button appears, click it

**Expected Results**:
- If no token in localStorage, button should NOT appear on page load
- If button is clicked when no token exists, alert appears:
  - Message: "No token available. Please login first using the API documentation."
- No JavaScript errors in console
- Page remains functional

**Edge Cases**:
- [ ] Corrupted token in localStorage - should handle gracefully
- [ ] Empty string as token - should treat as no token
- [ ] localStorage disabled/unavailable - should not break page

---

### Scenario 9: JavaScript Console Verification
**Objective**: Verify no JavaScript errors and correct logging

**Steps**:
1. Open `http://localhost:8000/docs/api` with DevTools open (F12)
2. Go to Console tab
3. Clear console (click trash icon)
4. Complete a full login flow
5. Observe console messages

**Expected Results**:
- No JavaScript errors (red messages)
- Success message appears: "Token captured successfully"
- No warnings about undefined variables or functions
- Fetch requests visible in Network tab
- Response properly parsed as JSON

**Edge Cases**:
- [ ] Monitor for memory leaks (multiple logins shouldn't accumulate listeners)
- [ ] Check for proper cleanup of notification elements

---

### Scenario 10: Visual Regression Check
**Objective**: Verify the UI enhancements don't break existing documentation

**Steps**:
1. Navigate to various endpoints in the documentation
2. Test other "Try It" features (not just login)
3. Verify sidebar navigation works
4. Check that all documentation sections load properly
5. Verify the persistent button doesn't cover important UI elements

**Expected Results**:
- All existing documentation features work as before
- Persistent button doesn't overlap with:
  - Stoplight Elements controls
  - Sidebar navigation
  - "Try It" panels
  - Response displays
- Page scrolling works normally
- No visual glitches or z-index issues

**Edge Cases**:
- [ ] Small screen sizes (1280x720) - button should still be visible
- [ ] Mobile view (if applicable) - button should adapt or hide gracefully
- [ ] Very long endpoint descriptions - button doesn't overlap

---

## Regression Testing

Test that existing functionality still works:

- [ ] **Other endpoints** can still be tested via "Try It"
- [ ] **Authentication using captured token** works for protected endpoints:
  1. Copy token from notification or persistent button
  2. Navigate to protected endpoint (e.g., "POST /auth/me")
  3. Manually add Authorization header: `Bearer {token}`
  4. Verify request succeeds with 200 status
- [ ] **Documentation search** still functions properly
- [ ] **Endpoint filtering** and navigation work normally
- [ ] **Code examples** display correctly
- [ ] **Schema definitions** render properly

---

## Performance Testing

- [ ] **Page load time**: Should not significantly increase (< 100ms difference)
- [ ] **Token capture latency**: Should be imperceptible (< 50ms)
- [ ] **Animation smoothness**: Notification transitions should be smooth (60fps)
- [ ] **Memory usage**: Multiple logins shouldn't cause memory leaks
  - Open DevTools → Performance → Take snapshot
  - Login 10 times
  - Take another snapshot
  - Memory should not continuously increase

---

## Accessibility Testing

- [ ] **Keyboard navigation**: Tab through interactive elements
- [ ] **Screen reader**: Test with screen reader (if available)
  - Notification should announce token capture
  - Button text should be readable
- [ ] **Color contrast**: Verify text is readable on all backgrounds
- [ ] **Focus indicators**: Buttons should show focus state when tabbed to

---

## Security Verification

- [ ] **Token exposure**: Verify token is only visible to authenticated users
- [ ] **XSS protection**: No user input is rendered without sanitization
- [ ] **HTTPS enforcement**: In production, verify docs only accessible via HTTPS
- [ ] **Token storage**: Verify localStorage is appropriate for this use case
  - Expected: LocalStorage is acceptable for JWT tokens in SPA contexts
  - Token is already exposed in API responses
  - Same-origin policy protects localStorage

---

## Known Issues / Limitations

### Current Limitations:
1. **Stoplight Elements Limitation**: Cannot automatically populate the Authorization header in the UI
   - **Workaround**: Users must manually copy token and paste into auth fields

2. **localStorage Dependency**: Tokens stored in localStorage may be cleared by browser
   - **Expected behavior**: User simply logs in again

3. **No Token Expiration Warning**: No visual indicator when token expires
   - **Future enhancement**: Could add countdown or expiration check

### Expected Behaviors (Not Bugs):
- Token preview only shows first 50 characters (by design for security/UX)
- Notification auto-hides after 10 seconds (configurable in code if needed)
- Button only appears after first successful login (not on page load unless token exists)

---

## Rollback Instructions

If critical issues are found during testing:

### 1. Rollback Phase 2 (Blade View)
```bash
cd Pre-Clinic-Backend
rm resources/views/vendor/scramble/docs.blade.php
```
This reverts to Scramble's default view (no token capture functionality)

### 2. Rollback Phase 1 (BodyParameter Attributes)
Edit `app/Http/Controllers/API/V1/AuthController.php`:
- Remove line 8: `use Dedoc\Scramble\Attributes\BodyParameter;`
- Remove lines 107-108: The two `#[BodyParameter(...)]` attributes
- Clear config cache if Docker is running:
  ```bash
  docker exec -it <container-name> php artisan config:clear
  docker exec -it <container-name> php artisan config:cache
  ```

### 3. Git Rollback (Complete Revert)
```bash
cd Pre-Clinic-Backend
git status  # Verify changes
git checkout -- app/Http/Controllers/API/V1/AuthController.php
git checkout -- resources/views/vendor/scramble/docs.blade.php
```

---

## Success Criteria Summary

### Must Pass Before Approval:
✅ **Phase 1**:
- [ ] Default credentials (roberto@email.com / password123) appear in login form
- [ ] Credentials persist across page reloads

✅ **Phase 2**:
- [ ] Token capture notification appears after successful login
- [ ] "Copy Full Token" button in notification works
- [ ] Persistent "Copy Latest Token" button appears and functions
- [ ] Token persists in localStorage across page reloads
- [ ] All functionality works in Chrome, Firefox, and Edge
- [ ] No JavaScript errors in browser console
- [ ] No visual regressions or UI breaks

### Nice to Have (Can be addressed in follow-up):
- Safari testing
- Mobile browser testing
- Token expiration warnings
- Multiple token management (for testing different users)

---

## Reporting Issues

If you encounter any issues during testing, please report with:
1. **Browser and version** (e.g., Chrome 120.0.6099.130)
2. **Steps to reproduce** (detailed sequence)
3. **Expected behavior** (what should happen)
4. **Actual behavior** (what actually happened)
5. **Screenshots** (if visual issue)
6. **Console errors** (copy from DevTools Console tab)
7. **Network errors** (check DevTools Network tab)

---

## Testing Completion Checklist

- [ ] All 10 test scenarios completed
- [ ] Regression testing passed
- [ ] Performance acceptable
- [ ] Accessibility verified
- [ ] No critical issues found
- [ ] Browser compatibility confirmed (Chrome, Firefox, Edge)

**Tester Signature**: ___________________
**Date**: ___________________
**Status**: [ ] PASS [ ] FAIL [ ] CONDITIONAL PASS (with notes)

**Notes**:
_________________________________________________________________
_________________________________________________________________
_________________________________________________________________
