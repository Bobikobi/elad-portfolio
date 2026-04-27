# Cloudflare DNS Setup for Vercel
# Usage: .\scripts\setup-dns.ps1 -ZoneId "YOUR_ZONE_ID" -ApiToken "YOUR_API_TOKEN"
#
# Zone ID: Cloudflare Dashboard -> eladsaadon.dev -> Overview -> right sidebar
# API Token: Cloudflare Dashboard -> My Profile -> API Tokens -> Create Token -> "Edit zone DNS" template

param(
    [Parameter(Mandatory=$true)]
    [string]$ZoneId,

    [Parameter(Mandatory=$true)]
    [string]$ApiToken
)

$headers = @{
    "Authorization" = "Bearer $ApiToken"
    "Content-Type"  = "application/json"
}

$baseUrl = "https://api.cloudflare.com/client/v4/zones/$ZoneId/dns_records"

function Get-ExistingRecord {
    param([string]$Type, [string]$Name)
    $res = Invoke-RestMethod -Uri "$baseUrl`?type=$Type&name=$Name" -Headers $headers -Method Get
    return $res.result | Select-Object -First 1
}

function Upsert-DnsRecord {
    param([string]$Type, [string]$Name, [string]$Content, [bool]$Proxied = $false)

    $body = @{
        type    = $Type
        name    = $Name
        content = $Content
        proxied = $Proxied
        ttl     = 1  # Auto TTL
    } | ConvertTo-Json

    $existing = Get-ExistingRecord -Type $Type -Name $Name

    if ($existing) {
        Write-Host "Updating $Type $Name -> $Content"
        Invoke-RestMethod -Uri "$baseUrl/$($existing.id)" -Headers $headers -Method Put -Body $body | Out-Null
    } else {
        Write-Host "Creating $Type $Name -> $Content"
        Invoke-RestMethod -Uri $baseUrl -Headers $headers -Method Post -Body $body | Out-Null
    }
}

Write-Host "`nConfiguring DNS for eladsaadon.dev..." -ForegroundColor Cyan

# A record for root domain (@)
Upsert-DnsRecord -Type "A" -Name "eladsaadon.dev" -Content "76.76.21.21" -Proxied $false

# CNAME for www
Upsert-DnsRecord -Type "CNAME" -Name "www.eladsaadon.dev" -Content "cname.vercel-dns.com" -Proxied $false

Write-Host "`nDone! DNS records configured:" -ForegroundColor Green
Write-Host "  A     eladsaadon.dev     -> 76.76.21.21"
Write-Host "  CNAME www.eladsaadon.dev -> cname.vercel-dns.com"
Write-Host "`nNote: DNS propagation may take a few minutes."
Write-Host "Verify at: https://vercel.com/dashboard -> your project -> Domains"
