<#import "template.ftl" as layout>
<@layout.emailLayout>
<p style="margin:0 0 16px;">${msg("hsPasswordResetIntro", layout.hsTenant)}</p>
<@layout.actionButton href=link label=msg("hsPasswordResetAction")/>
<p style="margin:0 0 16px;">${msg("hsEmailLinkExpiry", linkExpirationFormatter(linkExpiration))}</p>
<p style="margin:0;">${msg("hsPasswordResetIgnore")}</p>
</@layout.emailLayout>
