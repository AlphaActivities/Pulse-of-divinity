export function notificationTransport(token: () => string | undefined) {
  async function request(path: string, data?: object) {
    const access = token();
    if (!access) throw Error('Sign in again.');
    const response = await fetch('/api/notifications/' + path, {
      method: data ? 'POST' : 'GET', headers: {Authorization:'Bearer '+access,'Content-Type':'application/json'},
      ...(data ? {body:JSON.stringify(data)} : {}), cache:'no-store',
    });
    const result = await response.json();
    if (!response.ok) throw Error(result.error || 'Notification request failed.');
    return result;
  }
  return {settings: () => request('settings'), change: request};
}
