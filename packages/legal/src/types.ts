export type LegalBlock = string | string[];

export type LegalSection = {
  heading: string;
  blocks: LegalBlock[];
};

export type LegalDocument = {
  title: string;
  updated: string;
  intro: LegalBlock[];
  sections: LegalSection[];
};

export const CONTACT_EMAIL = 'contact@eparadar.se';
export const MINIMUM_AGE = 15;
