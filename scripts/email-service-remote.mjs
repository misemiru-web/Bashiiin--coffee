// Pure identity validation only. No IPC, transport factory, grant, binding or execution entrypoint.
export function verifyIdentity(identity, account) {
  if (typeof account !== 'string' || !/^[0-9a-f]{32}$/.test(account)
    || identity?.loggedIn !== true || !Array.isArray(identity.accounts)
    || !identity.accounts.some(item => item?.id === account)) throw Error('ACCOUNT_REJECTED');
}
