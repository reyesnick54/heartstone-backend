<#ftl output_format="plainText">
<#assign hsTenant=(properties.hsTenantName!'')?trim>
<#if !hsTenant?has_content><#assign hsTenant=realmName!'HeartStone'></#if>
<#if (properties.hsDevBanner!'true')?trim?lower_case == "true">
${msg("hsDevBannerTitle")}: ${msg("hsDevBannerBody")}

</#if>
${msg("hsPasswordResetIntro", hsTenant)}

${msg("hsPasswordResetAction")}:
${link}

${msg("hsEmailLinkExpiry", linkExpirationFormatter(linkExpiration))}

${msg("hsPasswordResetIgnore")}

--
${msg("hsEmailFooter", hsTenant)}
