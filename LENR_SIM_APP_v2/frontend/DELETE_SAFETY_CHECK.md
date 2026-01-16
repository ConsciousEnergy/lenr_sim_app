# File Deletion Safety Check - LENR v0.2.1-beta

## Entry Point Verification
- **Main Entry:** `src/index.js` → imports `App.tsx`
- **Main App File:** `src/App.tsx` is the active routing file
- **Start Script:** `start_app.bat` → starts npm (which uses index.js)

## Active Files (DO NOT DELETE)
✅ **DashboardNew.jsx** - Line 14 in App.tsx: `import Dashboard from './pages/DashboardNew';`
✅ **SettingsPage.jsx** - Line 29 in App.tsx: `import SettingsPage from './pages/SettingsPage';`
✅ **Home.tsx** - Updated with version config (used in routing)

## Files Safe to Delete (NOT imported in active App.tsx)

### Dashboard Files:
❌ `pages/Dashboard.js` - Only used in `App_Merged.tsx` (not entry point)
❌ `pages/Dashboard.jsx` - Only used in `App.jsx.simple` (not entry point)  
❌ `pages/Dashboard.tsx` - Not imported anywhere
❌ `pages/DashboardConverted.jsx` - Not imported anywhere

### HomePage Files:
❌ `pages/HomePage.js` - Not imported anywhere
❌ `pages/HomePage.jsx` - Not imported anywhere
⚠️  **KEEP:** `pages/Home.tsx` - May be used elsewhere, just updated

### Settings Files:
❌ `pages/Settings.tsx` - Not imported (SettingsPage.jsx is used instead)

## Verification Summary

**App.tsx imports:**
```typescript
import Dashboard from './pages/DashboardNew';  // ✅ Active
import SettingsPage from './pages/SettingsPage';  // ✅ Active
// Old Dashboard commented out:
// import Dashboard from './pages/Dashboard';  // ❌ Not used
```

**Not used files:**
- App_Merged.tsx uses old Dashboard (but App_Merged.tsx is not entry point)
- App.jsx.simple uses old Dashboard (but not used)
- No other files import Dashboard.js/jsx/tsx or DashboardConverted

## Recommendation

**SAFE TO DELETE:**
1. `pages/Dashboard.js`
2. `pages/Dashboard.jsx`
3. `pages/Dashboard.tsx`
4. `pages/DashboardConverted.jsx`
5. `pages/HomePage.js`
6. `pages/HomePage.jsx`
7. `pages/Settings.tsx`

**Test after deletion:**
1. Run `start_app.bat`
2. Verify dashboard loads at http://localhost:3000
3. Verify settings page works
4. Check browser console for errors

## Risk Level: LOW ✅
All duplicate files have been verified as unused in the active application code.
