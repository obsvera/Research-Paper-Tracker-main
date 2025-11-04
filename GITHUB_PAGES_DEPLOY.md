# GitHub Pages Deployment Guide

## 🚀 Quick Deploy to GitHub Pages

### Option 1: Deploy Current Branch (Fastest)

You can deploy directly from your current branch without merging:

**Step 1: Push your branch (already done ✓)**
```bash
# Already completed - your branch is pushed
git branch --show-current
# Shows: claude/review-current-issues-011CUnGoeSAt9BPdeBYsf7JV
```

**Step 2: Configure GitHub Pages**

1. Go to your repository on GitHub:
   ```
   https://github.com/obsvera/Research-Paper-Tracker-main
   ```

2. Click **"Settings"** tab (top of page)

3. Scroll down to **"Pages"** section (left sidebar)

4. Under **"Source"**, select:
   - **Branch:** `claude/review-current-issues-011CUnGoeSAt9BPdeBYsf7JV`
   - **Folder:** `/ (root)`

5. Click **"Save"**

6. Wait 2-5 minutes for deployment

**Step 3: Access your live site**
```
https://obsvera.github.io/Research-Paper-Tracker-main/
```

---

### Option 2: Merge to Main/Master (Recommended for Production)

If you want to merge your fixes to the main branch first:

**Step 1: Fetch and checkout main branch**
```bash
# Fetch all branches from remote
git fetch origin

# Create/checkout main branch (or master if that's your default)
git checkout -b main origin/main
# OR if the default branch is 'master':
# git checkout -b master origin/master
```

**Step 2: Merge your fixes**
```bash
# Merge your feature branch
git merge claude/review-current-issues-011CUnGoeSAt9BPdeBYsf7JV

# Push to main
git push origin main
```

**Step 3: Configure GitHub Pages for main branch**

1. Go to **Settings → Pages**
2. Select **Branch:** `main`, **Folder:** `/ (root)`
3. Click **"Save"**

**Step 4: Access your site**
```
https://obsvera.github.io/Research-Paper-Tracker-main/
```

---

## 📱 Testing on GitHub Pages

### Desktop Testing

1. **Open the live URL:**
   ```
   https://obsvera.github.io/Research-Paper-Tracker-main/
   ```

2. **Test BibTeX Import:**
   - You'll need to download `test-sample.bib` from the repo first
   - Or create a test BibTeX file manually

3. **Test Memory Leaks:**
   - Open DevTools (F12)
   - Add/delete papers multiple times
   - Check event listener count

4. **Test Mobile Responsiveness:**
   - Open DevTools (F12)
   - Toggle device toolbar (Ctrl+Shift+M)
   - Test different viewport sizes

---

### Real Mobile Device Testing

Once deployed, you can test on **actual phones and tablets**!

**iPhone/iPad:**
1. Open Safari
2. Go to: `https://obsvera.github.io/Research-Paper-Tracker-main/`
3. Test all functionality
4. Try rotating device (portrait ↔ landscape)

**Android Phone/Tablet:**
1. Open Chrome or Firefox
2. Go to: `https://obsvera.github.io/Research-Paper-Tracker-main/`
3. Test all functionality
4. Try rotating device

**Testing Checklist on Real Device:**
```
✓ [ ] Page loads without errors
✓ [ ] All buttons are easy to tap (44px touch targets)
✓ [ ] Controls stack properly in portrait mode
✓ [ ] Table scrolls smoothly horizontally
✓ [ ] "Swipe to scroll table" hint is visible
✓ [ ] Modals fit on screen (no overflow)
✓ [ ] Paper cards display in single column
✓ [ ] Add paper manually works
✓ [ ] Copy citation works
✓ [ ] Landscape mode works
✓ [ ] No horizontal scrolling on body
```

---

## 🔍 Quick Status Check

**Check if GitHub Pages is already enabled:**

1. Go to: `https://github.com/obsvera/Research-Paper-Tracker-main/settings/pages`

