param(
    [string]$App = "all"  # all | api | admin | driver | storefront
)

$WRANGLER = "node node_modules\wrangler\bin\wrangler.js"
$ErrorActionPreference = "Stop"

function Deploy-API {
    Write-Host "`n[API] Deploying worker..." -ForegroundColor Cyan
    Invoke-Expression "$WRANGLER deploy --config apps\api\wrangler.toml"
    Write-Host "[API] Done" -ForegroundColor Green
}

function Deploy-Admin {
    Write-Host "`n[Admin] Building..." -ForegroundColor Cyan
    pnpm --filter "@butcher/admin" run build
    Write-Host "[Admin] Deploying to Cloudflare Pages..." -ForegroundColor Cyan
    Invoke-Expression "$WRANGLER pages deploy apps\admin\dist --project-name butcher-admin --branch main"
    Write-Host "[Admin] Done" -ForegroundColor Green
}

function Deploy-Driver {
    Write-Host "`n[Driver] Building..." -ForegroundColor Cyan
    pnpm --filter "@butcher/driver" run build
    Write-Host "[Driver] Deploying to Cloudflare Pages..." -ForegroundColor Cyan
    Invoke-Expression "$WRANGLER pages deploy apps\driver\dist --project-name butcher-driver --branch main"
    Write-Host "[Driver] Done" -ForegroundColor Green
}

function Deploy-Storefront {
    Write-Host "`n[Storefront] Running next build..." -ForegroundColor Cyan
    pnpm --filter "@butcher/storefront" run build
    Write-Host "[Storefront] Running next-on-pages..." -ForegroundColor Cyan
    pnpm --filter "@butcher/storefront" run build:cf
    Write-Host "[Storefront] Deploying to Cloudflare Pages..." -ForegroundColor Cyan
    Invoke-Expression "$WRANGLER pages deploy apps\storefront\.vercel\output\static --project-name butcher-storefront --branch main"
    Write-Host "[Storefront] Done" -ForegroundColor Green
}

switch ($App.ToLower()) {
    "api"        { Deploy-API }
    "admin"      { Deploy-Admin }
    "driver"     { Deploy-Driver }
    "storefront" { Deploy-Storefront }
    "all" {
        Deploy-API
        Deploy-Admin
        Deploy-Driver
        Deploy-Storefront
        Write-Host "`nAll apps deployed!" -ForegroundColor Green
    }
    default {
        Write-Host "Usage: .\deploy.ps1 [-App all|api|admin|driver|storefront]" -ForegroundColor Yellow
    }
}
