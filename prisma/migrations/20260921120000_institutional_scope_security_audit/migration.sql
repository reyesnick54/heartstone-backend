-- Institutional scope enforcement: structured security audit for denied IDOR/scope attempts
ALTER TYPE "SecurityAuditEventType" ADD VALUE 'SCOPE_ACCESS_DENIED';
