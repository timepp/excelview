if (!(Get-Command deno -ErrorAction SilentlyContinue)) {
    Write-Output "Deno is not installed. Installing Deno..."
    Invoke-RestMethod https://deno.land/install.ps1 | Invoke-Expression
}
deno run -A jsr:@timepp/ev
