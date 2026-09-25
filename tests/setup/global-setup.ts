import { chromium, FullConfig } from '@playwright/test';
import { request } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const user = process.env.USERNAME!;
  const password = process.env.PASSWORD!;
  const { baseURL, storageState } = config.projects[0].use;
  const apiContext = await request.newContext({
    baseURL,
    ignoreHTTPSErrors: true,
  });
  const loginResponse = await apiContext.post('/Account/v1/Login', {
    data: { userName: user, password },
  });
  if (!loginResponse.ok()) {
    throw new Error(`API login failed: ${loginResponse.status()} ${await loginResponse.text()}`);
  }

  const { token, userId, username, expires } = await loginResponse.json();
  const browser = await chromium.launch();
  const context = await browser.newContext();
  await context.addInitScript(({ token, userId, username, expires }) => {
    localStorage.setItem('token', token);
    localStorage.setItem('userID', userId);
    localStorage.setItem('userName', username);
    localStorage.setItem('expires', expires);
  }, { token, userId, username, expires });

  await context.storageState({ path: storageState as string });
  await apiContext.dispose();
  await browser.close();
}

export default globalSetup;

// https://playwright.dev/docs/test-global-setup-teardown#capturing-trace-of-failures-during-global-setup
// https://playwright.dev/docs/trace-viewer
