export type LegalConfig = {
  entityName: string;
  address: string;
  email: string;
  registration: string;
  vatNumber: string;
};

function read(name: string) {
  return process.env[name]?.trim() ?? "";
}

export function getLegalConfig(): LegalConfig {
  return {
    entityName: read("NEXT_PUBLIC_LEGAL_ENTITY_NAME"),
    address: read("NEXT_PUBLIC_LEGAL_ADDRESS"),
    email: read("NEXT_PUBLIC_LEGAL_EMAIL"),
    registration: read("NEXT_PUBLIC_LEGAL_REGISTRATION"),
    vatNumber: read("NEXT_PUBLIC_LEGAL_VAT_NUMBER"),
  };
}

export function getMissingLegalFields(config = getLegalConfig()) {
  return (Object.entries(config) as Array<[keyof LegalConfig, string]>)
    .filter(([, value]) => !value)
    .map(([key]) => key);
}

export function isLegalLaunchReady(config = getLegalConfig()) {
  return getMissingLegalFields(config).length === 0;
}
