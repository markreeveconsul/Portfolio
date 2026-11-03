export type Certificate = {
  title: string;
  issuer: string;
  date: string;
  image: string;
  imageAlt: string;
};

// Add verified certificate details and replacement images here.
export const certificates: Certificate[] = [];
