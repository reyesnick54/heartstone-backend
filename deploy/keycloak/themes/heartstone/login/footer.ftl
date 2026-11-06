<#-- HeartStone login footer: who runs this sign-in service and a short safety reminder. -->
<#macro content>
<#assign hsFooterTenant=(properties.hsTenantName!'')?trim>
<#if !hsFooterTenant?has_content><#assign hsFooterTenant=(realm.displayName!'HeartStone')></#if>
<footer class="hs-footer">
  <p>${msg("hsFooterService", hsFooterTenant)}</p>
  <p>${msg("hsFooterSafety")}</p>
</footer>
</#macro>
