<#--
  HeartStone HTML email layout. Simple single-column table with inline styles, because many
  email clients ignore stylesheets. Text stays readable when images and colours are blocked.
-->
<#macro emailLayout>
<#assign hsTenant=(properties.hsTenantName!'')?trim>
<#if !hsTenant?has_content><#assign hsTenant=realmName!'HeartStone'></#if>
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${hsTenant}</title>
</head>
<body style="margin:0;padding:0;background:#F7F3EA;color:#17191B;font-family:Arial,Helvetica,sans-serif;font-size:16px;line-height:1.5;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#F7F3EA;">
  <tr>
    <td align="center" style="padding:24px 12px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;background:#FFFFFF;border:1px solid #D9D0BF;">
        <tr>
          <td style="background:#091B29;border-bottom:3px solid #DC9E48;padding:20px 24px;color:#F7F3EA;font-family:Georgia,'Times New Roman',serif;font-size:22px;font-weight:bold;letter-spacing:0.02em;">
            ${hsTenant}
          </td>
        </tr>
        <#if (properties.hsDevBanner!'true')?trim?lower_case == "true">
        <tr>
          <td style="background:#FFF1C2;border-bottom:2px solid #8A5A00;padding:10px 24px;color:#3B2A00;font-size:14px;">
            <strong>${msg("hsDevBannerTitle")}:</strong> ${msg("hsDevBannerBody")}
          </td>
        </tr>
        </#if>
        <tr>
          <td style="padding:24px;color:#17191B;font-size:16px;line-height:1.5;">
            <#nested>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 24px;border-top:1px solid #D9D0BF;color:#3E4650;font-size:13px;line-height:1.5;">
            ${msg("hsEmailFooter", hsTenant)}
          </td>
        </tr>
      </table>
    </td>
  </tr>
</table>
</body>
</html>
</#macro>

<#-- A large, high-contrast link styled as a button, with the raw link repeated below it. -->
<#macro actionButton href label>
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 16px;">
  <tr>
    <td style="background:#091B29;border-radius:6px;">
      <a href="${href}" style="display:inline-block;padding:12px 20px;color:#F7F3EA;font-weight:bold;font-size:16px;text-decoration:none;">${label}</a>
    </td>
  </tr>
</table>
<p style="margin:0 0 16px;font-size:14px;color:#3E4650;">${msg("hsEmailLinkFallback")}<br><a href="${href}" style="color:#153146;word-break:break-all;">${href}</a></p>
</#macro>
