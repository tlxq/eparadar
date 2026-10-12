import { privacyPolicy } from '@eparadar/legal';

import { LegalDocumentView } from '@/components/legal-document';

export default function PrivacyScreen() {
  return <LegalDocumentView doc={privacyPolicy} />;
}
