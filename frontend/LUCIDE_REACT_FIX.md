# Lucide React Fix for Next.js 14

## Problem
Next.js 14 has issues with `lucide-react` package because:
1. Modern versions use `.mjs` files instead of `.js`
2. Next.js barrel optimization fails to resolve these files
3. Build errors: "Cannot find file activity.js"

## Solution Applied

### 1. Package Version
Installed `lucide-react@0.263.1` - a stable version compatible with Next.js 14

```bash
npm install lucide-react@0.263.1 --legacy-peer-deps
```

### 2. Next.js Configuration
Updated `next.config.js` with:

```javascript
{
  // Transpile lucide-react to handle .mjs files
  transpilePackages: ['lucide-react'],
  
  webpack: (config) => {
    // Handle .mjs files by adding extension aliases
    config.resolve.extensionAlias = {
      '.js': ['.js', '.mjs', '.ts', '.tsx'],
      '.jsx': ['.jsx', '.mjsx'],
    }
    return config
  }
}
```

### 3. Key Configuration Points

**transpilePackages**: Tells Next.js to transpile `lucide-react` during build
**extensionAlias**: Maps `.js` imports to also check for `.mjs` files

## How It Works

1. When Next.js encounters `import { Icon } from 'lucide-react'`
2. It transpiles the package using SWC
3. Extension aliases allow webpack to resolve `.mjs` files as `.js`
4. Icons load correctly without build errors

## Alternative Solutions (Not Used)

### Option A: Disable Barrel Optimization
```javascript
experimental: {
  optimizePackageImports: []
}
```
❌ Increases bundle size significantly

### Option B: Use Older Version with .js files
```bash
npm install lucide-react@0.294.0
```
❌ Still uses .mjs in newer versions

### Option C: Manual Icon Imports
```javascript
import Activity from 'lucide-react/dist/esm/icons/activity'
```
❌ Verbose and hard to maintain

## Verification

After applying the fix:
1. Delete `.next` folder: `rm -rf .next`
2. Start dev server: `npm run dev`
3. Icons should load without errors

## Troubleshooting

### If errors persist:

1. **Clear all caches:**
```bash
rm -rf .next
rm -rf node_modules/lucide-react
npm install
```

2. **Check Node version:**
```bash
node --version  # Should be 18.x or higher
```

3. **Verify package installation:**
```bash
ls node_modules/lucide-react/dist/esm/icons/
```

4. **Check import syntax:**
```javascript
// ✅ Correct
import { Activity, User } from 'lucide-react'

// ❌ Wrong
import Activity from 'lucide-react/icons/activity'
```

## Related Issues

- Next.js Issue: https://github.com/vercel/next.js/issues/58272
- Lucide React: https://github.com/lucide-icons/lucide/issues/1239

## Status

✅ **Fixed and Working**
- Version: lucide-react@0.263.1
- Next.js: 14.1.0
- Node.js: 22.16.0
- All icons loading correctly
