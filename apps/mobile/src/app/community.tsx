import { communityRules } from '@eparadar/legal';

import { LegalDocumentView } from '@/components/legal-document';

export default function CommunityScreen() {
  return <LegalDocumentView doc={communityRules} />;
}
