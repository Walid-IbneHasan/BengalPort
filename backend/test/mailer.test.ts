import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { createMailer, smtpOptions } from "../src/lib/email.js";

const gmail = { SMTP_HOST: "smtp.gmail.com", SMTP_USER: "team@example.test" };
const oauth = {
  SMTP_OAUTH_CLIENT_ID: "client-id.apps.googleusercontent.com",
  SMTP_OAUTH_CLIENT_SECRET: "client-secret",
  SMTP_OAUTH_REFRESH_TOKEN: "refresh-token",
};

describe("which settings switch email delivery on", () => {
  test("nothing is sent without SMTP settings", () => {
    assert.equal(createMailer({}).configured, false);
  });

  test("a host, user and password are enough (Gmail app password)", () => {
    assert.equal(createMailer({ ...gmail, SMTP_PASS: "abcd efgh ijkl mnop" }).configured, true);
  });

  test("Google OAuth keys work in place of a password", () => {
    assert.equal(createMailer({ ...gmail, ...oauth }).configured, true);
  });

  test("a partial set of OAuth keys is not enough", () => {
    assert.equal(createMailer({ ...gmail, SMTP_OAUTH_CLIENT_ID: "client-id" }).configured, false);
  });
});

describe("how the mail server connection is set up", () => {
  test("a password login uses the user and password", () => {
    assert.deepEqual(smtpOptions({ ...gmail, SMTP_PASS: "secret", SMTP_PORT: "587" }), {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user: "team@example.test", pass: "secret" },
    });
  });

  test("OAuth keys are passed as an OAuth2 login", () => {
    assert.deepEqual(smtpOptions({ ...gmail, ...oauth, SMTP_PORT: "465" })?.auth, {
      type: "OAuth2",
      user: "team@example.test",
      clientId: oauth.SMTP_OAUTH_CLIENT_ID,
      clientSecret: oauth.SMTP_OAUTH_CLIENT_SECRET,
      refreshToken: oauth.SMTP_OAUTH_REFRESH_TOKEN,
    });
  });

  test("port 465 connects securely without needing SMTP_SECURE", () => {
    assert.equal(smtpOptions({ ...gmail, SMTP_PASS: "secret", SMTP_PORT: "465" })?.secure, true);
  });

  test("SMTP_SECURE can still force a secure connection on another port", () => {
    assert.equal(smtpOptions({ ...gmail, SMTP_PASS: "secret", SMTP_PORT: "2465", SMTP_SECURE: "true" })?.secure, true);
  });
});
