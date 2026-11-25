// Production (IIS /gba) build: used by `npm run build:deploy` (angular.json "deploy" fileReplacements).
// CAPTCHA is required by the API outside development. The site key is public by design and must be
// registered in the Google reCAPTCHA console for the production domain; the matching secret is set
// on the API server only (ReCaptcha__SecretKey), never here.
export const environment = {
  production: true,
  recaptchaSiteKey: '6LeGfJssAAAAAM402yuBwyz8twIydBEnRjt62hxT',
  captchaEnabled: true,
  captchaToken: '',
};
