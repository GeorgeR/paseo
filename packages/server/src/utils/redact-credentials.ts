// Credentials embedded in remote URLs (`https://token@host/...`, `https://user:password@host/...`)
// must not reach clients, logs, or error messages. HTTP userinfo is dropped whole because hosts
// accept a token as the user name; other schemes keep the user name (`ssh://git@host`) and drop
// only a password.
const HTTP_USERINFO = /\b(https?:\/\/)[^\s/?#@'"`]+@/gi;
const URL_PASSWORD = /\b([a-z][a-z0-9+.-]*:\/\/[^\s/?#@:'"`]+):[^\s/?#@'"`]+@/gi;

/** Removes credentials from every URL in `text`. Text without URL credentials is unchanged. */
export function redactUrlCredentials(text: string): string {
  return text.replace(HTTP_USERINFO, "$1").replace(URL_PASSWORD, "$1@");
}
