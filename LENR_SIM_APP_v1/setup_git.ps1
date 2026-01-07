# Setup Git Repository and Push to GitHub
Write-Host "Setting up Git Repository and pushing to GitHub..." -ForegroundColor Cyan

# Remove the existing origin if it exists
Write-Host "Removing existing origin (if any)..." -ForegroundColor Yellow
git remote remove origin

# Add the new origin
Write-Host "Adding new origin..." -ForegroundColor Yellow
git remote add origin https://github.com/ConsciousEnergy/lenr_sim_app.git

# Verify remote configuration
Write-Host "Verifying remote configuration..." -ForegroundColor Yellow
git remote -v

# Push to the remote repository
Write-Host "Pushing to GitHub..." -ForegroundColor Green
git push -u origin master

Write-Host "Setup complete!" -ForegroundColor Cyan 