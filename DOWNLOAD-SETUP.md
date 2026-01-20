# Download Link Configuration

## Current Setup

The download button is currently configured to point to:
```
https://github.com/yourusername/fl-studio-organizer/releases/latest
```

## How to Update

### Option 1: GitHub Releases (Recommended)
1. Create a GitHub repository for your app
2. Build your Windows installer
3. Create a release with the installer file
4. Update the link in `index.html` line 230 with your actual GitHub username/repo:
```html
<a href="https://github.com/YOUR-USERNAME/fl-studio-organizer/releases/latest" class="btn btn-primary btn-large">
```

### Option 2: Direct Download Link
If hosting the file elsewhere (Dropbox, Google Drive, your own server):
```html
<a href="https://your-server.com/FL-Studio-Organizer-v0.1.0-Setup.exe" class="btn btn-primary btn-large">
```

### Option 3: Temporary - Coming Soon
If the app isn't ready yet:
```html
<a href="#" class="btn btn-primary btn-large" onclick="alert('Coming soon! Join our Discord for updates.'); return false;">
```

## Building the Windows Installer

From your FL Studio Organizer app directory:
```bash
cd /home/cnstexultant/fl-studio-organizer
npm install
npm run build:win
```

This will create an installer in `dist/` directory.

## Current Status

✅ All emojis replaced with Font Awesome icons
✅ Download button ready for your GitHub releases URL
✅ Website fully responsive
✅ Docker container running on port 5050

## Next Steps

1. Set up a GitHub repository
2. Build your Windows installer
3. Create a release on GitHub
4. Update the download link in index.html
5. Rebuild Docker container
