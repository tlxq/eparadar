import { termsOfUse } from '@eparadar/legal';

import { LegalDocumentView } from '@/components/legal-document';

export default function TermsScreen() {
  return <LegalDocumentView doc={termsOfUse} />;
}
