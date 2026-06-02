export class NangoConfigurationError extends Error {
  status = 503;

  constructor(message = "Nango is not configured.") {
    super(message);
    this.name = "NangoConfigurationError";
  }
}

export class NangoProviderConfigurationError extends Error {
  status = 503;

  constructor(message = "Nango provider mapping is not configured.") {
    super(message);
    this.name = "NangoProviderConfigurationError";
  }
}