2. Look for:
   - ✅ **"Your site is live at..."** → Already deployed!
   - ⚠️ **"GitHub Pages is currently disabled"** → Need to enable

---

## 🐛 Troubleshooting

### Issue: "404 Not Found"

**Possible causes:**
1. **Pages not enabled yet** → Check Settings → Pages
2. **Wrong branch selected** → Make sure you selected the right branch
3. **Deployment still in progress** → Wait 5 minutes, then refresh

**Check deployment status:**
1. Go to **Actions** tab on GitHub
2. Look for "pages build and deployment" workflow
3. Wait until it shows green checkmark ✓

---

### Issue: "Changes not showing"

**Solution:**
```bash
# Make sure your latest commit is pushed
git push origin claude/review-current-issues-011CUnGoeSAt9BPdeBYsf7JV

# Then wait 2-3 minutes for GitHub to rebuild
# Hard refresh browser: Ctrl+F5 (Windows/Linux) or Cmd+Shift+R (Mac)
```

---

### Issue: "JavaScript/CSS not loading"

**Check these:**
1. In `index.html`, make sure paths are relative:
   ```html
   ✓ <link rel="stylesheet" href="styles.css">
   ✓ <script src="script.js"></script>

   ✗ <link rel="stylesheet" href="/styles.css">  (don't use leading slash)
   ```

2. Check browser console (F12) for 404 errors

---

## 📊 Deployment Timeline

```
Step 1: Push to GitHub              [Done ✓]
   ↓
Step 2: Configure Pages Settings    [~1 minute]
   ↓
Step 3: GitHub builds site          [~2-3 minutes]
   ↓
Step 4: Site goes live              [Ready to test!]
   ↓
Step 5: Test on devices             [Your turn]
```

**Total time:** About 5 minutes from settings to live site

---

## 🎯 Recommended Testing Flow

**Once live on GitHub Pages:**

1. **Quick Desktop Test** (2 min)
   - Open URL in Chrome
   - Import test-sample.bib
   - Check it works

2. **Mobile DevTools Test** (2 min)
   - Press F12 → Ctrl+Shift+M
   - Test iPhone SE (375px)
   - Test iPad (768px)

3. **Real Device Test** (5 min)
   - Open on your actual phone
   - Test all interactions
   - Check portrait + landscape

4. **Share for Testing**
   - Send URL to friends/colleagues
   - Get feedback on different devices

---

## 📱 QR Code for Mobile Testing

Once deployed, you can:

1. Generate QR code for your URL:
   ```
   https://obsvera.github.io/Research-Paper-Tracker-main/
   ```

2. Use a QR code generator:
   - https://qr-code-generator.com/
   - Or command line: `qrencode -o qrcode.png "URL"`

3. Scan with phone → Instant mobile testing!

---

## ✅ Verification Steps

After deployment, verify:

```bash
# Check your commits are live
# Visit: https://github.com/obsvera/Research-Paper-Tracker-main
# Click on "commits" - should see your 3 commits:
✓ Add comprehensive testing guide and quick-test page
✓ Implement comprehensive mobile responsiveness
✓ Fix critical BibTeX import bugs and memory leaks
```

Then test:
```bash
# Open live site
✓ https://obsvera.github.io/Research-Paper-Tracker-main/

# Test features
✓ Import BibTeX works
✓ Mobile view works
✓ No console errors
```

---

## 🎉 Next Steps

Once deployed and tested:

1. **Share the URL** with stakeholders
2. **Test on multiple devices** (friends' phones, tablets)
3. **Collect feedback** on mobile usability
4. **Monitor usage** (optional: add Google Analytics)
5. **Plan next improvements** (accessibility, performance)

---

## 🆘 Need Help?

If you run into issues:

1. **Check Actions tab:** See if deployment failed
2. **Check Settings → Pages:** Confirm correct branch selected
3. **Check browser console:** Look for JavaScript/CSS 404 errors
4. **Try incognito mode:** Bypass any caching issues
5. **Ask me!** I can help debug specific issues

---

**Ready to deploy?** Follow Option 1 or Option 2 above, then test away! 🚀
