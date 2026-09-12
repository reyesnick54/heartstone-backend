export interface DocumentRecordBody {
  id: string;
}

export interface DocumentVersionBody {
  id: string;
  sha256: string;
}

export function asDocumentRecordBody(body: unknown): DocumentRecordBody {
  const record = body as DocumentRecordBody;
  return { id: record.id };
}

export function asDocumentVersionBody(body: unknown): DocumentVersionBody {
  const version = body as DocumentVersionBody;
  return { id: version.id, sha256: version.sha256 };
}
