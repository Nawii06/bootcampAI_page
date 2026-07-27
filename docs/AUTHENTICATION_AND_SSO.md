# Authentication and SSO

## Current preview

`FD_Set_01` provides a development-only fake SSO adapter. It lists synthetic
identities, creates a process-local signed HttpOnly cookie, returns the shared
session response, and deletes the cookie on logout. It is not an operational
authentication mechanism.

## University integration

Status: `BLOCKED_EXTERNAL`.

The university must provide whether OIDC or SAML is used and, as applicable,
the issuer, authorization/token/userinfo/JWKS/logout endpoints, client ID,
client secret, redirect/logout URIs, scopes, student/staff identifiers, name,
email, department and user-type claims, role mapping, first-login provisioning,
and graduation/withdrawal/retirement deactivation policies.

The future adapter must preserve the common session contract used by the
portal. No real endpoint or credential is stored in this repository.
