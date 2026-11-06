<#import "template.ftl" as layout>
<@layout.emailLayout>
<p style="margin:0 0 16px;">${msg("hsEmailVerificationIntro", layout.hsTenant)}</p>
<@layout.actionButton href=link label=msg("hsEmailVerificationAction")/>
<p style="margin:0 0 16px;">${msg("hsEmailLinkExpiry", linkExpirationFormatter(linkExpiration))}</p>
<p style="margin:0 0 16px;">${msg("hsEmailVerificationBasic")}</p>
<p style="margin:0;">${msg("hsEmailVerificationIgnore")}</p>
</@layout.emailLayout>
